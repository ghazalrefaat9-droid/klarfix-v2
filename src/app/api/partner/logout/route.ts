import { NextResponse } from 'next/server'
import { PARTNER_COOKIE, clearSession } from '@/lib/session'

export async function POST() {
  await clearSession(PARTNER_COOKIE)
  return NextResponse.json({ ok: true })
}
