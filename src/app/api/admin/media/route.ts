import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseServer'
import { requireAdmin } from '@/lib/session'
import { readJson } from '@/lib/partnerAdmin'
import { postMessage } from '@/lib/messages'
import { deleteMedia, listAdminMedia, reviewMedia } from '@/lib/mediaServer'
import type { MediaStatus } from '@/lib/mediaRules'

const isId = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v)

export async function GET(request: Request) {
  const denied = await requireAdmin()
  if (denied) return denied
  const status = new URL(request.url).searchParams.get('status')
  const filter: MediaStatus = status === 'approved' || status === 'rejected' ? status : 'pending'
  try {
    return NextResponse.json({ media: await listAdminMedia(filter) })
  } catch (err) {
    console.error('Admin media load failed', err)
    return NextResponse.json({ error: 'Medien konnten nicht geladen werden.' }, { status: 500 })
  }
}

// { id, action: 'approve' } or { id, action: 'reject', reason }. The partner is notified in the chat (and by email).
export async function PATCH(request: Request) {
  const denied = await requireAdmin()
  if (denied) return denied
  const { id, action, reason } = await readJson<{ id: unknown; action: unknown; reason: unknown }>(request)
  if (!isId(id)) return NextResponse.json({ error: 'Ungültige ID.' }, { status: 400 })
  if (action !== 'approve' && action !== 'reject') return NextResponse.json({ error: 'Ungültige Aktion.' }, { status: 400 })

  const cleanReason = typeof reason === 'string' ? reason.trim().slice(0, 300) : ''
  if (action === 'reject' && !cleanReason) return NextResponse.json({ error: 'Bitte einen Ablehnungsgrund angeben.' }, { status: 400 })

  try {
    const item = await reviewMedia(id, action === 'approve' ? { approve: true } : { approve: false, reason: cleanReason })
    if (!item) return NextResponse.json({ error: 'Nicht gefunden.' }, { status: 404 })

    const { data: partner } = await supabase.from('partners').select('id, company_name, email').eq('id', item.partner_id).maybeSingle()
    if (partner) {
      const what = item.kind === 'video' ? 'Video' : 'Foto'
      const body =
        action === 'approve'
          ? `Dein ${what} wurde freigegeben und ist jetzt für Kunden sichtbar.`
          : `Dein ${what} wurde abgelehnt. Grund: ${cleanReason}. Du kannst ein neues Medium hochladen.`
      await postMessage(partner, 'admin', body, new URL(request.url).origin).catch((err) => console.error('Media notification failed', err))
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Admin media review failed', err)
    return NextResponse.json({ error: 'Aktion fehlgeschlagen.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const denied = await requireAdmin()
  if (denied) return denied
  const id = new URL(request.url).searchParams.get('id')
  if (!isId(id)) return NextResponse.json({ error: 'Ungültige ID.' }, { status: 400 })
  try {
    const ok = await deleteMedia(id)
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Nicht gefunden.' }, { status: 404 })
  } catch (err) {
    console.error('Admin media delete failed', err)
    return NextResponse.json({ error: 'Löschen fehlgeschlagen.' }, { status: 500 })
  }
}
