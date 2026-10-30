import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { CAMPAIGN_TEXT, SITE_NAME, sendMail } from '@/lib/mailer'

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function approvalMessage(companyName: string, loginUrl: string) {
  const text = [
    `Guten Tag,`,
    ``,
    `herzlichen Glückwunsch! Ihr Partnerantrag für ${companyName} wurde von ${SITE_NAME} angenommen.`,
    `Ab sofort können Sie sich im Partnerbereich anmelden und passende Aufträge annehmen:`,
    loginUrl,
    ``,
    `Mit freundlichen Grüßen`,
    CAMPAIGN_TEXT,
  ].join('\n')

  const html = `
    <p>Guten Tag,</p>
    <p>herzlichen Glückwunsch! Ihr Partnerantrag für <strong>${escapeHtml(companyName)}</strong> wurde von ${SITE_NAME} angenommen.</p>
    <p>Ab sofort können Sie sich im Partnerbereich anmelden und passende Aufträge annehmen:</p>
    <p><a href="${escapeHtml(loginUrl)}" style="display:inline-block;padding:12px 20px;background:#0F60C6;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold">Zum Partnerbereich</a></p>
    <p>Mit freundlichen Grüßen<br>${escapeHtml(CAMPAIGN_TEXT)}</p>
  `
  return { subject: `${SITE_NAME}: Ihr Partnerantrag wurde angenommen`, text, html }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { partnerId?: unknown } | null
  const partnerId = typeof body?.partnerId === 'string' ? body.partnerId : ''
  if (!partnerId) {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 })
  }

  const { data: partner, error: readError } = await supabase
    .from('partners')
    .select('id, company_name, email, verified')
    .eq('id', partnerId)
    .maybeSingle()
  if (readError || !partner) {
    return NextResponse.json({ error: 'Partner nicht gefunden.' }, { status: 404 })
  }
  if (partner.verified) {
    return NextResponse.json({ ok: true, alreadyVerified: true, emailSent: false })
  }

  const { error: updateError } = await supabase
    .from('partners')
    .update({ verified: true })
    .eq('id', partnerId)
  if (updateError) {
    return NextResponse.json({ error: 'Verifizierung fehlgeschlagen.' }, { status: 500 })
  }

  const loginUrl = `${new URL(request.url).origin}/partner/login`
  try {
    const msg = approvalMessage(partner.company_name, loginUrl)
    await sendMail(partner.email, msg.subject, msg.text, msg.html)
    return NextResponse.json({ ok: true, emailSent: true })
  } catch (err) {
    console.error('Approval email failed', err)
    return NextResponse.json({ ok: true, emailSent: false, warning: 'Partner verifiziert, aber die E-Mail konnte nicht gesendet werden.' })
  }
}
