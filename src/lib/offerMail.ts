import { CAMPAIGN_TEXT, SITE_NAME, sendMail } from '@/lib/mailer'
import { formatEuro } from '@/lib/requests'

const escapeHtml = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const button = (href: string, label: string) =>
  `<a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 20px;background:#1B4332;color:#FAF3EB;text-decoration:none;border-radius:8px;font-weight:bold">${escapeHtml(label)}</a>`

// Offer email to the customer: partner company name, price and message. Phone/email of the partner stay hidden;
// the customer accepts or rejects on the /angebot page.
export async function sendOfferEmail(opts: {
  to: string
  customerName: string | null
  companyName: string | null
  service: string
  price: number
  message: string | null
  offerUrl: string
}) {
  const greeting = opts.customerName ? `Guten Tag ${opts.customerName},` : 'Guten Tag,'
  const from = opts.companyName ? ` von ${opts.companyName}` : ''
  const text = [
    greeting,
    ``,
    `Sie haben ein Angebot${from} für Ihre Anfrage „${opts.service}“ erhalten:`,
    ``,
    ...(opts.companyName ? [`Partner: ${opts.companyName}`] : []),
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
    <p>Sie haben ein Angebot${escapeHtml(from)} für Ihre Anfrage <strong>„${escapeHtml(opts.service)}“</strong> erhalten:</p>
    ${opts.companyName ? `<p style="margin:12px 0 0;color:#1B4332">Partner: <strong>${escapeHtml(opts.companyName)}</strong></p>` : ''}
    <p style="font-size:22px;font-weight:bold;color:#1B4332;margin:12px 0">${escapeHtml(formatEuro(opts.price))}</p>
    ${opts.message ? `<p style="white-space:pre-wrap">${escapeHtml(opts.message)}</p>` : ''}
    <p>${button(opts.offerUrl, 'Angebot ansehen')}</p>
    <p style="font-size:13px;opacity:.75">Über den Link können Sie das Angebot annehmen oder ablehnen.</p>
    <p>${escapeHtml(CAMPAIGN_TEXT)}</p>`
  await sendMail(opts.to, `Neues Angebot für Ihre Reinigung - ${SITE_NAME}`, text, html)
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
