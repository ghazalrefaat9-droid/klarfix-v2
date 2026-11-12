import { after, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseServer'
import { LEADS_TABLE } from '@/lib/supabase'
import { loadAdmin } from '@/lib/adminAuth'
import { sendMail } from '@/lib/mailer'
import { sendWhatsApp } from '@/lib/whatsapp'
import { REINIGUNGSARTEN } from '@/lib/services'
import { ANREDEN, ROOM_OPTIONS, buildFullName } from '@/lib/leads'
import { cityFromAddress } from '@/lib/requests'
import { cleanPhotoPaths, deleteExpiredLeadPhotos, signLeadPhotos } from '@/lib/leadPhotosServer'

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

const AREA_MIN = 20
const AREA_MAX = 5000

type Lead = {
  fullName: string
  anrede: string | null
  vorname: string
  nachname: string
  firma: string | null
  email: string
  phone: string | null
  strasseHausnummer: string
  floor: string | null
  address: string
  postcode: string
  city: string | null
  serviceLabel: string
  areaSqm: number | null
  rooms: string | null
  date: string | null
  time: string | null
  isFlexible: boolean
  message: string
  photoPaths: string[]
  photos: { path: string; url: string }[]
}

function parse(body: Record<string, unknown>): Lead | null {
  const anrede = str(body.anrede, 20)
  if (!(ANREDEN as readonly string[]).includes(anrede)) return null
  const vorname = str(body.vorname, 100)
  const nachname = str(body.nachname, 100)
  const firma = anrede === 'Firma' ? str(body.firma, 200) : ''
  const email = str(body.email, 254).toLowerCase()
  const strasseHausnummer = str(body.strasseHausnummer, 200)
  const postcode = str(body.postcode, 10)
  const city = str(body.city, 100)
  const floor = str(body.floor, 100)
  if (!vorname || !nachname || !strasseHausnummer || !postcode) return null
  if (!/\d/.test(strasseHausnummer)) return null
  if (anrede === 'Firma' && !firma) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null

  const service = REINIGUNGSARTEN.find((r) => r.id === body.serviceId)
  if (!service) return null
  const otherService = service.id === 'sonstiges' ? str(body.otherService, 1000) : ''
  if (service.id === 'sonstiges' && !otherService) return null

  const areaNum = Number(str(body.area, 10))
  const areaSqm =
    Number.isInteger(areaNum) && areaNum >= AREA_MIN && areaNum <= AREA_MAX ? areaNum : null
  const roomsRaw = str(body.rooms, 5)
  const rooms = (ROOM_OPTIONS as readonly string[]).includes(roomsRaw) ? roomsRaw : null
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

  // Floor before "PLZ Ort", which has to stay last so cityFromAddress() keeps working.
  const address = [strasseHausnummer, floor, [postcode, city].filter(Boolean).join(' ')].filter(Boolean).join(', ')

  return {
    fullName: buildFullName(anrede, vorname, nachname, firma),
    anrede: anrede === 'Keine Angabe' ? null : anrede,
    vorname,
    nachname,
    firma: firma || null,
    email,
    phone: str(body.phone, 40) || null,
    strasseHausnummer,
    floor: floor || null,
    address,
    postcode,
    city: city || cityFromAddress(address),
    serviceLabel: service.label,
    areaSqm,
    rooms,
    date,
    time,
    isFlexible,
    message,
    photoPaths: cleanPhotoPaths(body.photoPaths),
    photos: [],
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

// "Zimmer:" and "Foto N:" lines are parsed again by parseMessage() (lib/requests.ts) for the partner view,
// so partners also see them when the booking columns don't exist yet.
const storedMessage = (l: Lead) =>
  [l.rooms ? `Zimmer: ${l.rooms}` : '', l.message, ...l.photos.map((p, i) => `Foto ${i + 1}: ${p.url}`)]
    .filter(Boolean)
    .join('\n')

function notificationText(l: Lead, withPhotoLinks = true) {
  const when = [l.date ?? 'kein Datum', l.isFlexible ? 'flexibel' : l.time].filter(Boolean).join(' ')
  const photos = withPhotoLinks ? l.photos.map((p, i) => `Foto ${i + 1}: ${p.url}`) : []
  return [
    `Neue Anfrage: ${l.serviceLabel}`,
    '',
    `Name: ${l.fullName}`,
    `Telefon: ${l.phone ?? '-'}`,
    `E-Mail: ${l.email}`,
    `Straße und Hausnummer: ${l.strasseHausnummer}`,
    `PLZ / Ort: ${[l.postcode, l.city].filter(Boolean).join(' ')}`,
    ...(l.floor ? [`Stockwerk / Wohnung: ${l.floor}`] : []),
    `Fläche: ${l.areaSqm ? `${l.areaSqm} m²` : '-'}`,
    `Zimmer: ${l.rooms ?? '-'}`,
    `Termin: ${when}`,
    `Fotos: ${l.photos.length || 'keine'}${!withPhotoLinks && l.photos.length ? ' (Links in der E-Mail)' : ''}`,
    ...photos,
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
    jobs.push(sendWhatsApp(`KlarFix 🧹 ${notificationText(l, false)}`.slice(0, 1500)))
  }

  const results = await Promise.allSettled(jobs)
  results.forEach((r) => {
    if (r.status === 'rejected') console.error('Lead notification failed', r.reason)
  })
}

const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000
let lastCleanup = 0

// Backup for the daily cron (/api/cron/lead-photos): expired photos are also removed when new requests come in.
async function cleanupPhotos() {
  if (Date.now() - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = Date.now()
  await deleteExpiredLeadPhotos().catch((err) => console.error('Lead photo cleanup failed', err))
}

// Columns from add_booking_details.sql; dropped again if that migration hasn't run yet.
const BOOKING_COLUMNS = ['strasse_hausnummer', 'flaeche_m2', 'zimmer_anzahl', 'fotos']
// Columns from request_offers.sql (older migration).
const OFFER_COLUMNS = ['customer_address', 'city', 'preferred_date', 'preferred_time', 'is_flexible']

async function insertWithFallback(table: string, row: Record<string, unknown>, optional: string[][]) {
  let result = await supabase.from(table).insert(row)
  for (const columns of optional) {
    if (result.error?.code !== 'PGRST204') break
    for (const key of columns) delete row[key]
    result = await supabase.from(table).insert(row)
  }
  return result
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (rateLimited(ip)) {
    return NextResponse.json({ error: 'Zu viele Anfragen. Bitte später erneut versuchen.' }, { status: 429 })
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const lead = body && typeof body === 'object' ? parse(body) : null
  if (!lead) {
    return NextResponse.json({ error: 'Bitte alle Pflichtfelder korrekt ausfüllen.' }, { status: 400 })
  }

  lead.photos = await signLeadPhotos(lead.photoPaths).catch((err) => {
    console.error('Lead photo signing failed', err)
    return []
  })
  const message = storedMessage(lead)
  const booking = {
    strasse_hausnummer: lead.strasseHausnummer,
    flaeche_m2: lead.areaSqm,
    zimmer_anzahl: lead.rooms,
    fotos: lead.photos.map((p) => p.path),
  }

  // Leads table for lead tracking; requests table keeps the admin/partner dashboards working.
  const requestData: Record<string, unknown> = {
    customer_name: lead.fullName,
    customer_email: lead.email,
    customer_phone: lead.phone,
    postcode: lead.postcode,
    service_type: lead.serviceLabel,
    area_sqm: lead.areaSqm,
    message: [`Adresse: ${lead.address}`, message].filter(Boolean).join('\n'),
    status: 'new',
    // Structured copies so partners can see date/time/city without the private address (see lib/requests.ts).
    customer_address: lead.address,
    city: lead.city,
    preferred_date: lead.date,
    preferred_time: lead.time,
    is_flexible: lead.isFlexible,
    ...booking,
  }

  const leadData: Record<string, unknown> = {
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
    message: message || null,
    ...booking,
  }

  const [leadResult, requestResult] = await Promise.all([
    insertWithFallback(LEADS_TABLE, leadData, [BOOKING_COLUMNS]),
    insertWithFallback('requests', requestData, [BOOKING_COLUMNS, OFFER_COLUMNS]),
  ])

  if (leadResult.error) console.error('Lead insert failed:', leadResult.error.message)
  if (requestResult.error) console.error('Request insert failed:', requestResult.error.message)

  if (leadResult.error && requestResult.error) {
    return NextResponse.json({ error: 'Anfrage konnte nicht gespeichert werden.' }, { status: 500 })
  }

  // Runs after the response is sent, so the customer doesn't wait for email/WhatsApp.
  after(() => Promise.all([notifyAdmin(lead), cleanupPhotos()]))

  return NextResponse.json({ ok: true })
}
