import type { Lang } from '@/components/LanguageProvider'
import { CLEANING_TYPES } from '@/lib/applications'

// Preise sind Richtpreise in Euro pro m² und müssen vor dem Livegang bestätigt werden.
export type Service = {
  // Gespeichert wird immer der deutsche Name (wird vom Admin-Dashboard gefiltert).
  key: string
  de: string
  ar: string
  en: string
  icon: string
  descDe: string
  descAr: string
  descEn: string
  priceFrom: string
}

export function serviceName(s: Service, lang: Lang) {
  return lang === 'ar' ? s.ar : lang === 'en' ? s.en : s.de
}

export function serviceDesc(s: Service, lang: Lang) {
  return lang === 'ar' ? s.descAr : lang === 'en' ? s.descEn : s.descDe
}

export type Reinigungsart = { id: string; label: string; desc: string }

// German label/desc are what gets stored; the visitor sees the translation from CLEANING_TYPES (same labels).
const SONSTIGES_TEXT = {
  labelAr: 'أخرى',
  descAr: 'نوع تنظيف آخر - يرجى الوصف',
  labelEn: 'Other',
  descEn: 'Other cleaning type - please describe',
}

export function reinigungsartText(r: Reinigungsart, lang: Lang) {
  if (lang === 'de') return { label: r.label, desc: r.desc }
  const tr = CLEANING_TYPES.find((c) => c.label === r.label) ?? (r.id === 'sonstiges' ? SONSTIGES_TEXT : null)
  if (!tr) return { label: r.label, desc: r.desc }
  return lang === 'ar' ? { label: tr.labelAr, desc: tr.descAr } : { label: tr.labelEn, desc: tr.descEn }
}

export const REINIGUNGSARTEN: Reinigungsart[] = [
  { id: 'wohnungsreinigung', label: 'Wohnungsreinigung', desc: 'Standardreinigung von Wohnräumen, Küche und Bad' },
  { id: 'hausreinigung', label: 'Hausreinigung', desc: 'Komplettreinigung für Ein- und Mehrfamilienhäuser' },
  { id: 'bueroreinigung', label: 'Büroreinigung', desc: 'Reinigung von Büroräumen, Schreibtischen und Gemeinschaftsbereichen' },
  { id: 'fensterreinigung', label: 'Fensterreinigung', desc: 'Professionelle Reinigung von Fenstern, Glasflächen und Rahmen' },
  { id: 'teppichreinigung', label: 'Teppichreinigung', desc: 'Tiefenreinigung von Teppichen und Teppichböden' },
  { id: 'polsterreinigung', label: 'Polsterreinigung', desc: 'Reinigung von Sofas, Sesseln und Polstermöbeln' },
  { id: 'praxisreinigung', label: 'Praxisreinigung', desc: 'Hygienereinigung für Arztpraxen nach Desinfektionsstandard' },
  { id: 'gewerbereinigung', label: 'Gewerbereinigung', desc: 'Regelmäßige Reinigung für Büros, Praxen und Geschäftsräume' },
  { id: 'industriereinigung', label: 'Industriereinigung', desc: 'Reinigung von Produktions- und Lagerhallen, Maschinen & Anlagen' },
  { id: 'grundreinigung', label: 'Grundreinigung', desc: 'Intensive Grundreinigung für starke Verschmutzungen und Erstpflege' },
  { id: 'bauendreinigung', label: 'Bauendreinigung', desc: 'Reinigung nach Baumaßnahmen inkl. Staub- und Bauschuttabfuhr' },
  { id: 'treppenhausreinigung', label: 'Treppenhausreinigung', desc: 'Regelmäßige Reinigung von Treppenhäusern und Gemeinschaftsflächen' },
  { id: 'entruempelung', label: 'Entrümpelung + Reinigung', desc: 'Entrümpelung von Räumen inkl. fachgerechter Entsorgung & Reinigung' },
  { id: 'umzugsreinigung', label: 'Umzugsreinigung / Endreinigung', desc: 'Endreinigung bei Auszug inkl. Übergabereinigung nach Vermieterstandard' },
  { id: 'sonstiges', label: 'Sonstiges', desc: 'Andere Reinigungsart - bitte beschreiben' },
]

export const SERVICES: Service[] = [
  {
    key: 'Wohnungsreinigung',
    de: 'Wohnungsreinigung',
    ar: 'تنظيف الشقق',
    en: 'Apartment cleaning',
    icon: '🏠',
    descDe: 'Regelmäßige Reinigung Ihrer Wohnung – zuverlässig und gründlich.',
    descAr: 'تنظيف منتظم لشقتك بشكل موثوق ودقيق.',
    descEn: 'Regular cleaning of your home – reliable and thorough.',
    priceFrom: '2,50',
  },
  {
    key: 'Büroreinigung',
    de: 'Büroreinigung',
    ar: 'تنظيف المكاتب',
    en: 'Office cleaning',
    icon: '🏢',
    descDe: 'Saubere Büros für ein produktives Arbeitsumfeld.',
    descAr: 'مكاتب نظيفة لبيئة عمل منتجة.',
    descEn: 'Clean offices for a productive work environment.',
    priceFrom: '2,20',
  },
  {
    key: 'Fensterreinigung',
    de: 'Fensterreinigung',
    ar: 'تنظيف النوافذ',
    en: 'Window cleaning',
    icon: '🪟',
    descDe: 'Streifenfreie Fenster innen und außen.',
    descAr: 'نوافذ خالية من الخطوط من الداخل والخارج.',
    descEn: 'Streak-free windows, inside and out.',
    priceFrom: '3,50',
  },
  {
    key: 'Grundreinigung',
    de: 'Grundreinigung',
    ar: 'التنظيف الشامل',
    en: 'Deep cleaning',
    icon: '✨',
    descDe: 'Intensivreinigung bei Umzug, Übergabe oder nach Renovierung.',
    descAr: 'تنظيف عميق عند الانتقال أو التسليم أو بعد الترميم.',
    descEn: 'Intensive cleaning for moves, handovers or after renovation.',
    priceFrom: '4,50',
  },
]
