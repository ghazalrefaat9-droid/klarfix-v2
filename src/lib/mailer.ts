export const SITE_NAME = 'KlarFix'
export const CAMPAIGN_TEXT = 'Ihr KlarFix Team - Sicher & Schnell'

export async function sendMail(to: string, subject: string, text: string, html?: string) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
  if (!apiKey) throw new Error('RESEND_API_KEY fehlt.')

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: `${SITE_NAME} <${from}>`, to, subject, text, html }),
  })
  if (!res.ok) throw new Error(`Resend-Fehler ${res.status}: ${await res.text()}`)
}
