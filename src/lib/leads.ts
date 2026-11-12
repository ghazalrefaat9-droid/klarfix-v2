export const ANREDEN = ['Herr', 'Frau', 'Divers', 'Firma', 'Keine Angabe'] as const

// The stored value stays German; these are only display labels.
export const ANREDE_LABELS: Record<(typeof ANREDEN)[number], { ar: string; en: string }> = {
  Herr: { ar: 'السيد', en: 'Mr' },
  Frau: { ar: 'السيدة', en: 'Ms' },
  Divers: { ar: 'آخر', en: 'Diverse' },
  Firma: { ar: 'شركة', en: 'Company' },
  'Keine Angabe': { ar: 'بدون تحديد', en: 'Not specified' },
}

// Only Herr/Frau are used as a name prefix; Firma puts the company name first.
export function buildFullName(anrede: string, vorname: string, nachname: string, firma: string) {
  const person = `${vorname} ${nachname}`.trim()
  if (anrede === 'Firma') return firma ? `${firma} (${person})` : person
  if (anrede === 'Herr' || anrede === 'Frau') return `${anrede} ${person}`.trim()
  return person
}

// Payload sent from /buchen to POST /api/leads (JSON)
export type LeadPayload = {
  anrede: string
  vorname: string
  nachname: string
  firma: string
  email: string
  phone: string
  strasseHausnummer: string
  postcode: string
  city: string
  floor: string
  serviceId: string
  otherService: string
  area: string
  rooms: string
  date: string
  time: string
  isFlexible: boolean
  message: string
  // Storage paths of photos the browser already uploaded to the private bucket
  photoPaths: string[]
}

export const ROOM_OPTIONS = ['1', '2', '3', '4', '5+'] as const
