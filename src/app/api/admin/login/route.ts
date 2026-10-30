import { NextResponse } from 'next/server'
import { checkPassword, loadAdmin, safeEqual } from '@/lib/adminAuth'

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: unknown; password?: unknown } | null
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  try {
    const admin = await loadAdmin()
    const emailOk = !!admin.email && safeEqual(email, admin.email.toLowerCase())
    if (!emailOk || !checkPassword(password, admin.passwordHash)) {
      return NextResponse.json({ error: 'E-Mail oder Passwort ist falsch.' }, { status: 401 })
    }
    return NextResponse.json({ email: admin.email })
  } catch {
    return NextResponse.json({ error: 'Server-Fehler.' }, { status: 500 })
  }
}
