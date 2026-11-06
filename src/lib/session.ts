import { createHash, createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { loadAdmin } from '@/lib/adminAuth'
import { supabase } from '@/lib/supabaseServer'

export const ADMIN_COOKIE = 'kf_admin'
export const PARTNER_COOKIE = 'kf_partner'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7

type Payload = { sub: string; v: string; exp: number }

function secret() {
  const base = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!base) throw new Error('SESSION_SECRET oder SUPABASE_SERVICE_ROLE_KEY fehlt.')
  return createHash('sha256').update(`klarfix-session:${base}`).digest()
}

const sign = (data: string) => createHmac('sha256', secret()).update(data).digest('base64url')

// Changes whenever the password changes, so old sessions stop working after a password change/reset.
export const passwordFingerprint = (hash: string) => createHash('sha256').update(hash).digest('base64url').slice(0, 16)

function readToken(token: string | undefined): Payload | null {
  if (!token) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const expected = Buffer.from(sign(body))
  const actual = Buffer.from(sig)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as Payload
    return typeof payload.sub === 'string' && typeof payload.v === 'string' && payload.exp > Date.now() ? payload : null
  } catch {
    return null
  }
}

export async function setSession(name: string, sub: string, version: string) {
  const body = Buffer.from(JSON.stringify({ sub, v: version, exp: Date.now() + MAX_AGE_SECONDS * 1000 })).toString('base64url')
  ;(await cookies()).set(name, `${body}.${sign(body)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  })
}

export async function clearSession(name: string) {
  ;(await cookies()).delete(name)
}

const unauthorized = () => NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 })

export function adminVersion(passwordHash: string | null) {
  return passwordFingerprint(passwordHash ?? `env:${process.env.ADMIN_PASSWORD ?? ''}`)
}

// Usage in admin routes: `const denied = await requireAdmin(); if (denied) return denied`
export async function requireAdmin(): Promise<NextResponse | null> {
  try {
    const payload = readToken((await cookies()).get(ADMIN_COOKIE)?.value)
    if (!payload) return unauthorized()
    const admin = await loadAdmin()
    const ok = !!admin.email && payload.sub === admin.email.toLowerCase() && payload.v === adminVersion(admin.passwordHash)
    return ok ? null : unauthorized()
  } catch (err) {
    console.error('Admin session check failed', err)
    return NextResponse.json({ error: 'Server-Fehler.' }, { status: 500 })
  }
}

export type SessionPartner = { id: string; company_name: string; email: string; verified: boolean; is_blocked: boolean }

export async function requirePartner(): Promise<{ partner: SessionPartner } | { response: NextResponse }> {
  try {
    return await loadSessionPartner()
  } catch (err) {
    console.error('Partner session check failed', err)
    return { response: NextResponse.json({ error: 'Server-Fehler.' }, { status: 500 }) }
  }
}

async function loadSessionPartner(): Promise<{ partner: SessionPartner } | { response: NextResponse }> {
  const payload = readToken((await cookies()).get(PARTNER_COOKIE)?.value)
  if (!payload || !/^[0-9a-f-]{36}$/i.test(payload.sub)) return { response: unauthorized() }
  const { data, error } = await supabase
    .from('partners')
    .select('id, company_name, email, password_hash, verified, is_blocked, deleted_at')
    .eq('id', payload.sub)
    .maybeSingle()
  if (error) return { response: NextResponse.json({ error: 'Server-Fehler.' }, { status: 500 }) }
  if (!data || data.deleted_at || !data.password_hash || payload.v !== passwordFingerprint(data.password_hash)) {
    return { response: unauthorized() }
  }
  return {
    partner: {
      id: data.id,
      company_name: data.company_name,
      email: data.email,
      verified: data.verified === true,
      is_blocked: data.is_blocked === true,
    },
  }
}
