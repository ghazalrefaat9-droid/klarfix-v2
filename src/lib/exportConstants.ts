// Shared by the export PIN gate, the Export Center UI and the /api/backup + /api/check-pin routes.

export const EXPORT_CITIES = ['Stuttgart', 'Freiburg', 'Ludwigsburg', 'Esslingen'] as const

// Filter label → service names actually stored in leads.service / requests.service_type / partners.services.
export const EXPORT_SERVICES: Record<string, string[]> = {
  Büroreinigung: ['Büroreinigung'],
  Fensterreinigung: ['Fensterreinigung'],
  Haushaltsreinigung: ['Haushaltsreinigung', 'Hausreinigung', 'Wohnungsreinigung'],
  Grundreinigung: ['Grundreinigung'],
  Praxisreinigung: ['Praxisreinigung'],
}

// Filter label → status codes stored in leads.status / requests.status (see lib/requests.ts).
export const EXPORT_STATUSES: Record<string, string[]> = {
  neu: ['new'],
  erledigt: ['done'],
  storniert: ['offer_rejected'],
  'in Bearbeitung': ['assigned', 'offer_sent', 'offer_accepted'],
}

export const EXPORT_TYPES = ['all', 'bookings', 'customers', 'partners'] as const
export const EXPORT_FORMATS = ['xlsx', 'csv', 'json'] as const
export type ExportType = (typeof EXPORT_TYPES)[number]
export type ExportFormat = (typeof EXPORT_FORMATS)[number]

export const PIN_REGEX = /^\d{4}$/
export const PIN_MAX_ATTEMPTS = 3
export const PIN_LOCK_MINUTES = 5
export const EXPORT_SESSION_SECONDS = 15 * 60

// sessionStorage keys (UI state only – the server enforces access with the httpOnly kf_export cookie).
export const SS_EXPORT_UNTIL = 'kf_export_until'
export const SS_PIN_LOCK_UNTIL = 'kf_pin_lock_until'
