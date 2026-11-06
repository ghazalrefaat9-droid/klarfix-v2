import { after, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseServer'
import { LEADS_TABLE } from '@/lib/supabase'
import { loadAdmin } from '@/lib/adminAuth'
import { sendMail } from '@/lib/mailer'
import { sendWhatsApp } from '@/lib/whatsapp'
import { REINIGUNGSARTEN } from '@/lib/services'
import { ANREDEN, buildFullName } from '@/lib/leads'

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

const escapeHtml = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Best-effort per-instance limit so the form can't be used to flood the admin with notifications.
const RATE_LIMIT = 5
const RATE_WINDOW_MS = 10 * 60 * 1000
const hits = new Map<string, number[]>()

function rateLimited(ip: string) {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  recent.push(now)
  hits.set(ip, recent)
  if (hits.size > 5000) hits.clear()
  return recent.length > RATE_LIMIT
}

type Lead = {
  fullName: string
  anrede: string | null
  vorname: string
  nachname: string
  firma: string | null
  email: string
  phone: string | null
  address: string
  postcode: string
  serviceLabel: string
  areaSqm: number | null
  date: string | null
  time: string | null
  isFlexible: boolean
  message: string
}

function parse(body: Record<string, unknown>): Lead | null {
  const anrede = str(body.anrede, 20)
  if (!(ANREDEN as readonly string[]).includes(anrede)) return null
  const vorname = str(body.vorname, 100)
  const nachname = str(body.nachname, 100)
  const firma = anrede === 'Firma' ? str(body.firma, 200) : ''
  const email = str(body.email, 254).toLowerCase()
  const address = str(body.address, 300)
  const postcode = str(body.postcode, 10)
  if (!vorname || !nachname || !address || !postcode) return null
  if (anrede === 'Firma' && !firma) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null

  const service = REINIGUNGSARTEN.find((r) => r.id === body.serviceId)
  if (!service) return null
  const otherService = service.id === 'sonstiges' ? str(body.otherService, 1000) : ''
  if (service.id === 'sonstiges' && !otherService) return null

  const areaNum = Number(str(body.area, 10))
  const areaSqm = Number.isFinite(areaNum) && areaNum > 0 ? Math.min(Math.round(areaNum), 1_000_000) : null
  const dateRaw = str(body.date, 10)
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : null
  const isFlexible = body.isFlexible === true
  const timeRaw = str(body.time, 5)
  const time = !isFlexible && /^\d{2}:\d{2}$/.test(timeRaw) ? timeRaw : null
  const timeText = isFlexible ? 'flexibel (ganztägig / Uhrzeit egal)' : time

  const message = [
    otherService ? `Sonstiges: ${otherService}` : '',
    date ? `Wunschtermin: ${date}` : '',
    timeText ? `Uhrzeit: ${timeText}` : '',
    str(body.message, 2000),
  ]
    .filter(Boolean)
    .join('\n')

  return {
    fullName: buildFullName(anrede, vorname, nachname, firma),
    anrede: anrede === 'Keine Angabe' ? null : anrede,
    vorname,
    nachname,
    firma: firma || null,
    email,
    phone: str(body.phone, 40) || null,
    address,
    postcode,
    serviceLabel: service.label,
    areaSqm,
    date,
    time,
    isFlexible,
    message,
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

function notificationText(l: Lead) {
  const when = [l.date ?? 'kein Datum', l.isFlexible ? 'flexibel' : l.time].filter(Boolean).join(' ')
  return [
    `Neue Anfrage: ${l.serviceLabel}`,
    '',
    `Name: ${l.fullName}`,
    `Telefon: ${l.phone ?? '-'}`,
    `E-Mail: ${l.email}`,
    `Adresse: ${l.address}, ${l.postcode}`,
    `Fläche: ${l.areaSqm ? `${l.areaSqm} m²` : '-'}`,
    `Termin: ${when}`,
    ...(l.message ? ['', l.message] : []),
  ].join('\n')
}

async function notifyAdmin(l: Lead) {
  const text = notificationText(l)
  const jobs: Promise<void>[] = []

  const adminTo = await adminRecipient()
  if (adminTo) {
    jobs.push(
      sendMail(
        adminTo,
        `Neue Anfrage: ${l.serviceLabel} – ${l.fullName} (${l.postcode})`,
        text,
        `<pre style="font-family:inherit;white-space:pre-wrap">${escapeHtml(text)}</pre>`,
      ),
    )
  }
  if (process.env.CALLMEBOT_APIKEY && process.env.ADMIN_WHATSAPP_NUMBER) {
    jobs.push(sendWhatsApp(`KlarFix 🧹 ${text}`.slice(0, 1500)))
  }

  const results = await Promise.allSettled(jobs)
  results.forEach((r) => {
    if (r.status === 'rejected') console.error('Lead notification failed', r.reason)
  })
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (rateLimited(ip)) {
    return NextResponse.json({ error: 'Zu viele Anfragen. Bitte später erneut versuchen.' }, { status: 429 })
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const lead = body ? parse(body) : null
  if (!lead) {
    return NextResponse.json({ error: 'Bitte alle Pflichtfelder korrekt ausfüllen.' }, { status: 400 })
  }

  // Leads table for lead tracking; requests table keeps the admin/partner dashboards working.
  const [leadResult, requestResult] = await Promise.all([
    supabase.from(LEADS_TABLE).insert({
      name: lead.fullName,
      anrede: lead.anrede,
      vorname: lead.vorname,
      nachname: lead.nachname,
      firma: lead.firma,
      email: lead.email,
      phone: lead.phone,
      address: lead.address,
      postcode: lead.postcode,
      service: lead.serviceLabel,
      service_label: lead.serviceLabel,
      area_sqm: lead.areaSqm,
      preferred_date: lead.date,
      preferred_time: lead.time,
      is_flexible: lead.isFlexible,
      message: lead.message || null,
    }),
    supabase.from('requests').insert({
      customer_name: lead.fullName,
      customer_email: lead.email,
      customer_phone: lead.phone,
      postcode: lead.postcode,
      service_type: lead.serviceLabel,
      area_sqm: lead.areaSqm,
      message: [`Adresse: ${lead.address}`, lead.message].filter(Boolean).join('\n'),
      status: 'new',
    }),
  ])

  if (leadResult.error) console.error('Lead insert failed:', leadResult.error.message)
  if (requestResult.error) console.error('Request insert failed:', requestResult.error.message)

  if (leadResult.error && requestResult.error) {
    return NextResponse.json({ error: 'Anfrage konnte nicht gespeichert werden.' }, { status: 500 })
  }

  // Runs after the response is sent, so the customer doesn't wait for email/WhatsApp.
  after(() => notifyAdmin(lead))

  return NextResponse.json({ ok: true })
}
