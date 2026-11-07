import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/session'
import { unreadForAdmin } from '@/lib/messages'

// Unread partner messages per partner (badges in the admin panel).
export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied
  try {
    const byPartner = await unreadForAdmin()
    const total = Object.values(byPartner).reduce((sum, n) => sum + n, 0)
    return NextResponse.json({ byPartner, total })
  } catch (err) {
    console.error('Unread count failed', err)
    return NextResponse.json({ error: 'Server-Fehler.' }, { status: 500 })
  }
}
