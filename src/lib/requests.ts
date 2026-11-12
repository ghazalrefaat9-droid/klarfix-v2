// Server-only helpers for customer requests ("requests" table) and the partner offer flow.
// Privacy rule: partners only get customer contact data (name, email, phone, street address)
// after the customer accepted their offer. The partner view is built field by field, never by spreading the row.

export type RequestStatus = 'new' | 'assigned' | 'offer_sent' | 'offer_accepted' | 'offer_rejected' | 'done'

// Statuses in which a request is open for offers.
export const OPEN_STATUSES: RequestStatus[] = ['new', 'offer_rejected']
// Statuses in which the assigned partner may see the customer's contact data.
// "assigned" = assigned manually by the admin (legacy flow), which is an explicit admin decision.
export const REVEAL_STATUSES: RequestStatus[] = ['offer_accepted', 'done', 'assigned']
export const PARTNER_OWN_STATUSES: RequestStatus[] = ['offer_sent', 'offer_accepted', 'done', 'assigned']

export const REQUEST_COLUMNS =
  'id, customer_name, customer_email, customer_phone, customer_address, postcode, city, service_type, area_sqm, message, preferred_date, preferred_time, is_flexible, status, partner_id, partner_price, partner_message, offer_sent_at, offer_responded_at, rejected_partner_ids, created_at'

export type RequestRow = {
  id: string
  customer_name: string | null
  customer_email: string
  customer_phone: string | null
  customer_address: string | null
  postcode: string
  city: string | null
  service_type: string
  area_sqm: number | null
  message: string | null
  preferred_date: string | null
  preferred_time: string | null
  is_flexible: boolean | null
  status: RequestStatus
  partner_id: string | null
  partner_price: number | null
  partner_message: string | null
  offer_sent_at: string | null
  offer_responded_at: string | null
  rejected_partner_ids: string[] | null
  created_at: string
}

export type PartnerRequestView = {
  id: string
  service_type: string
  area_sqm: number | null
  postcode: string
  city: string | null
  preferred_date: string | null
  preferred_time: string | null
  is_flexible: boolean
  note: string | null
  status: RequestStatus
  created_at: string
  offer: { price: number; message: string | null; sent_at: string | null } | null
  customer: { name: string | null; email: string; phone: string | null; address: string | null } | null
}

const LINE_PREFIX = /^(Adresse|Wunschtermin|Uhrzeit):\s*(.*)$/i
// Private photo links (see /api/leads) are only for the admin, never shown to partners or in the offer view.
const PHOTO_LINE = /^Foto \d+:\s*https?:\/\//i

// Older rows only have the address/date/time inside the free-text message ("Adresse: …\nWunschtermin: …").
export function parseMessage(message: string | null) {
  const fields: { address: string | null; date: string | null; time: string | null } = { address: null, date: null, time: null }
  const rest: string[] = []
  for (const line of (message ?? '').split('\n')) {
    if (PHOTO_LINE.test(line.trim())) continue
    const m = LINE_PREFIX.exec(line.trim())
    if (!m) {
      rest.push(line)
      continue
    }
    const key = m[1].toLowerCase()
    if (key === 'adresse') fields.address = m[2] || null
    else if (key === 'wunschtermin') fields.date = m[2] || null
    else fields.time = m[2] || null
  }
  return { ...fields, note: rest.join('\n').trim() || null }
}

// Removes contact data a customer may have typed into the free-text message.
export function redactContact(text: string) {
  return text
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, '***')
    .replace(/\+?\d[\d\s/().-]{6,}\d/g, (match) => ((match.match(/\d/g)?.length ?? 0) >= 9 ? '***' : match))
}

export function cityFromAddress(address: string | null | undefined) {
  const m = /\b\d{5}\s+([^,\d][^,]*)/.exec(address ?? '')
  return m ? m[1].trim().slice(0, 100) : null
}

// --- Region matching: a partner only sees open requests from his own region (enforced in the API). ---

export type Location = { postcode: string | null; city: string | null }

const normalizeCity = (city: string | null | undefined) =>
  (city ?? '')
    .replace(/\b\d{5}\b/g, '')
    .toLocaleLowerCase('de-DE')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ae/g, 'a')
    .replace(/oe/g, 'o')
    .replace(/ue/g, 'u')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const postcodeArea = (postcode: string | null | undefined) => /\b(\d{5})\b/.exec(postcode ?? '')?.[1].slice(0, 2) ?? null

// Postcode and city of a request; older rows only have the city inside the address/message.
export function requestLocation(row: Pick<RequestRow, 'postcode' | 'city' | 'customer_address' | 'message'>): Location {
  return {
    postcode: row.postcode ?? null,
    city: row.city ?? cityFromAddress(row.customer_address ?? parseMessage(row.message).address),
  }
}

// Match = same city (umlauts / case ignored) OR same first two postcode digits (70xxx = 70xxx).
// A partner without postcode and city matches nothing.
export function inPartnerRegion(partner: Location, request: Location) {
  const partnerCity = normalizeCity(partner.city)
  if (partnerCity && partnerCity === normalizeCity(request.city)) return true
  const partnerArea = postcodeArea(partner.postcode)
  return !!partnerArea && partnerArea === postcodeArea(request.postcode)
}

export function toPartnerView(row: RequestRow, partnerId: string): PartnerRequestView {
  const parsed = parseMessage(row.message)
  const isMine = row.partner_id === partnerId
  const reveal = isMine && REVEAL_STATUSES.includes(row.status)
  const address = row.customer_address ?? parsed.address

  return {
    id: row.id,
    service_type: row.service_type,
    area_sqm: row.area_sqm,
    postcode: row.postcode,
    city: row.city ?? cityFromAddress(address),
    preferred_date: row.preferred_date ?? parsed.date,
    preferred_time: row.is_flexible ? null : (row.preferred_time ?? parsed.time),
    is_flexible: row.is_flexible === true || /flexibel/i.test(parsed.time ?? ''),
    // Before the customer accepted, contact data typed into the message is masked too.
    note: parsed.note ? (reveal ? parsed.note : redactContact(parsed.note)) : null,
    // Other partners' offer history (e.g. "offer_rejected") is not shown; for them the request is simply open.
    status: isMine ? row.status : 'new',
    created_at: row.created_at,
    offer:
      isMine && row.partner_price !== null
        ? { price: Number(row.partner_price), message: row.partner_message, sent_at: row.offer_sent_at }
        : null,
    customer: reveal
      ? { name: row.customer_name, email: row.customer_email, phone: row.customer_phone, address }
      : null,
  }
}

export const MAX_OFFER_PRICE = 100000
export const MAX_OFFER_MESSAGE = 500

export function parseOffer(body: { price?: unknown; message?: unknown }) {
  const price = typeof body.price === 'number' ? body.price : Number(String(body.price ?? '').replace(',', '.'))
  if (!Number.isFinite(price) || price <= 0 || price > MAX_OFFER_PRICE) return null
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, MAX_OFFER_MESSAGE) : ''
  return { price: Math.round(price * 100) / 100, message: message || null }
}

export const formatEuro = (value: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value)
