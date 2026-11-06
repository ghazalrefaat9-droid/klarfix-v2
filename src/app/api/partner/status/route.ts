import { NextResponse } from 'next/server'
import { requirePartner } from '@/lib/session'

// Status of the logged-in partner (from the session cookie, not from the request body).
export async function POST() {
  const session = await requirePartner()
  if ('response' in session) return session.response
  const { partner } = session

  // Blocked partners keep their login session but see no orders.
  return NextResponse.json({ verified: partner.verified && !partner.is_blocked, blocked: partner.is_blocked })
}
