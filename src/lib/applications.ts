export const CLEANING_TYPES = [
  { id: 'wohnung', label: 'Wohnungsreinigung', desc: 'Standardreinigung von Wohnräumen, Küche und Bad' },
  { id: 'haus', label: 'Hausreinigung', desc: 'Komplettreinigung für Ein- und Mehrfamilienhäuser' },
  { id: 'buero', label: 'Büroreinigung', desc: 'Reinigung von Büroräumen, Schreibtischen und Gemeinschaftsbereichen' },
  { id: 'fenster', label: 'Fensterreinigung', desc: 'Professionelle Reinigung von Fenstern, Glasflächen und Rahmen' },
  { id: 'teppich', label: 'Teppichreinigung', desc: 'Tiefenreinigung von Teppichen und Teppichböden' },
  { id: 'polster', label: 'Polsterreinigung', desc: 'Reinigung von Sofas, Sesseln und Polstermöbeln' },
  { id: 'praxis', label: 'Praxisreinigung', desc: 'Hygienereinigung für Arztpraxen nach Desinfektionsstandard' },
  { id: 'gewerbe', label: 'Gewerbereinigung', desc: 'Regelmäßige Reinigung für Büros, Praxen und Geschäftsräume' },
  { id: 'industrie', label: 'Industriereinigung', desc: 'Reinigung von Produktions- und Lagerhallen, Maschinen & Anlagen' },
  { id: 'grund', label: 'Grundreinigung', desc: 'Intensive Grundreinigung für starke Verschmutzungen und Erstpflege' },
  { id: 'bau', label: 'Bauendreinigung', desc: 'Reinigung nach Baumaßnahmen inkl. Staub- und Bauschuttabfuhr' },
  { id: 'treppenhaus', label: 'Treppenhausreinigung', desc: 'Regelmäßige Reinigung von Treppenhäusern und Gemeinschaftsflächen' },
  { id: 'entruempelung', label: 'Entrümpelung + Reinigung', desc: 'Entrümpelung von Räumen inkl. fachgerechter Entsorgung & Reinigung' },
  { id: 'umzug', label: 'Umzugsreinigung / Endreinigung', desc: 'Endreinigung bei Auszug inkl. Übergabereinigung nach Vermieterstandard' },
] as const

export type CleaningTypeId = (typeof CLEANING_TYPES)[number]['id']

export const DEFAULT_CLEANING_PRICES: Record<CleaningTypeId, number> = {
  wohnung: 28,
  haus: 32,
  buero: 22,
  fenster: 30,
  teppich: 35,
  polster: 33,
  praxis: 27,
  gewerbe: 24,
  industrie: 38,
  grund: 45,
  bau: 50,
  treppenhaus: 20,
  entruempelung: 55,
  umzug: 40,
}

export const APPLICATION_LANGUAGES = ['DE', 'EN', 'AR', 'TR', 'RU'] as const

export const CLEANING_PRICE_MIN = 15
export const CLEANING_PRICE_MAX = 80
export const RADIUS_MIN = 5
export const RADIUS_MAX = 50

export type ApplicationService = { key: string; price: number }

export type ApplicationPayload = {
  full_name: string
  email: string
  phone_fixed: string
  phone_whatsapp: string | null
  city: string
  company_address: string
  services: ApplicationService[]
  employee_count: number
  cleaning_prices: Record<CleaningTypeId, number>
  cleaning_types: CleaningTypeId[]
  team_size: number
  languages: string[]
  work_radius: number
  has_gewerbe: boolean
  has_haftpflicht: boolean
}

export type ApplicationRow = Omit<ApplicationPayload, 'employee_count' | 'cleaning_prices' | 'cleaning_types'> & {
  employee_count?: number | null
  cleaning_prices?: Record<CleaningTypeId, number> | null
  cleaning_types?: CleaningTypeId[] | null
  id: string
  status: string
  created_at: string
}

const LEGACY_SERVICE_LABELS: Record<string, string> = {
  wohnungen: 'Wohnungsreinigung',
  bueros: 'Büroreinigung',
  umzug: 'Umzugsreinigung',
  fenster: 'Fensterreinigung',
  tiefenreinigung: 'Tiefenreinigung',
  bauabschluss: 'Bauabschluss inkl. Maler & Fliesen',
}

export const serviceLabel = (key: string) =>
  CLEANING_TYPES.find((service) => service.id === key)?.label ?? LEGACY_SERVICE_LABELS[key] ?? key
