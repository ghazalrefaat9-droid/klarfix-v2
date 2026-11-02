export const ANREDEN = ['Herr', 'Frau', 'Divers', 'Firma', 'Keine Angabe'] as const

// Only Herr/Frau are used as a name prefix; Firma puts the company name first.
export function buildFullName(anrede: string, vorname: string, nachname: string, firma: string) {
  const person = `${vorname} ${nachname}`.trim()
  if (anrede === 'Firma') return firma ? `${firma} (${person})` : person
  if (anrede === 'Herr' || anrede === 'Frau') return `${anrede} ${person}`.trim()
  return person
}

// Payload sent from /buchen to POST /api/leads
export type LeadPayload = {
  anrede: string
  vorname: string
  nachname: string
  firma: string
  email: string
  phone: string
  address: string
  postcode: string
  serviceId: string
  otherService: string
  area: string
  date: string
  time: string
  isFlexible: boolean
  message: string
}
