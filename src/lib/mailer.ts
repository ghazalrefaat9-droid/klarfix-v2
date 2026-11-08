export const SITE_NAME = 'KlarFix'
export const CAMPAIGN_TEXT = 'Ihr KlarFix Team - Sicher & Schnell'

const DEFAULT_FROM = 'onboarding@resend.dev'

// Error with a German, admin-readable explanation of why Resend refused the email.
export class MailError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'MailError'
    this.status = status
  }
}

export function mailErrorMessage(err: unknown) {
  return err instanceof MailError ? err.message : 'Unbekannter Fehler beim E-Mail-Versand.'
}

function explain(status: number, resendMessage: string, from: string) {
  const msg = resendMessage.toLowerCase()
  if (msg.includes('only send testing emails')) {
    return `Absender-Domain nicht verifiziert: Mit dem Test-Absender ${from} sendet Resend nur an die eigene Konto-Adresse. Bitte die eigene Domain (z.B. klarfix.de) in Resend verifizieren und RESEND_FROM_EMAIL in Vercel auf eine Adresse dieser Domain setzen (z.B. noreply@klarfix.de).`
  }
  if (msg.includes('domain is not verified') || msg.includes('not verified')) {
    return `Domain nicht verifiziert: Die Domain von ${from} ist in Resend nicht verifiziert. DNS-Einträge unter resend.com/domains prüfen.`
  }
  if (status === 401 || msg.includes('api key is invalid') || msg.includes('invalid api key')) {
    return 'RESEND_API_KEY ist ungültig. Bitte in Vercel unter Environment Variables einen gültigen Key eintragen.'
  }
  if (status === 429) return 'Resend-Versandlimit erreicht. Bitte in einigen Minuten erneut versuchen.'
  if (status === 422) return `Ungültige E-Mail-Daten (Resend): ${resendMessage}`
  return `Resend-Fehler ${status}: ${resendMessage}`
}

export async function sendMail(to: string, subject: string, text: string, html?: string) {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM
  if (!apiKey) {
    const error = new MailError('RESEND_API_KEY fehlt. Bitte in Vercel unter Settings → Environment Variables eintragen.')
    console.error('Email Fehler:', error.message)
    throw error
  }

  let res: Response
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      // RESEND_FROM_EMAIL may be a bare address or already "Name <address>".
      body: JSON.stringify({ from: from.includes('<') ? from : `${SITE_NAME} <${from}>`, to, subject, text, html }),
    })
  } catch (err) {
    console.error('Email Fehler:', err)
    throw new MailError('Resend ist nicht erreichbar (Netzwerkfehler). Bitte später erneut versuchen.')
  }

  if (!res.ok) {
    const raw = await res.text()
    let resendMessage = raw
    try {
      resendMessage = (JSON.parse(raw) as { message?: string }).message ?? raw
    } catch {}
    const error = new MailError(explain(res.status, resendMessage, from), res.status)
    console.error('Email Fehler:', { status: res.status, from, resend: resendMessage })
    throw error
  }
}
