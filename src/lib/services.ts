import type { Lang } from '@/components/LanguageProvider'

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
