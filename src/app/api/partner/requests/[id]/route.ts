import { after, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseServer'
import { requirePartner } from '@/lib/session'
import { readJson } from '@/lib/partnerAdmin'
import { sendPartnerOfferToAdmin } from '@/lib/offerMail'
import { OPEN_STATUSES, REQUEST_COLUMNS, inPartnerRegion, parseOffer, requestLocation, toPartnerView, type RequestRow } from '@/lib/requests'
import { loadPendingOffer } from '@/lib/partnerOffers'
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

  const pending = isMine ? null : await loadPendingOffer(id, partner.id)
  return NextResponse.json({ request: toPartnerView(row, partner.id, pending) })
}

// Send an offer (price + message for the customer). It only goes to the admin: the request itself is not changed
// and the customer is NOT contacted. The admin later forwards exactly one offer to the customer.
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
    .select('id, status, partner_id, rejected_partner_ids, service_type, deleted_at, postcode, city, customer_address, message')
    .eq('id', id)
    .maybeSingle()
  if (row && !inPartnerRegion(partner, requestLocation(row))) {
    return NextResponse.json({ error: 'Diese Anfrage liegt nicht in Ihrer Region.' }, { status: 403 })
  }
  const rejected = (row?.rejected_partner_ids as string[] | null) ?? []
  if (!row || row.deleted_at || row.partner_id || !OPEN_STATUSES.includes(row.status) || rejected.includes(partner.id)) {
    return NextResponse.json({ error: 'Diese Anfrage ist nicht mehr verfügbar.' }, { status: 409 })
  }

  const { error } = await supabase.from('partner_offers').insert({
    request_id: id,
    partner_id: partner.id,
    price: offer.price,
    message: offer.message,
    status: 'pending',
  })
  if (error) {
    // 23505 = unique (request_id, partner_id): this partner already sent an offer.
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Sie haben für diese Anfrage bereits ein Angebot gesendet.' }, { status: 409 })
    }
    console.error('Partner offer insert failed:', error.message)
    return NextResponse.json({ error: 'Angebot konnte nicht gespeichert werden.' }, { status: 500 })
  }

  const adminUrl = `${siteUrl()}/admin/dashboard`
  after(() =>
    sendPartnerOfferToAdmin({
      companyName: partner.company_name,
      service: row.service_type,
      postcode: row.postcode,
      price: offer.price,
      message: offer.message,
      adminUrl,
    }).catch((err) => console.error('Partner offer admin email failed', err)),
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
