import { NextResponse } from 'next/server'
import { hashPassword, loadAdmin, saveAdminSettings } from '@/lib/adminAuth'
import { supabase } from '@/lib/supabaseClient'
import {
  MAX_ATTEMPTS,
  clearResets,
  findLatestReset,
  hashCode,
  type AccountType,
} from '@/lib/passwordReset'

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    accountType?: unknown
    email?: unknown
    code?: unknown
    newPassword?: unknown
  } | null
  const accountType: AccountType | null =
    body?.accountType === 'admin' ? 'admin' : body?.accountType === 'partner' ? 'partner' : null
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const code = typeof body?.code === 'string' ? body.code.trim() : ''
  const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : ''

  if (!accountType || !email || !code) {
    return NextResponse.json({ error: 'Bitte alle Felder ausfüllen.' }, { status: 400 })
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'Das neue Passwort muss mindestens 8 Zeichen lang sein.' }, { status: 400 })
  }

  try {
    const latest = await findLatestReset(accountType, email)
    if (!latest || new Date(latest.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Der Code ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen Code an.' }, { status: 400 })
    }
    if (latest.attempts >= MAX_ATTEMPTS) {
      await clearResets(accountType, email)
      return NextResponse.json({ error: 'Zu viele Fehlversuche. Bitte fordern Sie einen neuen Code an.' }, { status: 429 })
    }

    if (hashCode(accountType, email, code) !== latest.code_hash) {
      await supabase.from('password_resets').update({ attempts: latest.attempts + 1 }).eq('id', latest.id)
      return NextResponse.json({ error: 'Der Code ist falsch.' }, { status: 400 })
    }

    if (accountType === 'admin') {
      const admin = await loadAdmin()
      if (admin.email.toLowerCase() !== email) {
        return NextResponse.json({ error: 'Der Code ist ungültig oder abgelaufen.' }, { status: 400 })
      }
      await saveAdminSettings({ admin_password_hash: hashPassword(newPassword) })
    } else {
      const { data, error } = await supabase
        .from('partners')
        .update({ password_hash: hashPassword(newPassword) })
        .eq('email', email)
        .select('id')
        .maybeSingle()
      if (error) throw new Error(error.message)
      if (!data) return NextResponse.json({ error: 'Der Code ist ungültig oder abgelaufen.' }, { status: 400 })
    }

    await clearResets(accountType, email)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('password reset failed', err)
    return NextResponse.json({ error: 'Das Passwort konnte nicht geändert werden. Bitte versuchen Sie es erneut.' }, { status: 500 })
  }
}
