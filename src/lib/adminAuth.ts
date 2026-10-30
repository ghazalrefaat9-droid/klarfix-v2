import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { supabase } from '@/lib/supabaseClient'

export type AdminSettings = {
  email: string
  companyName: string
  contactEmail: string
}

type AdminRow = { key: string; value: string }

export function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

function verifyPasswordHash(password: string, stored: string) {
  const [scheme, salt, hash] = stored.split('$')
  if (scheme !== 'scrypt' || !salt || !hash) return false
  const expected = Buffer.from(hash, 'hex')
  const actual = scryptSync(password, salt, expected.length)
  return timingSafeEqual(expected, actual)
}

async function readRows(keys: string[]) {
  const { data, error } = await supabase.from('admin_settings').select('key, value').in('key', keys)
  if (error) throw new Error(error.message)
  return Object.fromEntries(((data as AdminRow[]) ?? []).map((r) => [r.key, r.value]))
}

// Die Datenbank hat Vorrang. Die Umgebungsvariablen dienen nur als Ersteinrichtung, bis ein Admin sie ändert.
export async function loadAdmin() {
  const rows = await readRows(['admin_email', 'admin_password_hash', 'company_name', 'contact_email'])
  return {
    email: rows.admin_email ?? process.env.ADMIN_EMAIL ?? '',
    passwordHash: rows.admin_password_hash ?? null,
    companyName: rows.company_name ?? '',
    contactEmail: rows.contact_email ?? '',
  }
}

export function checkPassword(password: string, passwordHash: string | null) {
  if (passwordHash) return verifyPasswordHash(password, passwordHash)
  return !!process.env.ADMIN_PASSWORD && safeEqual(password, process.env.ADMIN_PASSWORD)
}

export async function saveAdminSettings(values: Record<string, string>) {
  const rows = Object.entries(values).map(([key, value]) => ({
    key,
    value,
    updated_at: new Date().toISOString(),
  }))
  const { error } = await supabase.from('admin_settings').upsert(rows, { onConflict: 'key' })
  if (error) throw new Error(error.message)
}
