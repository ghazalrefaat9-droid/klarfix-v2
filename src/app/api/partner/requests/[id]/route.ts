import { after, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseServer'
import { requirePartner } from '@/lib/session'
import { readJson } from '@/lib/partnerAdmin'
import { createSetupToken } from '@/lib/partnerSetup'
import { sendOfferEmail } from '@/lib/offerMail'
import { OPEN_STATUSES, REQUEST_COLUMNS, inPartnerRegion, parseOffer, requestLocation, toPartnerView, type RequestRow } from '@/lib/requests'
import { siteUrl } from '@/lib/siteUrl'

const isUuid = (v: string) => /^[0-9a-f-]{36}$/i.test(v)

async function verifiedPartner() {
  const session = await requirePartner()
  if ('response' in session) return session
  if (!session.partner.verified || session.partner.is_blocked) {
    return { response: NextResponse.json({ error: 'Kein Zugriff.' }, { status: 403 }) }
  }
  return session
}

// Single request (filtered view). Own jobs are always allowed; open requests only inside the partner's region,
// everything else is 403 – so a partner can't open a foreign request by guessing its id.
export async function GET(_request: Request, ctx: RouteContext<'/api/partner/requests/[id]'>) {
  const session = await verifiedPartner()
  if ('response' in session) return session.response
  const { partner } = session

  const { id } = await ctx.params
  if (!isUuid(id)) return NextResponse.json({ error: 'Anfrage nicht gefunden.' }, { status: 404 })

  const { data } = await supabase.from('requests').select(REQUEST_COLUMNS).eq('id', id).is('deleted_at', null).maybeSingle()
  const row = data as RequestRow | null
  if (!row) return NextResponse.json({ error: 'Anfrage nicht gefunden.' }, { status: 404 })

  const isMine = row.partner_id === partner.id
  const openForPartner =
    !row.partner_id &&
    OPEN_STATUSES.includes(row.status) &&
    !(row.rejected_partner_ids ?? []).includes(partner.id) &&
    inPartnerRegion(partner, requestLocation(row))
  if (!isMine && !openForPartner) return NextResponse.json({ error: 'Kein Zugriff auf diese Anfrage.' }, { status: 403 })

  return NextResponse.json({ request: toPartnerView(row, partner.id) })
}

// Send an offer (price + description) for an open request. The customer gets an email with a one-time link.
export async function POST(request: Request, ctx: RouteContext<'/api/partner/requests/[id]'>) {
  const session = await verifiedPartner()
  if ('response' in session) return session.response
  const { partner } = session

  const { id } = await ctx.params
  if (!isUuid(id)) return NextResponse.json({ error: 'Anfrage nicht gefunden.' }, { status: 404 })

  const offer = parseOffer(await readJson<{ price: unknown; message: unknown }>(request))
  if (!offer) return NextResponse.json({ error: 'Bitte einen gültigen Preis angeben.' }, { status: 400 })

  const { data: row } = await supabase
    .from('requests')
    .select('id, status, partner_id, rejected_partner_ids, customer_email, customer_name, service_type, deleted_at, postcode, city, customer_address, message')
    .eq('id', id)
    .maybeSingle()
  if (row && !inPartnerRegion(partner, requestLocation(row))) {
    return NextResponse.json({ error: 'Diese Anfrage liegt nicht in Ihrer Region.' }, { status: 403 })
  }
  const rejected = (row?.rejected_partner_ids as string[] | null) ?? []
  if (!row || row.deleted_at || row.partner_id || !OPEN_STATUSES.includes(row.status) || rejected.includes(partner.id)) {
    return NextResponse.json({ error: 'Diese Anfrage ist nicht mehr verfügbar.' }, { status: 409 })
  }

  const { token, hash } = createSetupToken()
  // Conditional update: only succeeds if no other partner sent an offer in the meantime.
  const { data: updated, error } = await supabase
    .from('requests')
    .update({
      status: 'offer_sent',
      partner_id: partner.id,
      partner_price: offer.price,
      partner_message: offer.message,
      offer_token_hash: hash,
      offer_sent_at: new Date().toISOString(),
      offer_responded_at: null,
    })
    .eq('id', id)
    .eq('status', row.status)
    .is('partner_id', null)
    .select('id')
  if (error || !updated?.length) {
    if (error) console.error('Offer update failed:', error.message)
    return NextResponse.json({ error: 'Diese Anfrage ist nicht mehr verfügbar.' }, { status: 409 })
  }

  // Fixed base URL: the partner sends this request, so its Host header must not decide where the customer's token goes.
  const offerUrl = `${siteUrl()}/angebot/${token}`
  after(() =>
    sendOfferEmail({
      to: row.customer_email,
      customerName: row.customer_name,
      service: row.service_type,
      price: offer.price,
      message: offer.message,
      offerUrl,
    }).catch((err) => console.error('Offer email failed', err)),
  )
  return NextResponse.json({ ok: true })
}

// Mark an accepted job as done.
export async function PATCH(request: Request, ctx: RouteContext<'/api/partner/requests/[id]'>) {
  const session = await verifiedPartner()
  if ('response' in session) return session.response

  const { id } = await ctx.params
  if (!isUuid(id)) return NextResponse.json({ error: 'Anfrage nicht gefunden.' }, { status: 404 })
  const body = await readJson<{ action: unknown }>(request)
  if (body.action !== 'done') return NextResponse.json({ error: 'Ungültige Aktion.' }, { status: 400 })

  const { data, error } = await supabase
    .from('requests')
    .update({ status: 'done' })
    .eq('id', id)
    .eq('partner_id', session.partner.id)
    .in('status', ['offer_accepted', 'assigned'])
    .select('id')
  if (error || !data?.length) {
    return NextResponse.json({ error: 'Status konnte nicht geändert werden.' }, { status: 409 })
  }
  return NextResponse.json({ ok: true })
}
