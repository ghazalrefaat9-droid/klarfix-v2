import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseServer'
import { requireAdmin } from '@/lib/session'
import { jsonError, readJson } from '@/lib/partnerAdmin'
import { cleanMessage, postMessage, readConversation } from '@/lib/messages'

// Chat is only available with verified, active (not blocked, not trashed) partners.
async function loadChatPartner(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const { data } = await supabase
    .from('partners')
    .select('id, company_name, email, verified, is_blocked, deleted_at')
    .eq('id', id)
    .maybeSingle()
  if (!data || data.deleted_at || !data.verified || data.is_blocked) return null
  return { id: data.id as string, company_name: data.company_name as string, email: data.email as string }
}

export async function GET(_request: Request, ctx: RouteContext<'/api/admin/partners/[id]/messages'>) {
  const denied = await requireAdmin()
  if (denied) return denied
  const partner = await loadChatPartner((await ctx.params).id)
  if (!partner) return jsonError('Chat nur mit verifizierten, aktiven Partnern möglich.', 404)

  try {
    return NextResponse.json({ messages: await readConversation(partner.id, 'admin') })
  } catch (err) {
    console.error('Admin chat load failed', err)
    return jsonError('Nachrichten konnten nicht geladen werden.', 500)
  }
}

export async function POST(request: Request, ctx: RouteContext<'/api/admin/partners/[id]/messages'>) {
  const denied = await requireAdmin()
  if (denied) return denied
  const partner = await loadChatPartner((await ctx.params).id)
  if (!partner) return jsonError('Chat nur mit verifizierten, aktiven Partnern möglich.', 404)

  const body = cleanMessage((await readJson<{ body: unknown }>(request)).body)
  if (!body) return jsonError('Nachricht ist leer oder zu lang (max. 2000 Zeichen).', 400)

  try {
    const message = await postMessage(partner, 'admin', body, new URL(request.url).origin)
    return NextResponse.json({ message })
  } catch (err) {
    console.error('Admin chat send failed', err)
    return jsonError('Nachricht konnte nicht gesendet werden.', 500)
  }
}
