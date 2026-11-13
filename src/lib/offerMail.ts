import { CAMPAIGN_TEXT, SITE_NAME, sendMail } from '@/lib/mailer'
import { formatEuro } from '@/lib/requests'
import { loadAdmin } from '@/lib/adminAuth'

const escapeHtml = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const button = (href: string, label: string) =>
  `<a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 20px;background:#1B4332;color:#FAF3EB;text-decoration:none;border-radius:8px;font-weight:bold">${escapeHtml(label)}</a>`

// Offer email to the customer, sent only by the admin (partner -> admin -> customer). Sender is KlarFix:
// no partner name or contact data; the customer accepts or rejects on the /angebot page.
export async function sendOfferEmail(opts: {
  to: string
  customerName: string | null
  service: string
  price: number
  message: string | null
  offerUrl: string
}) {
  const greeting = opts.customerName ? `Guten Tag ${opts.customerName},` : 'Guten Tag,'
  const text = [
    greeting,
    ``,
    `Sie haben ein Angebot für Ihre Anfrage „${opts.service}“ erhalten:`,
    ``,
    `Preis: ${formatEuro(opts.price)}`,
    ...(opts.message ? [`Nachricht: ${opts.message}`] : []),
    ``,
    `Angebot ansehen, annehmen oder ablehnen:`,
    opts.offerUrl,
    ``,
    CAMPAIGN_TEXT,
  ].join('\n')
  const html = `
    <p>${escapeHtml(greeting)}</p>
    <p>Sie haben ein Angebot für Ihre Anfrage <strong>„${escapeHtml(opts.service)}“</strong> erhalten:</p>
    <p style="font-size:22px;font-weight:bold;color:#1B4332;margin:12px 0">${escapeHtml(formatEuro(opts.price))}</p>
    ${opts.message ? `<p style="white-space:pre-wrap">${escapeHtml(opts.message)}</p>` : ''}
    <p>${button(opts.offerUrl, 'Angebot ansehen')}</p>
    <p style="font-size:13px;opacity:.75">Über den Link können Sie das Angebot annehmen oder ablehnen.</p>
    <p>${escapeHtml(CAMPAIGN_TEXT)}</p>`
  await sendMail(opts.to, `Neues Angebot für Ihre Reinigung - ${SITE_NAME}`, text, html)
}

async function adminRecipient() {
  try {
    const admin = await loadAdmin()
    return admin.contactEmail || admin.email || process.env.ADMIN_EMAIL || ''
  } catch {
    return process.env.ADMIN_EMAIL ?? ''
  }
}

// Notifies the admin about a new partner offer; the admin decides in the dashboard which offer goes to the customer.
export async function sendPartnerOfferToAdmin(opts: {
  companyName: string
  service: string
  postcode: string
  price: number
  message: string | null
  adminUrl: string
}) {
  const to = await adminRecipient()
  if (!to) return
  const text = [
    `Neues Partner-Angebot für „${opts.service}“ (PLZ ${opts.postcode})`,
    ``,
    `Partner: ${opts.companyName}`,
    `Preis: ${formatEuro(opts.price)}`,
    ...(opts.message ? [`Nachricht an Kunde: ${opts.message}`] : []),
    ``,
    `Im Admin-Dashboard unter „Partner Angebote“ prüfen und an den Kunden senden:`,
    opts.adminUrl,
  ].join('\n')
  const html = `
    <p>Neues Partner-Angebot für <strong>„${escapeHtml(opts.service)}“</strong> (PLZ ${escapeHtml(opts.postcode)})</p>
    <p>Partner: <strong>${escapeHtml(opts.companyName)}</strong></p>
    <p style="font-size:22px;font-weight:bold;color:#1B4332;margin:12px 0">${escapeHtml(formatEuro(opts.price))}</p>
    ${opts.message ? `<p style="white-space:pre-wrap">Nachricht an Kunde: ${escapeHtml(opts.message)}</p>` : ''}
    <p>${button(opts.adminUrl, 'Partner Angebote ansehen')}</p>`
  await sendMail(to, `Neues Partner-Angebot: ${opts.service} (${opts.postcode}) – ${opts.companyName}`, text, html)
}

export async function sendDecisionToPartner(opts: {
  to: string
  companyName: string
  service: string
  postcode: string
  accepted: boolean
  dashboardUrl: string
}) {
  const subject = opts.accepted
    ? `${SITE_NAME}: Ihr Angebot wurde angenommen`
    : `${SITE_NAME}: Ihr Angebot wurde abgelehnt`
  const body = opts.accepted
    ? `Der Kunde hat Ihr Angebot für „${opts.service}“ (PLZ ${opts.postcode}) angenommen. Die Kontaktdaten des Kunden finden Sie jetzt im Partnerbereich. Bitte melden Sie sich zeitnah beim Kunden.`
    : `Der Kunde hat Ihr Angebot für „${opts.service}“ (PLZ ${opts.postcode}) leider abgelehnt.`
  const text = [`Hallo ${opts.companyName},`, ``, body, ``, opts.dashboardUrl, ``, CAMPAIGN_TEXT].join('\n')
  const html = `
    <p>Hallo ${escapeHtml(opts.companyName)},</p>
    <p>${escapeHtml(body)}</p>
    <p>${button(opts.dashboardUrl, 'Zum Partnerbereich')}</p>
    <p>${escapeHtml(CAMPAIGN_TEXT)}</p>`
  await sendMail(opts.to, subject, text, html)
}
