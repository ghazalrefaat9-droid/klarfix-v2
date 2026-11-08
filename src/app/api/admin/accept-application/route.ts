import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseServer'
import { CAMPAIGN_TEXT, SITE_NAME, mailErrorMessage, sendMail } from '@/lib/mailer'
import { createSetupToken } from '@/lib/partnerSetup'
import { requireAdmin } from '@/lib/session'

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function setupMessage(name: string, setupUrl: string) {
  const text = [
    `Hallo ${name},`,
    ``,
    `Ihr Partnerantrag bei ${SITE_NAME} wurde angenommen!`,
    `Bitte richten Sie jetzt Ihr Partnerkonto ein (dauert ca. 2 Minuten):`,
    setupUrl,
    ``,
    `Sie benötigen: ein Passwort, Ihren Gewerbenachweis und Ihre Haftpflichtversicherung (PDF oder JPG, max. 5 MB). Ein Logo ist optional.`,
    ``,
    `Mit freundlichen Grüßen`,
    CAMPAIGN_TEXT,
  ].join('\n')

  const html = `
    <p>Hallo ${escapeHtml(name)},</p>
    <p>Ihr Partnerantrag bei ${SITE_NAME} wurde angenommen!</p>
    <p>Bitte richten Sie jetzt Ihr Partnerkonto ein (dauert ca. 2 Minuten):</p>
    <p><a href="${escapeHtml(setupUrl)}" style="display:inline-block;padding:12px 20px;background:#1B4332;color:#FAF3EB;text-decoration:none;border-radius:8px;font-weight:bold">Partnerkonto einrichten</a></p>
    <p>Sie benötigen: ein Passwort, Ihren Gewerbenachweis und Ihre Haftpflichtversicherung (PDF oder JPG, max. 5&nbsp;MB). Ein Logo ist optional.</p>
    <p>Mit freundlichen Grüßen<br>${escapeHtml(CAMPAIGN_TEXT)}</p>
  `
  return { subject: `${SITE_NAME}: Partnerkonto einrichten`, text, html }
}

// Accepts an application (or re-issues the link) and returns a fresh one-time setup link.
export async function POST(request: Request) {
  const denied = await requireAdmin()
  if (denied) return denied
  const body = (await request.json().catch(() => null)) as { applicationId?: unknown } | null
  const applicationId = typeof body?.applicationId === 'string' ? body.applicationId : ''
  if (!applicationId) {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 })
  }

  const { data: app, error: readError } = await supabase
    .from('partner_applications')
    .select('id, full_name, email, status, setup_completed_at')
    .eq('id', applicationId)
    .maybeSingle()
  if (readError || !app) {
    return NextResponse.json({ error: 'Antrag nicht gefunden.' }, { status: 404 })
  }
  if (app.setup_completed_at) {
    return NextResponse.json({ error: 'Dieser Partner hat sein Konto bereits eingerichtet.' }, { status: 409 })
  }

  const { token, hash } = createSetupToken()
  const { data: updated, error: updateError } = await supabase
    .from('partner_applications')
    .update({ status: 'accepted', setup_token_hash: hash })
    .eq('id', applicationId)
    .select('id')
  if (updateError || !updated?.length) {
    return NextResponse.json({ error: 'Antrag konnte nicht angenommen werden.' }, { status: 500 })
  }

  const setupUrl = `${new URL(request.url).origin}/partner/setup?token=${token}`
  try {
    const msg = setupMessage(app.full_name, setupUrl)
    await sendMail(app.email, msg.subject, msg.text, msg.html)
    // Email went out: the admin doesn't need the link, so it is not returned.
    return NextResponse.json({ ok: true, emailSent: true, sentTo: app.email })
  } catch (err) {
    console.error('Email Fehler:', err)
    // Fallback only when the email failed: the admin gets the real reason plus the link to send manually.
    return NextResponse.json({ ok: true, setupUrl, emailSent: false, emailError: mailErrorMessage(err) })
  }
}
