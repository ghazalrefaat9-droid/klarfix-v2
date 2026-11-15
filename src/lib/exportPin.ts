import { createHash, createHmac, timingSafeEqual } from 'crypto'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabaseServer'
import { EXPORT_SESSION_SECONDS, PIN_LOCK_MINUTES, PIN_MAX_ATTEMPTS } from '@/lib/exportConstants'

// Export Center PIN: bcrypt hash in admin_settings (row id = 1), attempts + lock stored in the database
// so the 3-tries / 5-minutes rule cannot be bypassed by clearing the browser.

export const EXPORT_COOKIE = 'kf_export'
const SETTINGS_ID = 1

export type PinCheckResult =
  | { ok: true }
  | { ok: false; locked: true; lockedUntil: string }
  | { ok: false; locked: false; attemptsLeft: number }

type PinRow = { pin_hash: string | null; pin_attempts: number | null; pin_locked_until: string | null }

async function loadPinRow(): Promise<PinRow> {
  const { data, error } = await supabase
    .from('admin_settings')
    .select('pin_hash, pin_attempts, pin_locked_until')
    .eq('id', SETTINGS_ID)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data?.pin_hash) throw new Error('Export-PIN ist nicht eingerichtet (admin_settings id = 1).')
  return data as PinRow
}

async function savePinState(values: Partial<PinRow> & { updated_at?: string }) {
  const { error } = await supabase.from('admin_settings').update(values).eq('id', SETTINGS_ID)
  if (error) throw new Error(error.message)
}

export async function verifyPin(pin: string): Promise<PinCheckResult> {
  const row = await loadPinRow()

  if (row.pin_locked_until && new Date(row.pin_locked_until) > new Date()) {
    return { ok: false, locked: true, lockedUntil: row.pin_locked_until }
  }

  if (await bcrypt.compare(pin, row.pin_hash!)) {
    await savePinState({ pin_attempts: 0, pin_locked_until: null })
    return { ok: true }
  }

  // An expired lock means the counter starts fresh.
  const attempts = (row.pin_locked_until ? 0 : (row.pin_attempts ?? 0)) + 1
  if (attempts >= PIN_MAX_ATTEMPTS) {
    const lockedUntil = new Date(Date.now() + PIN_LOCK_MINUTES * 60_000).toISOString()
    await savePinState({ pin_attempts: 0, pin_locked_until: lockedUntil })
    return { ok: false, locked: true, lockedUntil }
  }
  await savePinState({ pin_attempts: attempts, pin_locked_until: null })
  return { ok: false, locked: false, attemptsLeft: PIN_MAX_ATTEMPTS - attempts }
}

export async function updatePin(newPin: string) {
  await savePinState({
    pin_hash: await bcrypt.hash(newPin, 12),
    pin_attempts: 0,
    pin_locked_until: null,
    updated_at: new Date().toISOString(),
  })
}

// ---- 15-minute export session (signed httpOnly cookie) ----

function secret() {
  const base = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!base) throw new Error('SESSION_SECRET oder SUPABASE_SERVICE_ROLE_KEY fehlt.')
  return createHash('sha256').update(`klarfix-export:${base}`).digest()
}

const sign = (data: string) => createHmac('sha256', secret()).update(data).digest('base64url')

export async function setExportSession() {
  const body = Buffer.from(JSON.stringify({ exp: Date.now() + EXPORT_SESSION_SECONDS * 1000 })).toString('base64url')
  ;(await cookies()).set(EXPORT_COOKIE, `${body}.${sign(body)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: EXPORT_SESSION_SECONDS,
  })
}

export async function clearExportSession() {
  ;(await cookies()).delete(EXPORT_COOKIE)
}

export async function hasExportSession() {
  const token = (await cookies()).get(EXPORT_COOKIE)?.value
  if (!token) return false
  const [body, sig] = token.split('.')
  if (!body || !sig) return false
  const expected = Buffer.from(sign(body))
  const actual = Buffer.from(sig)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false
  try {
    const { exp } = JSON.parse(Buffer.from(body, 'base64url').toString()) as { exp?: number }
    return typeof exp === 'number' && exp > Date.now()
  } catch {
    return false
  }
}

// Rejects cross-site POSTs (defense in depth on top of SameSite cookies).
export function isSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin) return true
  try {
    return new URL(origin).host === request.headers.get('host')
  } catch {
    return false
  }
}
