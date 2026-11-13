import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseServer'
import { requirePartner } from '@/lib/session'
import { OPEN_STATUSES, PARTNER_OWN_STATUSES, REQUEST_COLUMNS, inPartnerRegion, requestLocation, toPartnerView, type RequestRow } from '@/lib/requests'
import { loadPendingOffersForPartner, offeredRequestIds } from '@/lib/partnerOffers'

// Partner dashboard data. Only filtered views are returned (see toPartnerView): no customer name,
// email, phone or street address unless the customer accepted this partner's offer.
export async function GET() {
  const session = await requirePartner()
  if ('response' in session) return session.response
  const { partner } = session
  if (!partner.verified || partner.is_blocked) {
    return NextResponse.json({ error: 'Kein Zugriff.' }, { status: 403 })
  }

  const [openRes, mineRes] = await Promise.all([
    supabase
      .from('requests')
      .select(REQUEST_COLUMNS)
      .in('status', OPEN_STATUSES)
      .is('deleted_at', null)
      .is('partner_id', null)
      .not('rejected_partner_ids', 'cs', `{${partner.id}}`)
      .order('created_at', { ascending: false }),
    supabase
      .from('requests')
      .select(REQUEST_COLUMNS)
      .eq('partner_id', partner.id)
      .in('status', PARTNER_OWN_STATUSES)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
  ])
  if (openRes.error || mineRes.error) {
    console.error('Partner requests load failed:', openRes.error?.message ?? mineRes.error?.message)
    return NextResponse.json({ error: 'Server-Fehler.' }, { status: 500 })
  }

  // Region filter on the server: only open requests from the partner's city / postcode area are returned.
  const region = { postcode: partner.postcode, city: partner.city }
  const openInRegion = ((openRes.data as RequestRow[]) ?? []).filter((r) => inPartnerRegion(region, requestLocation(r)))
  const [pending, offered] = await Promise.all([loadPendingOffersForPartner(partner.id), offeredRequestIds(partner.id)])

  // Open requests with an own offer waiting for the admin move to "Meine Aufträge" (status offer_pending).
  const waiting = openInRegion.filter((r) => pending.has(r.id))
  const open = openInRegion.filter((r) => !offered.has(r.id))

  return NextResponse.json({
    open: open.map((r) => toPartnerView(r, partner.id)),
    mine: [
      ...waiting.map((r) => toPartnerView(r, partner.id, pending.get(r.id))),
      ...((mineRes.data as RequestRow[]) ?? []).map((r) => toPartnerView(r, partner.id)),
    ],
    region,
  })
}
