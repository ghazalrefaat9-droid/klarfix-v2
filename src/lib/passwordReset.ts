import { createHash, randomInt } from 'crypto'
import { supabase } from '@/lib/supabaseClient'
import { CAMPAIGN_TEXT, SITE_NAME } from '@/lib/mailer'

export type AccountType = 'partner' | 'admin'

export const CODE_TTL_MS = 10 * 60 * 1000
export const RESEND_COOLDOWN_MS = 60 * 1000
export const MAX_ATTEMPTS = 5

export function generateCode() {
  return String(randomInt(0, 1000000)).padStart(6, '0')
}

export function hashCode(accountType: AccountType, key: string, code: string) {
  return createHash('sha256').update(`${accountType}:${key}:${code}`).digest('hex')
}

export function resetMessage(accountType: AccountType, email: string, code: string, origin: string) {
  const link = `${origin}/${accountType}/passwort-vergessen?email=${encodeURIComponent(email)}&code=${code}`
  return {
    subject: `${SITE_NAME} - Ihr Code zum Zurücksetzen des Passworts`,
    text: [
      `Guten Tag,`,
      ``,
      `Sie haben angefordert, Ihr Passwort bei ${SITE_NAME} zurückzusetzen.`,
      ``,
      `Ihr Bestätigungscode lautet: ${code}`,
      ``,
      `Direkt zurücksetzen: ${link}`,
      ``,
      `Der Code ist 10 Minuten gültig. Wenn Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren.`,
      ``,
      CAMPAIGN_TEXT,
      `${SITE_NAME}`,
    ].join('\n'),
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:#111">
  <h2 style="color:#0F60C6;margin-bottom:8px">${SITE_NAME}</h2>
  <p>Guten Tag,</p>
  <p>Sie haben angefordert, Ihr Passwort bei ${SITE_NAME} zurückzusetzen.</p>
  <p>Ihr Bestätigungscode lautet: <strong style="font-size:20px;letter-spacing:4px">${code}</strong></p>
  <p style="margin:28px 0">
    <a href="${link}" style="background:#0F60C6;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;display:inline-block">Hier klicken, um das Passwort zurückzusetzen</a>
  </p>
  <p style="font-size:13px;color:#555">Der Code ist 10 Minuten gültig. Wenn Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren.</p>
  <p style="font-size:13px;color:#555;margin-top:24px">${CAMPAIGN_TEXT}<br/>${SITE_NAME}</p>
</div>`,
  }
}

export async function findLatestReset(accountType: AccountType, key: string) {
  const { data, error } = await supabase
    .from('password_resets')
    .select('id, code_hash, attempts, expires_at, created_at')
    .eq('account_type', accountType)
    .eq('account_key', key)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export async function clearResets(accountType: AccountType, key: string) {
  const { error } = await supabase.from('password_resets').delete().eq('account_type', accountType).eq('account_key', key)
  if (error) throw new Error(error.message)
}
