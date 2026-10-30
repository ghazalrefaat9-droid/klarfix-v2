import { timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'

function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
}

export async function POST(request: Request) {
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminEmail || !adminPassword) {
    return NextResponse.json({ error: 'Server nicht konfiguriert.' }, { status: 500 })
  }

  const body = (await request.json().catch(() => null)) as { email?: unknown; password?: unknown } | null
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  const ok = safeEqual(email, adminEmail.toLowerCase()) && safeEqual(password, adminPassword)
  if (!ok) {
    return NextResponse.json({ error: 'E-Mail oder Passwort ist falsch.' }, { status: 401 })
  }

  return NextResponse.json({ email: adminEmail })
}
