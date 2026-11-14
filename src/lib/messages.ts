import { after } from 'next/server'
import { loadAdmin } from '@/lib/adminAuth'
import { CAMPAIGN_TEXT, SITE_NAME, sendMail } from '@/lib/mailer'
import { supabase } from '@/lib/supabaseServer'

export type Sender = 'admin' | 'partner'

export type ChatMessage = { id: string; sender: Sender; body: string; created_at: string; read_at: string | null }

export const MAX_MESSAGE_LENGTH = 2000
const HISTORY_LIMIT = 200
const COLUMNS = 'id, sender, body, created_at, read_at'

export function cleanMessage(value: unknown) {
  if (typeof value !== 'string') return null
  const body = value.trim()
  return body && body.length <= MAX_MESSAGE_LENGTH ? body : null
}

const otherSide = (side: Sender): Sender => (side === 'admin' ? 'partner' : 'admin')

// Latest messages (oldest first). Messages from the other side are marked as read, because the reader is looking at them.
export async function readConversation(partnerId: string, reader: Sender) {
  const { data, error } = await supabase
    .from('partner_messages')
    .select(COLUMNS)
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false })
    .limit(HISTORY_LIMIT)
  if (error) throw new Error(error.message)

  const { error: readError } = await supabase
    .from('partner_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('partner_id', partnerId)
    .eq('sender', otherSide(reader))
    .is('read_at', null)
  if (readError) console.error('Marking messages as read failed:', readError.message)

  return ((data as ChatMessage[]) ?? []).reverse()
}

export async function countUnread(partnerId: string, reader: Sender) {
  const { count, error } = await supabase
    .from('partner_messages')
    .select('id', { count: 'exact', head: true })
    .eq('partner_id', partnerId)
    .eq('sender', otherSide(reader))
    .is('read_at', null)
  if (error) throw new Error(error.message)
  return count ?? 0
}

// Unread partner→admin messages per partner, for the badges in the admin panel.
export async function unreadForAdmin() {
  const { data, error } = await supabase
    .from('partner_messages')
    .select('partner_id')
    .eq('sender', 'partner')
    .is('read_at', null)
    .limit(5000)
  if (error) throw new Error(error.message)
  const byPartner: Record<string, number> = {}
  for (const row of (data as { partner_id: string }[]) ?? []) byPartner[row.partner_id] = (byPartner[row.partner_id] ?? 0) + 1
  return byPartner
}

const escapeHtml = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

type PartnerInfo = { id: string; company_name: string; email: string }

export async function notifyNewMessage(partner: PartnerInfo, sender: Sender, body: string, origin: string) {
  const preview = body.length > 300 ? `${body.slice(0, 300)}…` : body
  if (sender === 'admin') {
    const link = `${origin}/partner/dashboard`
    const text = [
      `Hallo ${partner.company_name},`,
      ``,
      `Sie haben eine neue Nachricht von ${SITE_NAME}:`,
      ``,
      preview,
      ``,
      `Antworten Sie im Partnerbereich: ${link}`,
      ``,
      CAMPAIGN_TEXT,
    ].join('\n')
    const html = `
      <p>Hallo ${escapeHtml(partner.company_name)},</p>
      <p>Sie haben eine neue Nachricht von ${SITE_NAME}:</p>
      <blockquote style="margin:0;padding:12px 16px;border-left:4px solid #1B4332;background:#FFFFFF;white-space:pre-wrap">${escapeHtml(preview)}</blockquote>
      <p><a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 20px;background:#1B4332;color:#FFFFFF;text-decoration:none;border-radius:8px;font-weight:bold">Im Partnerbereich antworten</a></p>
      <p>${escapeHtml(CAMPAIGN_TEXT)}</p>`
    await sendMail(partner.email, `${SITE_NAME}: Neue Nachricht`, text, html)
    return
  }

  const admin = await loadAdmin().catch(() => null)
  const to = admin?.contactEmail || admin?.email || process.env.ADMIN_EMAIL
  if (!to) return
  const link = `${origin}/admin/partners`
  const text = [`Neue Nachricht von ${partner.company_name}:`, ``, preview, ``, `Antworten: ${link}`].join('\n')
  const html = `
    <p>Neue Nachricht von <strong>${escapeHtml(partner.company_name)}</strong>:</p>
    <blockquote style="margin:0;padding:12px 16px;border-left:4px solid #1B4332;background:#FFFFFF;white-space:pre-wrap">${escapeHtml(preview)}</blockquote>
    <p><a href="${escapeHtml(link)}">Im Admin-Bereich antworten</a></p>`
  await sendMail(to, `Neue Partner-Nachricht: ${partner.company_name}`, text, html)
}

// Stores a message. The email is sent (after the response) only for the first unread message, so a burst sends one email.
export async function postMessage(partner: PartnerInfo, sender: Sender, body: string, origin: string) {
  const { count: unreadBefore } = await supabase
    .from('partner_messages')
    .select('id', { count: 'exact', head: true })
    .eq('partner_id', partner.id)
    .eq('sender', sender)
    .is('read_at', null)

  const { data, error } = await supabase
    .from('partner_messages')
    .insert({ partner_id: partner.id, sender, body })
    .select(COLUMNS)
    .single()
  if (error || !data) throw new Error(error?.message ?? 'insert failed')

  if (!unreadBefore) {
    after(() => notifyNewMessage(partner, sender, body, origin).catch((err) => console.error('Message notification failed', err)))
  }
  return data as ChatMessage
}
