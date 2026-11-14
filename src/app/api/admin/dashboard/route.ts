import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseServer'
import { requireAdmin } from '@/lib/session'
import { unreadForAdmin } from '@/lib/messages'
import { pendingOfferCounts } from '@/lib/partnerOffers'

// Data for /admin/dashboard: active requests, selectable partners and badge counters.
export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied

  const [reqRes, partnerRes, trashRes, appRes, blockedRes, partnerTrashRes] = await Promise.all([
    supabase
      .from('requests')
      .select('id, customer_name, customer_email, customer_phone, postcode, service_type, area_sqm, message, status, partner_id, partner_price, partner_message, created_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('partners')
      .select('id, company_name')
      .is('deleted_at', null)
      .eq('is_blocked', false)
      .order('company_name', { ascending: true }),
    supabase.from('requests').select('id', { count: 'exact', head: true }).not('deleted_at', 'is', null),
    supabase.from('partner_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
    // Same filters as /api/admin/partners?view=blocked|trash
    supabase.from('partners').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('is_blocked', true),
    supabase.from('partners').select('id', { count: 'exact', head: true }).not('deleted_at', 'is', null),
  ])

  if (reqRes.error || partnerRes.error) {
    console.error('Dashboard load failed:', reqRes.error?.message ?? partnerRes.error?.message)
    return NextResponse.json({ error: 'Daten konnten nicht geladen werden.' }, { status: 500 })
  }
  // A missing partner_messages table (migration not run yet) must not break the dashboard.
  const unread = await unreadForAdmin().catch(() => ({}) as Record<string, number>)
  const requests = (reqRes.data ?? []) as { id: string }[]
  const offerCounts = await pendingOfferCounts(requests.map((r) => r.id))
  return NextResponse.json({
    requests: requests.map((r) => ({ ...r, pending_offers: offerCounts[r.id] ?? 0 })),
    partners: partnerRes.data ?? [],
    trashCount: trashRes.count ?? 0,
    blockedPartners: blockedRes.count ?? 0,
    partnerTrashCount: partnerTrashRes.count ?? 0,
    newApplications: appRes.count ?? 0,
    unreadMessages: Object.values(unread).reduce((sum, n) => sum + n, 0),
  })
}
