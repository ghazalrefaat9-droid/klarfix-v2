import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { loadAdmin } from '@/lib/adminAuth'
import { CAMPAIGN_TEXT, SITE_NAME, sendMail } from '@/lib/mailer'
import {
  APPLICATION_LANGUAGES,
  APPLICATION_SERVICES,
  PRICE_MAX,
  PRICE_MIN,
  RADIUS_MAX,
  RADIUS_MIN,
  TEAM_MAX,
  TEAM_MIN,
  serviceLabel,
  type ApplicationPayload,
} from '@/lib/applications'

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const inRange = (v: unknown, min: number, max: number) =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max

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

  if (!Array.isArray(body.services)) return null
  const allowed = new Set<string>(APPLICATION_SERVICES.map((s) => s.key))
  const seen = new Set<string>()
  const services: ApplicationPayload['services'] = []
  for (const raw of body.services) {
    const item = raw as { key?: unknown; price?: unknown }
    if (typeof item?.key !== 'string' || !allowed.has(item.key) || seen.has(item.key)) return null
    if (!inRange(item.price, PRICE_MIN, PRICE_MAX)) return null
    seen.add(item.key)
    services.push({ key: item.key as ApplicationPayload['services'][number]['key'], price: item.price as number })
  }
  if (services.length === 0) return null

  if (!inRange(body.team_size, TEAM_MIN, TEAM_MAX) || !inRange(body.work_radius, RADIUS_MIN, RADIUS_MAX)) return null
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
    team_size: body.team_size as number,
    languages: [...new Set(languages)],
    work_radius: body.work_radius as number,
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
