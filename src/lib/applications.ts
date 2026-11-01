export const APPLICATION_SERVICES = [
  { key: 'wohnungen', de: 'Wohnungsreinigung', ar: 'تنظيف منازل' },
  { key: 'bueros', de: 'Büroreinigung', ar: 'تنظيف مكاتب' },
  { key: 'umzug', de: 'Umzugsreinigung', ar: 'انتقال' },
  { key: 'fenster', de: 'Fensterreinigung', ar: 'نوافذ' },
  { key: 'tiefenreinigung', de: 'Tiefenreinigung', ar: 'عميق' },
  { key: 'bauabschluss', de: 'Bauabschluss inkl. Maler & Fliesen', ar: 'بعد تشطيب ودهان وتبليط' },
] as const

export const APPLICATION_LANGUAGES = ['DE', 'EN', 'AR', 'TR', 'RU'] as const

export const PRICE_MIN = 20
export const PRICE_MAX = 60
export const RADIUS_MIN = 5
export const RADIUS_MAX = 50
export const TEAM_MIN = 1
export const TEAM_MAX = 10

export type ApplicationService = { key: (typeof APPLICATION_SERVICES)[number]['key']; price: number }

export type ApplicationPayload = {
  full_name: string
  email: string
  phone_fixed: string
  phone_whatsapp: string | null
  city: string
  company_address: string
  services: ApplicationService[]
  team_size: number
  languages: string[]
  work_radius: number
  has_gewerbe: boolean
  has_haftpflicht: boolean
}

export type ApplicationRow = ApplicationPayload & {
  id: string
  status: string
  created_at: string
}

export const serviceLabel = (key: string) => APPLICATION_SERVICES.find((s) => s.key === key)?.de ?? key
