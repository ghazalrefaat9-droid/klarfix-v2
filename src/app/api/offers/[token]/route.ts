import { after, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseServer'
import { readJson } from '@/lib/partnerAdmin'
import { hashSetupToken, isWellFormedToken } from '@/lib/partnerSetup'
import { sendDecisionToPartner } from '@/lib/offerMail'
import { cityFromAddress, parseMessage } from '@/lib/requests'
import { siteUrl } from '@/lib/siteUrl'

const INVALID = 'Dieses Angebot ist nicht mehr gültig.'

type OfferRow = {
  id: string
  status: string
  partner_id: string | null
  partner_price: number | null
  partner_message: string | null
  rejected_partner_ids: string[] | null
  service_type: string
  area_sqm: number | null
  postcode: string
  city: string | null
  customer_address: string | null
  message: string | null
  preferred_date: string | null
  preferred_time: string | null
  is_flexible: boolean | null
  deleted_at: string | null
}

async function findOffer(token: string) {
  if (!isWellFormedToken(token)) return null
  const { data } = await supabase
    .from('requests')
    .select(
      'id, status, partner_id, partner_price, partner_message, rejected_partner_ids, service_type, area_sqm, postcode, city, customer_address, message, preferred_date, preferred_time, is_flexible, deleted_at',
    )
    .eq('offer_token_hash', hashSetupToken(token))
    .maybeSingle()
  const row = data as OfferRow | null
  return row && !row.deleted_at && row.partner_id ? row : null
}

async function loadPartner(id: string) {
  const { data } = await supabase
    .from('partners')
    .select('id, company_name, email, verified, experience_years, employee_count, created_at')
    .eq('id', id)
    .maybeSingle()
  return data as
    | { id: string; company_name: string; email: string; verified: boolean; experience_years: number | null; employee_count: string | null; created_at: string }
    | null
}

// Offer page for the customer (/angebot/[token]). Never contains partner contact data;
// the company name is only shown after the customer accepted.
export async function GET(_request: Request, ctx: RouteContext<'/api/offers/[token]'>) {
  const row = await findOffer((await ctx.params).token)
  if (!row || row.partner_price === null) return NextResponse.json({ error: INVALID }, { status: 404 })
  const partner = await loadPartner(row.partner_id as string)
  const parsed = parseMessage(row.message)
  const accepted = row.status === 'offer_accepted' || row.status === 'done'

  return NextResponse.json({
    status: row.status,
    service_type: row.service_type,
    area_sqm: row.area_sqm,
    postcode: row.postcode,
    city: row.city ?? cityFromAddress(row.customer_address ?? parsed.address),
    preferred_date: row.preferred_date ?? parsed.date,
    preferred_time: row.is_flexible ? null : (row.preferred_time ?? parsed.time),
    price: Number(row.partner_price),
    message: row.partner_message,
    partner: {
      verified: partner?.verified === true,
      experience_years: partner?.experience_years ?? null,
      team_size: partner?.employee_count ?? null,
      member_since: partner?.created_at ?? null,
      // There is no rating system yet; the page shows "Noch keine Bewertungen".
      rating: null,
      review_count: 0,
      company_name: accepted ? (partner?.company_name ?? null) : null,
    },
  })
}

// Customer decision: { action: 'accept' | 'reject' }.
export async function POST(request: Request, ctx: RouteContext<'/api/offers/[token]'>) {
  const row = await findOffer((await ctx.params).token)
  if (!row) return NextResponse.json({ error: INVALID }, { status: 404 })
  if (row.status !== 'offer_sent') {
    return NextResponse.json({ error: 'Über dieses Angebot wurde bereits entschieden.' }, { status: 409 })
  }

  const { action } = await readJson<{ action: unknown }>(request)
  if (action !== 'accept' && action !== 'reject') return NextResponse.json({ error: 'Ungültige Aktion.' }, { status: 400 })
  const partnerId = row.partner_id as string
  const now = new Date().toISOString()

  const values =
    action === 'accept'
      ? { status: 'offer_accepted', offer_responded_at: now }
      : {
          // Back to the pool for other partners; this partner won't see the request again.
          status: 'offer_rejected',
          offer_responded_at: now,
          partner_id: null,
          partner_price: null,
          partner_message: null,
          offer_token_hash: null,
          rejected_partner_ids: [...new Set([...(row.rejected_partner_ids ?? []), partnerId])],
        }

  const { data, error } = await supabase
    .from('requests')
    .update(values)
    .eq('id', row.id)
    .eq('status', 'offer_sent')
    .eq('partner_id', partnerId)
    .select('id')
  if (error || !data?.length) {
    if (error) console.error('Offer decision failed:', error.message)
    return NextResponse.json({ error: 'Über dieses Angebot wurde bereits entschieden.' }, { status: 409 })
  }

  const partner = await loadPartner(partnerId)
  if (partner) {
    const dashboardUrl = `${siteUrl()}/partner/dashboard`
    after(() =>
      sendDecisionToPartner({
        to: partner.email,
        companyName: partner.company_name,
        service: row.service_type,
        postcode: row.postcode,
        accepted: action === 'accept',
        dashboardUrl,
      }).catch((err) => console.error('Offer decision email failed', err)),
    )
  }

  return NextResponse.json({ ok: true, status: values.status, company_name: action === 'accept' ? (partner?.company_name ?? null) : null })
}
