import { NextResponse } from 'next/server'
import { loadAdmin } from '@/lib/adminAuth'
import { sendMail } from '@/lib/mailer'
import { supabase } from '@/lib/supabaseClient'
import {
  CODE_TTL_MS,
  RESEND_COOLDOWN_MS,
  clearResets,
  findLatestReset,
  generateCode,
  hashCode,
  resetMessage,
  type AccountType,
} from '@/lib/passwordReset'

const GENERIC =
  'Falls ein Konto mit dieser E-Mail existiert, haben wir einen Bestätigungscode gesendet. Bitte prüfen Sie Ihren Posteingang.'

async function findAccountEmail(accountType: AccountType, email: string) {
  if (accountType === 'admin') {
    const admin = await loadAdmin()
    return admin.email && admin.email.toLowerCase() === email ? admin.email : null
  }
  const { data, error } = await supabase.from('partners').select('email').eq('email', email).maybeSingle()
  if (error) throw new Error(error.message)
  return data?.email ?? null
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { accountType?: unknown; email?: unknown } | null
  const accountType = body?.accountType === 'admin' ? 'admin' : body?.accountType === 'partner' ? 'partner' : null
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''

  if (!accountType || !email.includes('@')) {
    return NextResponse.json({ error: 'Bitte eine gültige E-Mail-Adresse eingeben.' }, { status: 400 })
  }

  try {
    const account = await findAccountEmail(accountType, email)
    if (!account) return NextResponse.json({ message: GENERIC })

    const latest = await findLatestReset(accountType, email)
    if (latest && Date.now() - new Date(latest.created_at).getTime() < RESEND_COOLDOWN_MS) {
      return NextResponse.json({ error: 'Bitte warten Sie eine Minute, bevor Sie einen neuen Code anfordern.' }, { status: 429 })
    }

    const code = generateCode()
    await clearResets(accountType, email)
    const { error } = await supabase.from('password_resets').insert({
      account_type: accountType,
      account_key: email,
      code_hash: hashCode(accountType, email, code),
      expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
    })
    if (error) throw new Error(error.message)

    const msg = resetMessage(accountType, email, code, new URL(req.url).origin)
    await sendMail(account, msg.subject, msg.text, msg.html)
    return NextResponse.json({ message: GENERIC })
  } catch (err) {
    console.error('password request failed', err)
    return NextResponse.json({ error: 'Der Code konnte nicht gesendet werden. Bitte versuchen Sie es später erneut.' }, { status: 500 })
  }
}
