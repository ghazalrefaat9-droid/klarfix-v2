import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/session'
import { readJson } from '@/lib/partnerAdmin'
import { loadNotifications, markAllNotificationsRead, markNotificationRead } from '@/lib/adminNotifications'

// GET ?limit=… → { items, total, chat, chatPartners } for the bell / chat icon in the admin header.
export async function GET(request: Request) {
  const denied = await requireAdmin()
  if (denied) return denied
  const limit = Math.min(Math.max(Number(new URL(request.url).searchParams.get('limit')) || 30, 1), 100)
  try {
    return NextResponse.json(await loadNotifications(limit))
  } catch (err) {
    console.error('Notifications load failed', err)
    return NextResponse.json({ error: 'Benachrichtigungen konnten nicht geladen werden.' }, { status: 500 })
  }
}

// { action: 'read', id } or { action: 'readAll' }
export async function POST(request: Request) {
  const denied = await requireAdmin()
  if (denied) return denied
  const body = await readJson<{ action: unknown; id: unknown }>(request)
  try {
    if (body.action === 'readAll') await markAllNotificationsRead()
    else if (body.action === 'read' && typeof body.id === 'string' && /^[a-z]+:[0-9a-zA-Z:.+\-TZ]{1,120}$/.test(body.id)) {
      await markNotificationRead(body.id)
    } else return NextResponse.json({ error: 'Ungültige Aktion.' }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Notifications update failed', err)
    return NextResponse.json({ error: 'Speichern fehlgeschlagen.' }, { status: 500 })
  }
}
