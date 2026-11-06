import { NextResponse } from 'next/server'
import { ADMIN_COOKIE, clearSession } from '@/lib/session'

export async function POST() {
  await clearSession(ADMIN_COOKIE)
  return NextResponse.json({ ok: true })
}
