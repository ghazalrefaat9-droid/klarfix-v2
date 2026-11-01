// label/desc are German (default language, also used in admin emails); *Ar/*En are shown when the visitor switches language.
export const CLEANING_TYPES = [
  {
    id: 'wohnung',
    label: 'Wohnungsreinigung',
    desc: 'Standardreinigung von Wohnräumen, Küche und Bad',
    labelAr: 'تنظيف الشقق',
    descAr: 'تنظيف عادي لغرف المعيشة والمطبخ والحمام',
    labelEn: 'Apartment cleaning',
    descEn: 'Standard cleaning of living rooms, kitchen and bathroom',
  },
  {
    id: 'haus',
    label: 'Hausreinigung',
    desc: 'Komplettreinigung für Ein- und Mehrfamilienhäuser',
    labelAr: 'تنظيف المنازل',
    descAr: 'تنظيف شامل للمنازل الفردية ومنازل العائلات المتعددة',
    labelEn: 'House cleaning',
    descEn: 'Complete cleaning for single- and multi-family houses',
  },
  {
    id: 'buero',
    label: 'Büroreinigung',
    desc: 'Reinigung von Büroräumen, Schreibtischen und Gemeinschaftsbereichen',
    labelAr: 'تنظيف المكاتب',
    descAr: 'تنظيف المكاتب والطاولات والمساحات المشتركة',
    labelEn: 'Office cleaning',
    descEn: 'Cleaning of offices, desks and shared areas',
  },
  {
    id: 'fenster',
    label: 'Fensterreinigung',
    desc: 'Professionelle Reinigung von Fenstern, Glasflächen und Rahmen',
    labelAr: 'تنظيف النوافذ',
    descAr: 'تنظيف احترافي للنوافذ والأسطح الزجاجية والإطارات',
    labelEn: 'Window cleaning',
    descEn: 'Professional cleaning of windows, glass surfaces and frames',
  },
  {
    id: 'teppich',
    label: 'Teppichreinigung',
    desc: 'Tiefenreinigung von Teppichen und Teppichböden',
    labelAr: 'تنظيف السجاد',
    descAr: 'تنظيف عميق للسجاد والموكيت',
    labelEn: 'Carpet cleaning',
    descEn: 'Deep cleaning of rugs and fitted carpets',
  },
  {
    id: 'polster',
    label: 'Polsterreinigung',
    desc: 'Reinigung von Sofas, Sesseln und Polstermöbeln',
    labelAr: 'تنظيف المفروشات',
    descAr: 'تنظيف الكنب والكراسي والأثاث المنجّد',
    labelEn: 'Upholstery cleaning',
    descEn: 'Cleaning of sofas, armchairs and upholstered furniture',
  },
  {
    id: 'praxis',
    label: 'Praxisreinigung',
    desc: 'Hygienereinigung für Arztpraxen nach Desinfektionsstandard',
    labelAr: 'تنظيف العيادات',
    descAr: 'تنظيف صحي للعيادات الطبية وفق معايير التعقيم',
    labelEn: 'Medical practice cleaning',
    descEn: 'Hygienic cleaning for medical practices to disinfection standards',
  },
  {
    id: 'gewerbe',
    label: 'Gewerbereinigung',
    desc: 'Regelmäßige Reinigung für Büros, Praxen und Geschäftsräume',
    labelAr: 'تنظيف المنشآت التجارية',
    descAr: 'تنظيف دوري للمكاتب والعيادات والمحلات التجارية',
    labelEn: 'Commercial cleaning',
    descEn: 'Regular cleaning for offices, practices and business premises',
  },
  {
    id: 'industrie',
    label: 'Industriereinigung',
    desc: 'Reinigung von Produktions- und Lagerhallen, Maschinen & Anlagen',
    labelAr: 'التنظيف الصناعي',
    descAr: 'تنظيف صالات الإنتاج والمستودعات والآلات والمعدات',
    labelEn: 'Industrial cleaning',
    descEn: 'Cleaning of production halls, warehouses, machines and equipment',
  },
  {
    id: 'grund',
    label: 'Grundreinigung',
    desc: 'Intensive Grundreinigung für starke Verschmutzungen und Erstpflege',
    labelAr: 'التنظيف الأساسي الشامل',
    descAr: 'تنظيف أساسي مكثف للأوساخ الشديدة والعناية الأولى',
    labelEn: 'Deep cleaning',
    descEn: 'Intensive deep cleaning for heavy soiling and initial care',
  },
  {
    id: 'bau',
    label: 'Bauendreinigung',
    desc: 'Reinigung nach Baumaßnahmen inkl. Staub- und Bauschuttabfuhr',
    labelAr: 'التنظيف بعد البناء',
    descAr: 'تنظيف بعد أعمال البناء مع إزالة الغبار ومخلفات البناء',
    labelEn: 'Post-construction cleaning',
    descEn: 'Cleaning after construction work incl. removal of dust and debris',
  },
  {
    id: 'treppenhaus',
    label: 'Treppenhausreinigung',
    desc: 'Regelmäßige Reinigung von Treppenhäusern und Gemeinschaftsflächen',
    labelAr: 'تنظيف السلالم',
    descAr: 'تنظيف دوري للسلالم والمساحات المشتركة',
    labelEn: 'Stairwell cleaning',
    descEn: 'Regular cleaning of stairwells and common areas',
  },
  {
    id: 'entruempelung',
    label: 'Entrümpelung + Reinigung',
    desc: 'Entrümpelung von Räumen inkl. fachgerechter Entsorgung & Reinigung',
    labelAr: 'إخلاء وتنظيف',
    descAr: 'إخلاء الغرف مع التخلص السليم من المخلفات والتنظيف',
    labelEn: 'Clearance + cleaning',
    descEn: 'Clearing out rooms incl. proper disposal and cleaning',
  },
  {
    id: 'umzug',
    label: 'Umzugsreinigung / Endreinigung',
    desc: 'Endreinigung bei Auszug inkl. Übergabereinigung nach Vermieterstandard',
    labelAr: 'تنظيف الانتقال / التنظيف النهائي',
    descAr: 'تنظيف نهائي عند الإخلاء وفق معايير تسليم المؤجّر',
    labelEn: 'Move-out / final cleaning',
    descEn: 'Final cleaning when moving out incl. handover cleaning to landlord standards',
  },
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
  vorname: string
  nachname: string
  anrede: string
  email: string
  phone_fixed: string
  phone_whatsapp: string | null
  city: string
  company_address: string
  services: ApplicationService[]
  employee_count: number
  cleaning_prices: Partial<Record<CleaningTypeId, number>>
  cleaning_types: CleaningTypeId[]
  team_size: number
  languages: string[]
  work_radius: number
  has_gewerbe: boolean
  has_haftpflicht: boolean
}

export type ApplicationRow = Omit<ApplicationPayload, 'employee_count' | 'cleaning_prices' | 'cleaning_types' | 'vorname' | 'nachname' | 'anrede'> & {
  employee_count?: number | null
  cleaning_prices?: Partial<Record<CleaningTypeId, number>> | null
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
