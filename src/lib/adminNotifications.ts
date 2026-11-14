import { supabase } from '@/lib/supabaseServer'
import { redactContact } from '@/lib/requests'

// Central admin notifications (bell + chat icon in the admin header).
// Sources: unread partner chat messages, open partner applications, partners waiting for verification,
// new customer requests, new partner offers and customer decisions on offers.
// Chat uses partner_messages.read_at. Everything else is "unread" if it is newer than `since` and its id was not
// opened yet; that state lives in admin_settings (key below), so no extra table is needed.

export type NotificationType = 'chat' | 'partner' | 'request' | 'other'

export type AdminNotification = {
  id: string
  type: NotificationType
  // Machine-readable kind for the client-side text (DE/AR/EN)
  kind: 'chat' | 'application' | 'partner_verify' | 'request' | 'offer' | 'accepted' | 'rejected'
  name: string | null
  service: string | null
  city: string | null
  preview: string | null
  count: number
  createdAt: string
  href: string
  unread: boolean
}

const READ_KEY = 'notifications_read'
const MAX_READ_IDS = 500
const LOOKBACK_DAYS = 30
const PREVIEW_LENGTH = 90

type ReadState = { since: string; ids: string[] }

async function loadReadState(): Promise<ReadState> {
  const { data } = await supabase.from('admin_settings').select('value').eq('key', READ_KEY).maybeSingle()
  try {
    const parsed = JSON.parse((data as { value: string } | null)?.value ?? '') as Partial<ReadState>
    return { since: parsed.since ?? new Date(0).toISOString(), ids: Array.isArray(parsed.ids) ? parsed.ids : [] }
  } catch {
    return { since: new Date(0).toISOString(), ids: [] }
  }
}

async function saveReadState(state: ReadState) {
  const { error } = await supabase
    .from('admin_settings')
    .upsert([{ key: READ_KEY, value: JSON.stringify(state), updated_at: new Date().toISOString() }], { onConflict: 'key' })
  if (error) throw new Error(error.message)
}

const shorten = (text: string | null | undefined) => {
  const clean = redactContact((text ?? '').replace(/\s+/g, ' ').trim())
  return clean.length > PREVIEW_LENGTH ? `${clean.slice(0, PREVIEW_LENGTH)}…` : clean || null
}

// Each source is optional: a missing table (migration not run) must not break the bell.
async function safe<T>(label: string, query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const { data, error } = await query
  if (error) {
    console.error(`Notifications: ${label} failed:`, error.message)
    return [] as T[]
  }
  return data ?? []
}

export async function loadNotifications(limit = 30) {
  const lookback = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString()

  type Msg = { partner_id: string; body: string; created_at: string }
  type App = { id: string; full_name: string | null; city: string | null; created_at: string }
  type Partner = { id: string; company_name: string | null; city: string | null; created_at: string }
  type Req = { id: string; service_type: string; city: string | null; postcode: string | null; created_at: string }
  type Decision = Req & { status: string; offer_responded_at: string }
  type Offer = { id: string; request_id: string; partner_id: string; created_at: string }

  const [state, messages, apps, waitingPartners, requests, decisions, offers] = await Promise.all([
    loadReadState(),
    safe<Msg>(
      'messages',
      supabase.from('partner_messages').select('partner_id, body, created_at').eq('sender', 'partner').is('read_at', null).order('created_at', { ascending: false }).limit(1000),
    ),
    safe<App>(
      'applications',
      supabase.from('partner_applications').select('id, full_name, city, created_at').eq('status', 'pending_review').order('created_at', { ascending: false }).limit(50),
    ),
    safe<Partner>(
      'partners',
      supabase.from('partners').select('id, company_name, city, created_at').eq('verified', false).eq('is_blocked', false).is('deleted_at', null).order('created_at', { ascending: false }).limit(50),
    ),
    safe<Req>(
      'requests',
      supabase.from('requests').select('id, service_type, city, postcode, created_at').eq('status', 'new').is('deleted_at', null).gte('created_at', lookback).order('created_at', { ascending: false }).limit(50),
    ),
    safe<Decision>(
      'decisions',
      supabase
        .from('requests')
        .select('id, service_type, city, postcode, created_at, status, offer_responded_at')
        .in('status', ['offer_accepted', 'offer_rejected'])
        .is('deleted_at', null)
        .gte('offer_responded_at', lookback)
        .order('offer_responded_at', { ascending: false })
        .limit(30),
    ),
    safe<Offer>(
      'offers',
      supabase.from('partner_offers').select('id, request_id, partner_id, created_at').eq('status', 'pending').gte('created_at', lookback).order('created_at', { ascending: false }).limit(50),
    ),
  ])

  // Names for chat senders and offer partners, services for offers (only names – no email / phone).
  const partnerIds = [...new Set([...messages.map((m) => m.partner_id), ...offers.map((o) => o.partner_id)])]
  const offerRequestIds = [...new Set(offers.map((o) => o.request_id))]
  const [partnerRows, offerRequests] = await Promise.all([
    partnerIds.length
      ? safe<{ id: string; company_name: string | null }>('partner names', supabase.from('partners').select('id, company_name').in('id', partnerIds))
      : Promise.resolve([]),
    offerRequestIds.length
      ? safe<Req>('offer requests', supabase.from('requests').select('id, service_type, city, postcode, created_at').in('id', offerRequestIds))
      : Promise.resolve([]),
  ])
  const partnerName = new Map(partnerRows.map((p) => [p.id, p.company_name]))
  const requestById = new Map(offerRequests.map((r) => [r.id, r]))

  const isUnread = (id: string, createdAt: string) => createdAt > state.since && !state.ids.includes(id)
  const items: AdminNotification[] = []

  // One entry per partner conversation, with the number of unread messages.
  const chats = new Map<string, { count: number; latest: Msg }>()
  for (const m of messages) {
    const c = chats.get(m.partner_id)
    if (c) c.count++
    else chats.set(m.partner_id, { count: 1, latest: m })
  }
  for (const [partnerId, c] of chats) {
    items.push({
      id: `chat:${partnerId}`,
      type: 'chat',
      kind: 'chat',
      name: partnerName.get(partnerId) ?? null,
      service: null,
      city: null,
      preview: shorten(c.latest.body),
      count: c.count,
      createdAt: c.latest.created_at,
      href: `/admin/dashboard?chat=${partnerId}`,
      unread: true,
    })
  }
  for (const a of apps) {
    const id = `app:${a.id}`
    items.push({ id, type: 'partner', kind: 'application', name: a.full_name, service: null, city: a.city, preview: null, count: 1, createdAt: a.created_at, href: '/admin/partner-applications', unread: isUnread(id, a.created_at) })
  }
  for (const p of waitingPartners) {
    const id = `partner:${p.id}`
    items.push({ id, type: 'partner', kind: 'partner_verify', name: p.company_name, service: null, city: p.city, preview: null, count: 1, createdAt: p.created_at, href: `/admin/dashboard?partner=${p.id}`, unread: isUnread(id, p.created_at) })
  }
  for (const r of requests) {
    const id = `request:${r.id}`
    items.push({ id, type: 'request', kind: 'request', name: null, service: r.service_type, city: r.city ?? r.postcode, preview: null, count: 1, createdAt: r.created_at, href: `/admin/dashboard?request=${r.id}`, unread: isUnread(id, r.created_at) })
  }
  for (const o of offers) {
    const id = `offer:${o.id}`
    const r = requestById.get(o.request_id)
    items.push({ id, type: 'other', kind: 'offer', name: partnerName.get(o.partner_id) ?? null, service: r?.service_type ?? null, city: r ? (r.city ?? r.postcode) : null, preview: null, count: 1, createdAt: o.created_at, href: `/admin/dashboard?offers=${o.request_id}`, unread: isUnread(id, o.created_at) })
  }
  for (const d of decisions) {
    const id = `decision:${d.id}:${d.offer_responded_at}`
    items.push({ id, type: 'other', kind: d.status === 'offer_accepted' ? 'accepted' : 'rejected', name: null, service: d.service_type, city: d.city ?? d.postcode, preview: null, count: 1, createdAt: d.offer_responded_at, href: `/admin/dashboard?request=${d.id}`, unread: isUnread(id, d.offer_responded_at) })
  }

  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const chatCount = messages.length
  const otherUnread = items.filter((i) => i.type !== 'chat' && i.unread).length
  return {
    items: items.slice(0, limit),
    total: chatCount + otherUnread,
    chat: chatCount,
    chatPartners: [...chats.entries()].map(([id, c]) => ({ id, count: c.count })),
  }
}

const chatPartnerId = (id: string) => (id.startsWith('chat:') ? id.slice(5) : null)

// Marks one notification as read. Chat notifications mark that partner's messages as read.
export async function markNotificationRead(id: string) {
  const partnerId = chatPartnerId(id)
  if (partnerId) {
    const { error } = await supabase
      .from('partner_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('partner_id', partnerId)
      .eq('sender', 'partner')
      .is('read_at', null)
    if (error) throw new Error(error.message)
    return
  }
  const state = await loadReadState()
  if (state.ids.includes(id)) return
  await saveReadState({ since: state.since, ids: [id, ...state.ids].slice(0, MAX_READ_IDS) })
}

export async function markAllNotificationsRead() {
  const now = new Date().toISOString()
  const { error } = await supabase.from('partner_messages').update({ read_at: now }).eq('sender', 'partner').is('read_at', null)
  if (error) console.error('Notifications: mark chats read failed:', error.message)
  await saveReadState({ since: now, ids: [] })
}
