import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseServer'
import { requirePartner } from '@/lib/session'
import { OPEN_STATUSES, PARTNER_OWN_STATUSES, REQUEST_COLUMNS, toPartnerView, type RequestRow } from '@/lib/requests'

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

  return NextResponse.json({
    open: ((openRes.data as RequestRow[]) ?? []).map((r) => toPartnerView(r, partner.id)),
    mine: ((mineRes.data as RequestRow[]) ?? []).map((r) => toPartnerView(r, partner.id)),
  })
}
