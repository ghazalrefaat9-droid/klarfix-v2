import { NextResponse } from 'next/server'
import { ADMIN_COOKIE, clearSession } from '@/lib/session'
import { clearExportSession } from '@/lib/exportPin'

export async function POST() {
  await clearSession(ADMIN_COOKIE)
  await clearExportSession()
  return NextResponse.json({ ok: true })
}
