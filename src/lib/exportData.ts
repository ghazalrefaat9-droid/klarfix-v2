import ExcelJS from 'exceljs'
import { supabase } from '@/lib/supabaseServer'
import {
  EXPORT_CITIES,
  EXPORT_FORMATS,
  EXPORT_SERVICES,
  EXPORT_STATUSES,
  EXPORT_TYPES,
  type ExportFormat,
  type ExportType,
} from '@/lib/exportConstants'

// Data for /api/backup. Mapping to the real schema:
//   Bookings  = leads (website inquiries) + requests (customer jobs), normalised to one row shape
//   Customers = unique people from leads + requests (grouped by e-mail)
//   Partners  = partners, explicit column allow-list (never password_hash or tokens)

export type Section = 'bookings' | 'customers' | 'partners'
export type Row = Record<string, unknown>

export type ExportFilters = {
  type: ExportType
  format: ExportFormat
  city: string | null
  service: string | null
  status: string | null
  from: string | null
  to: string | null
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const PAGE_SIZE = 1000
const SENSITIVE_COLUMN = /(hash|token|password|secret)/i

const LEAD_COLUMNS =
  'id, created_at, status, service, service_label, anrede, name, vorname, nachname, firma, email, phone, postcode, address, strasse_hausnummer, area_sqm, flaeche_m2, zimmer_anzahl, preferred_date, preferred_time, is_flexible, message, deleted_at'
const REQUEST_COLUMNS =
  'id, created_at, status, service_type, customer_name, customer_email, customer_phone, postcode, city, customer_address, strasse_hausnummer, area_sqm, flaeche_m2, zimmer_anzahl, preferred_date, preferred_time, is_flexible, message, partner_id, partner_price, offer_sent_at, offer_responded_at, deleted_at'
const PARTNER_COLUMNS =
  'id, created_at, company_name, legal_form, first_name, last_name, email, phone, street, postcode, city, services, languages, availability, employee_count, experience_years, hourly_rate, has_liability_insurance, has_trade_license, website, verified, is_blocked, blocked_at, blocked_reason, deleted_at, deleted_reason, application_id'

const STATUS_DE: Record<string, string> = Object.fromEntries(
  Object.entries(EXPORT_STATUSES).flatMap(([label, codes]) => codes.map((c) => [c, label])),
)

function pick(value: string | null, allowed: readonly string[]): string | null | false {
  if (!value || value === 'all') return null
  return allowed.includes(value) ? value : false
}

export function parseFilters(params: URLSearchParams): ExportFilters | string {
  const type = params.get('type') ?? 'all'
  if (!(EXPORT_TYPES as readonly string[]).includes(type)) return 'Ungültiger Typ.'
  const format = params.get('format') ?? 'json'
  if (!(EXPORT_FORMATS as readonly string[]).includes(format)) return 'Ungültiges Format.'
  const city = pick(params.get('city'), EXPORT_CITIES)
  if (city === false) return 'Ungültige Stadt.'
  const service = pick(params.get('service'), Object.keys(EXPORT_SERVICES))
  if (service === false) return 'Ungültiger Service.'
  const status = pick(params.get('status'), Object.keys(EXPORT_STATUSES))
  if (status === false) return 'Ungültiger Status.'
  const from = params.get('from') || null
  const to = params.get('to') || null
  if (from && !DATE_RE.test(from)) return 'Ungültiges Von-Datum.'
  if (to && !DATE_RE.test(to)) return 'Ungültiges Bis-Datum.'
  if (from && to && from > to) return 'Von-Datum liegt nach Bis-Datum.'
  return { type: type as ExportType, format: format as ExportFormat, city, service, status, from, to }
}

export const sectionsFor = (type: ExportType): Section[] => (type === 'all' ? ['bookings', 'customers', 'partners'] : [type])

// Midnight in Europe/Berlin for a YYYY-MM-DD date, as UTC ISO string.
function berlinMidnight(date: string) {
  const utc = new Date(`${date}T00:00:00Z`)
  const name = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Berlin', timeZoneName: 'shortOffset' })
    .formatToParts(utc)
    .find((p) => p.type === 'timeZoneName')?.value
  const offsetHours = Number(/GMT([+-]\d+)/.exec(name ?? '')?.[1] ?? 0)
  return new Date(utc.getTime() - offsetHours * 3_600_000).toISOString()
}

function nextDay(date: string) {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

type Query = ReturnType<ReturnType<typeof supabase.from>['select']>

async function fetchAll(table: string, columns: string, apply: (q: Query) => Query): Promise<Row[]> {
  const rows: Row[] = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await apply(supabase.from(table).select(columns))
      .order('created_at', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    rows.push(...((data ?? []) as unknown as Row[]))
    if (!data || data.length < PAGE_SIZE) break
  }
  return rows
}

function dateFilter(q: Query, f: ExportFilters) {
  if (f.from) q = q.gte('created_at', berlinMidnight(f.from))
  if (f.to) q = q.lt('created_at', berlinMidnight(nextDay(f.to)))
  return q
}

const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
const cityFromAddress = (address: unknown) => text(/\b\d{5}\s+([^,\d]+)/.exec(String(address ?? ''))?.[1] ?? null)

async function loadBookings(f: ExportFilters, withStatus: boolean): Promise<Row[]> {
  const services = f.service ? EXPORT_SERVICES[f.service] : null
  const statuses = withStatus && f.status ? EXPORT_STATUSES[f.status] : null

  const [leads, requests] = await Promise.all([
    fetchAll('leads', LEAD_COLUMNS, (q) => {
      // leads have no city column; the city is part of the address ("Straße 1, 70173 Stuttgart").
      if (f.city) q = q.ilike('address', `%${f.city}%`)
      if (services) q = q.in('service', services)
      if (statuses) q = q.in('status', statuses)
      return dateFilter(q, f)
    }),
    fetchAll('requests', REQUEST_COLUMNS, (q) => {
      if (f.city) q = q.eq('city', f.city)
      if (services) q = q.in('service_type', services)
      if (statuses) q = q.in('status', statuses)
      return dateFilter(q, f)
    }),
  ])

  const fromLeads = leads.map((l) => ({
    quelle: 'Anfrage (leads)',
    id: l.id,
    erstellt_am: l.created_at,
    status: STATUS_DE[String(l.status)] ?? l.status,
    status_code: l.status,
    service: text(l.service_label) ?? l.service,
    kunde_name: text(l.name) ?? (text([l.vorname, l.nachname].filter(Boolean).join(' ')) || null),
    firma: l.firma,
    kunde_email: l.email,
    kunde_telefon: l.phone,
    plz: l.postcode,
    stadt: cityFromAddress(l.address),
    adresse: text(l.strasse_hausnummer) ?? l.address,
    flaeche_m2: l.flaeche_m2 ?? l.area_sqm,
    zimmer: l.zimmer_anzahl,
    wunschtermin: l.preferred_date,
    wunschzeit: l.preferred_time,
    flexibel: l.is_flexible,
    nachricht: l.message,
    partner_id: null,
    partner_preis: null,
    geloescht_am: l.deleted_at,
  }))
  const fromRequests = requests.map((r) => ({
    quelle: 'Auftrag (requests)',
    id: r.id,
    erstellt_am: r.created_at,
    status: STATUS_DE[String(r.status)] ?? r.status,
    status_code: r.status,
    service: r.service_type,
    kunde_name: r.customer_name,
    firma: null,
    kunde_email: r.customer_email,
    kunde_telefon: r.customer_phone,
    plz: r.postcode,
    stadt: r.city,
    adresse: text(r.strasse_hausnummer) ?? r.customer_address,
    flaeche_m2: r.flaeche_m2 ?? r.area_sqm,
    zimmer: r.zimmer_anzahl,
    wunschtermin: r.preferred_date,
    wunschzeit: r.preferred_time,
    flexibel: r.is_flexible,
    nachricht: r.message,
    partner_id: r.partner_id,
    partner_preis: r.partner_price,
    geloescht_am: r.deleted_at,
  }))
  return [...fromLeads, ...fromRequests].sort((a, b) => String(a.erstellt_am).localeCompare(String(b.erstellt_am)))
}

function toCustomers(bookings: Row[]): Row[] {
  const byKey = new Map<string, Row & { _services: Set<string> }>()
  for (const b of bookings) {
    const key = String(b.kunde_email ?? b.kunde_telefon ?? b.kunde_name ?? b.id).trim().toLowerCase()
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, {
        name: b.kunde_name,
        firma: b.firma,
        email: b.kunde_email,
        telefon: b.kunde_telefon,
        plz: b.plz,
        stadt: b.stadt,
        adresse: b.adresse,
        anzahl_anfragen: 1,
        services: null,
        erste_anfrage: b.erstellt_am,
        letzte_anfrage: b.erstellt_am,
        _services: new Set(b.service ? [String(b.service)] : []),
      })
      continue
    }
    existing.anzahl_anfragen = Number(existing.anzahl_anfragen) + 1
    existing.letzte_anfrage = b.erstellt_am
    for (const field of ['name', 'firma', 'telefon', 'plz', 'stadt', 'adresse'] as const) {
      const source = { name: b.kunde_name, firma: b.firma, telefon: b.kunde_telefon, plz: b.plz, stadt: b.stadt, adresse: b.adresse }[field]
      if (!existing[field] && source) existing[field] = source
    }
    if (b.service) existing._services.add(String(b.service))
  }
  return [...byKey.values()].map(({ _services, ...c }) => ({ ...c, services: [..._services].join(', ') || null }))
}

async function loadPartners(f: ExportFilters): Promise<Row[]> {
  const services = f.service ? EXPORT_SERVICES[f.service] : null
  const rows = await fetchAll('partners', PARTNER_COLUMNS, (q) => {
    if (f.city) q = q.eq('city', f.city)
    if (services) q = q.overlaps('services', services)
    return dateFilter(q, f)
  })
  return rows.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !SENSITIVE_COLUMN.test(k))))
}

export async function loadExport(f: ExportFilters): Promise<Partial<Record<Section, Row[]>>> {
  const sections = sectionsFor(f.type)
  const result: Partial<Record<Section, Row[]>> = {}
  if (sections.includes('bookings')) result.bookings = await loadBookings(f, true)
  // Booking status describes a job, not a person, so it is not applied to customers.
  if (sections.includes('customers')) result.customers = toCustomers(await loadBookings(f, false))
  if (sections.includes('partners')) result.partners = await loadPartners(f)
  return result
}

// ---- file formats ----

function cellValue(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) return null
  if (Array.isArray(value)) return value.map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return value as string | number | boolean
}

function columnsOf(rows: Row[], leading: string[] = []) {
  const set = new Set<string>(leading)
  for (const row of rows) for (const key of Object.keys(row)) set.add(key)
  return [...set]
}

function csvEscape(value: unknown) {
  const v = cellValue(value)
  if (v === null) return ''
  let s = String(v)
  // Neutralise spreadsheet formula injection (CSV injection).
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(data: Partial<Record<Section, Row[]>>) {
  const sections = Object.keys(data) as Section[]
  const multi = sections.length > 1
  const rows: Row[] = multi ? sections.flatMap((s) => data[s]!.map((r) => ({ tabelle: s, ...r }))) : data[sections[0]]!
  const cols = columnsOf(rows, multi ? ['tabelle'] : [])
  const lines = [cols.join(';'), ...rows.map((r) => cols.map((c) => csvEscape(r[c])).join(';'))]
  // BOM so German Excel shows umlauts correctly; ';' is Excel's default separator in de-DE.
  return '\uFEFF' + lines.join('\r\n')
}

export function toJson(data: Partial<Record<Section, Row[]>>) {
  const sections = Object.keys(data) as Section[]
  return JSON.stringify(sections.length > 1 ? data : data[sections[0]], null, 2)
}

const SHEET_NAMES: Record<Section, string> = { bookings: 'Buchungen', customers: 'Kunden', partners: 'Partner' }

export async function toXlsx(data: Partial<Record<Section, Row[]>>) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'KlarFix'
  wb.created = new Date()
  for (const section of Object.keys(data) as Section[]) {
    const rows = data[section]!
    const sheet = wb.addWorksheet(SHEET_NAMES[section])
    const cols = columnsOf(rows)
    if (cols.length === 0) {
      sheet.addRow(['Keine Daten für die gewählten Filter'])
      continue
    }
    sheet.columns = cols.map((c) => ({ header: c, key: c, width: Math.max(12, c.length + 4) }))
    for (const r of rows) sheet.addRow(Object.fromEntries(cols.map((c) => [c, cellValue(r[c])])))
    const header = sheet.getRow(1)
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B4332' } }
    sheet.views = [{ state: 'frozen', ySplit: 1 }]
  }
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer
}

export async function logExport(f: ExportFilters) {
  const { error } = await supabase
    .from('export_logs')
    .insert({ export_type: f.type, city: f.city, service: f.service, format: f.format })
  if (error) console.error('Export log failed:', error.message)
}
