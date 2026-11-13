import { after, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseServer'
import { requireAdmin } from '@/lib/session'
import { jsonError, readJson } from '@/lib/partnerAdmin'
import { createSetupToken } from '@/lib/partnerSetup'
import { sendOfferEmail } from '@/lib/offerMail'
import { OPEN_STATUSES } from '@/lib/requests'
import { loadOffersForAdmin } from '@/lib/partnerOffers'
import { siteUrl } from '@/lib/siteUrl'

const isUuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v)

// All partner offers for one request. Admin only – partners never see each other's offers.
export async function GET(_request: Request, ctx: RouteContext<'/api/admin/requests/[id]/offers'>) {
  const denied = await requireAdmin()
  if (denied) return denied
  const { id } = await ctx.params
  if (!isUuid(id)) return jsonError('Anfrage nicht gefunden.', 404)

  try {
    return NextResponse.json({ offers: await loadOffersForAdmin(id) })
  } catch (err) {
    console.error('Admin offers load failed:', err)
    return jsonError('Angebote konnten nicht geladen werden. Wurde partner_offers.sql ausgeführt?', 500)
  }
}

// Sends exactly ONE selected offer to the customer: { offerId }. Only the admin can do this.
// The customer gets an email from KlarFix (price + message, no partner name) with a one-time link to /angebot/[token].
export async function POST(request: Request, ctx: RouteContext<'/api/admin/requests/[id]/offers'>) {
  const denied = await requireAdmin()
  if (denied) return denied
  const { id } = await ctx.params
  if (!isUuid(id)) return jsonError('Anfrage nicht gefunden.', 404)

  const { offerId } = await readJson<{ offerId: unknown }>(request)
  if (!isUuid(offerId)) return jsonError('Bitte ein Angebot auswählen.', 400)

  const [{ data: row }, { data: offer }] = await Promise.all([
    supabase
      .from('requests')
      .select('id, status, partner_id, rejected_partner_ids, customer_email, customer_name, service_type, deleted_at')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('partner_offers')
      .select('id, request_id, partner_id, price, message, status')
      .eq('id', offerId)
      .maybeSingle(),
  ])
  if (!row || row.deleted_at) return jsonError('Anfrage nicht gefunden.', 404)
  if (!offer || offer.request_id !== id || offer.status !== 'pending') {
    return jsonError('Dieses Angebot ist nicht mehr verfügbar.', 409)
  }
  if (row.partner_id || !OPEN_STATUSES.includes(row.status)) {
    return jsonError('Für diese Anfrage wurde bereits ein Angebot an den Kunden gesendet.', 409)
  }
  if (((row.rejected_partner_ids as string[] | null) ?? []).includes(offer.partner_id)) {
    return jsonError('Der Kunde hat ein Angebot dieses Partners bereits abgelehnt.', 409)
  }

  const price = Number(offer.price)
  const { token, hash } = createSetupToken()
  const now = new Date().toISOString()
  // Conditional update: only one offer can ever be sent for an open request.
  const { data: updated, error } = await supabase
    .from('requests')
    .update({
      status: 'offer_sent',
      partner_id: offer.partner_id,
      partner_price: price,
      partner_message: offer.message,
      offer_token_hash: hash,
      offer_sent_at: now,
      offer_responded_at: null,
    })
    .eq('id', id)
    .eq('status', row.status)
    .is('partner_id', null)
    .select('id')
  if (error || !updated?.length) {
    if (error) console.error('Admin send offer failed:', error.message)
    return jsonError('Für diese Anfrage wurde bereits ein Angebot an den Kunden gesendet.', 409)
  }

  const { error: offerError } = await supabase.from('partner_offers').update({ status: 'sent', sent_at: now }).eq('id', offer.id)
  if (offerError) console.error('Partner offer status update failed:', offerError.message)

  const offerUrl = `${siteUrl()}/angebot/${token}`
  after(() =>
    sendOfferEmail({
      to: row.customer_email,
      customerName: row.customer_name,
      service: row.service_type,
      price,
      message: offer.message,
      offerUrl,
    }).catch((err) => console.error('Offer email failed', err)),
  )
  return NextResponse.json({ ok: true })
}
