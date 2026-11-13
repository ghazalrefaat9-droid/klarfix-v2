import { supabase } from '@/lib/supabaseServer'

// Server-only helpers for the partner_offers table (see supabase/migrations/partner_offers.sql).
// Flow: partner -> admin -> customer. Partners only ever see their own offer; the customer only the one the admin sent.

export type PendingOffer = { price: number; message: string | null; created_at: string }

export type AdminOffer = {
  id: string
  partner_id: string
  company_name: string | null
  price: number
  message: string | null
  status: 'pending' | 'sent' | 'rejected'
  created_at: string
}

type OfferRow = { request_id: string; price: number | string; message: string | null; created_at: string }

const toPending = (r: OfferRow): PendingOffer => ({ price: Number(r.price), message: r.message, created_at: r.created_at })

export async function loadPendingOffer(requestId: string, partnerId: string): Promise<PendingOffer | null> {
  const { data, error } = await supabase
    .from('partner_offers')
    .select('request_id, price, message, created_at')
    .eq('request_id', requestId)
    .eq('partner_id', partnerId)
    .eq('status', 'pending')
    .maybeSingle()
  if (error) return null
  return data ? toPending(data as OfferRow) : null
}

// request_id -> this partner's offer that still waits for the admin.
export async function loadPendingOffersForPartner(partnerId: string): Promise<Map<string, PendingOffer>> {
  const { data, error } = await supabase
    .from('partner_offers')
    .select('request_id, price, message, created_at')
    .eq('partner_id', partnerId)
    .eq('status', 'pending')
  if (error) {
    // Table missing (migration not run yet) must not break the partner dashboard.
    console.error('Partner offers load failed:', error.message)
    return new Map()
  }
  return new Map(((data as OfferRow[]) ?? []).map((r) => [r.request_id, toPending(r)]))
}

// Request ids this partner already sent an offer for (any status), so they don't show up as "new" again.
export async function offeredRequestIds(partnerId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from('partner_offers').select('request_id').eq('partner_id', partnerId)
  if (error) return new Set()
  return new Set(((data as { request_id: string }[]) ?? []).map((r) => r.request_id))
}

// request_id -> number of offers waiting for the admin.
export async function pendingOfferCounts(requestIds: string[]): Promise<Record<string, number>> {
  if (requestIds.length === 0) return {}
  const { data, error } = await supabase
    .from('partner_offers')
    .select('request_id')
    .in('request_id', requestIds)
    .eq('status', 'pending')
  if (error) return {}
  const counts: Record<string, number> = {}
  for (const r of (data as { request_id: string }[]) ?? []) counts[r.request_id] = (counts[r.request_id] ?? 0) + 1
  return counts
}

export async function loadOffersForAdmin(requestId: string): Promise<AdminOffer[]> {
  const { data, error } = await supabase
    .from('partner_offers')
    .select('id, partner_id, price, message, status, created_at, partners(company_name)')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  type Row = Omit<AdminOffer, 'company_name' | 'price'> & {
    price: number | string
    partners: { company_name: string | null } | { company_name: string | null }[] | null
  }
  return ((data as unknown as Row[]) ?? []).map((r) => {
    const partner = Array.isArray(r.partners) ? r.partners[0] : r.partners
    return {
      id: r.id,
      partner_id: r.partner_id,
      company_name: partner?.company_name ?? null,
      price: Number(r.price),
      message: r.message,
      status: r.status,
      created_at: r.created_at,
    }
  })
}
