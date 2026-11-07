import { NextResponse } from 'next/server'
import { requirePartner } from '@/lib/session'
import { countUnread } from '@/lib/messages'

// Status of the logged-in partner (from the session cookie, not from the request body).
export async function POST() {
  const session = await requirePartner()
  if ('response' in session) return session.response
  const { partner } = session

  // Blocked partners keep their login session but see no orders.
  const verified = partner.verified && !partner.is_blocked
  // A missing partner_messages table (migration not run yet) must not break the dashboard.
  const unreadMessages = verified ? await countUnread(partner.id, 'partner').catch(() => 0) : 0
  return NextResponse.json({ verified, blocked: partner.is_blocked, unreadMessages })
}
