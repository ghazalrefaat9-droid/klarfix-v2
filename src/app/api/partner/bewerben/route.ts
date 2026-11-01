import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { loadAdmin } from '@/lib/adminAuth'
import { CAMPAIGN_TEXT, SITE_NAME, sendMail } from '@/lib/mailer'
import {
  APPLICATION_LANGUAGES,
  CLEANING_PRICE_MAX,
  CLEANING_PRICE_MIN,
  CLEANING_TYPES,
  RADIUS_MAX,
  RADIUS_MIN,
  serviceLabel,
  type ApplicationPayload,
  type CleaningTypeId,
} from '@/lib/applications'

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const inRange = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const escapeHtml = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function parse(body: Record<string, unknown>): ApplicationPayload | null {
  const full_name = str(body.full_name)
  const email = str(body.email, 254).toLowerCase()
  const phone_fixed = str(body.phone_fixed, 40)
  const city = str(body.city, 100)
  const company_address = str(body.company_address, 300)
  if (!full_name || !phone_fixed || !city || !company_address) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null

  if (!inRange(body.employee_count, 1, 1000) || !inRange(body.work_radius, RADIUS_MIN, RADIUS_MAX)) return null
  if (!Array.isArray(body.cleaning_types)) return null
  const cleaning_types: CleaningTypeId[] = []
  for (const raw of body.cleaning_types) {
    if (typeof raw !== 'string') return null
    const type = CLEANING_TYPES.find((item) => item.id === raw)
    if (!type || cleaning_types.includes(type.id)) return null
    cleaning_types.push(type.id)
  }
  if (cleaning_types.length === 0) return null

  if (!isRecord(body.cleaning_prices)) return null
  const priceInput = body.cleaning_prices
  const cleaning_prices = {} as Record<CleaningTypeId, number>
  for (const type of CLEANING_TYPES) {
    const price = priceInput[type.id]
    if (!inRange(price, CLEANING_PRICE_MIN, CLEANING_PRICE_MAX)) return null
    cleaning_prices[type.id] = price
  }
  const services = cleaning_types.map((key) => ({ key, price: cleaning_prices[key] }))

  const languages = Array.isArray(body.languages)
    ? body.languages.filter((l): l is string => typeof l === 'string' && (APPLICATION_LANGUAGES as readonly string[]).includes(l))
    : []
  if (typeof body.has_gewerbe !== 'boolean' || typeof body.has_haftpflicht !== 'boolean') return null

  return {
    full_name,
    email,
    phone_fixed,
    phone_whatsapp: str(body.phone_whatsapp, 40) || null,
    city,
    company_address,
    services,
    employee_count: body.employee_count,
    cleaning_prices,
    cleaning_types,
    team_size: body.employee_count,
    languages: [...new Set(languages)],
    work_radius: body.work_radius,
    has_gewerbe: body.has_gewerbe,
    has_haftpflicht: body.has_haftpflicht,
  }
}

async function adminRecipient() {
  try {
    const admin = await loadAdmin()
    return admin.contactEmail || admin.email || process.env.ADMIN_EMAIL || ''
  } catch {
    return process.env.ADMIN_EMAIL ?? ''
  }
}

async function sendNotifications(a: ApplicationPayload) {
  const applicantText = [
    `Hallo ${a.full_name},`,
    ``,
    `Danke, dein Antrag bei ${SITE_NAME} Stuttgart ist eingegangen.`,
    `Wir prüfen deinen Antrag und melden uns. Nach Annahme fordern wir die Dokumente (Gewerbe & Haftpflicht) an.`,
    ``,
    `شكراً، تم استلام طلبك لدى ${SITE_NAME} شتوتغارت. سنراجع طلبك ونتواصل معك.`,
    ``,
    CAMPAIGN_TEXT,
  ].join('\n')
  const applicantHtml = `
    <p>Hallo ${escapeHtml(a.full_name)},</p>
    <p>Danke, dein Antrag bei ${SITE_NAME} Stuttgart ist eingegangen.</p>
    <p>Wir prüfen deinen Antrag und melden uns. Nach Annahme fordern wir die Dokumente (Gewerbe &amp; Haftpflicht) an.</p>
    <p dir="rtl">شكراً، تم استلام طلبك لدى ${SITE_NAME} شتوتغارت. سنراجع طلبك ونتواصل معك.</p>
    <p>${escapeHtml(CAMPAIGN_TEXT)}</p>`

  const serviceLines = a.services.map((s) => `${serviceLabel(s.key)}: ${s.price} €`)
  const adminText = [
    `Neuer Partner-Antrag: ${a.full_name}`,
    ``,
    `E-Mail: ${a.email}`,
    `Telefon: ${a.phone_fixed}`,
    `WhatsApp: ${a.phone_whatsapp ?? '-'}`,
    `Adresse: ${a.company_address}, ${a.city}`,
    `Mitarbeiter: ${a.employee_count}`,
    `Leistungen: ${serviceLines.join('; ')}`,
    `Team: ${a.team_size} | Radius: ${a.work_radius} km | Sprachen: ${a.languages.join(', ') || '-'}`,
    `Gewerbe: ${a.has_gewerbe ? 'Ja' : 'Nein'} | Haftpflicht: ${a.has_haftpflicht ? 'Ja' : 'Nein'}`,
  ].join('\n')
  const adminHtml = `<pre style="font-family:inherit;white-space:pre-wrap">${escapeHtml(adminText)}</pre>`

  const adminTo = await adminRecipient()
  const jobs: Promise<void>[] = [
    sendMail(a.email, `${SITE_NAME}: Dein Partner-Antrag ist eingegangen`, applicantText, applicantHtml),
  ]
  if (adminTo) jobs.push(sendMail(adminTo, `Neuer Partner-Antrag: ${a.full_name}`, adminText, adminHtml))
  const results = await Promise.allSettled(jobs)
  results.forEach((r) => {
    if (r.status === 'rejected') console.error('Application email failed', r.reason)
  })
  return results.every((r) => r.status === 'fulfilled')
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const application = body ? parse(body) : null
  if (!application) {
    return NextResponse.json({ error: 'Bitte alle Pflichtfelder korrekt ausfüllen.' }, { status: 400 })
  }

  const { error } = await supabase.from('partner_applications').insert({ ...application, status: 'pending_review' })
  if (error) {
    console.error('partner_applications insert failed', error.message)
    return NextResponse.json({ error: 'Antrag konnte nicht gespeichert werden.' }, { status: 500 })
  }

  const emailSent = await sendNotifications(application)
  return NextResponse.json({ ok: true, emailSent })
}
