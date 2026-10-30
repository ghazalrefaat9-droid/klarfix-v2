// Preise sind Richtpreise in Euro pro m² und müssen vor dem Livegang bestätigt werden.
export type Service = {
  // Gespeichert wird immer der deutsche Name (wird vom Admin-Dashboard gefiltert).
  key: string
  de: string
  ar: string
  icon: string
  descDe: string
  descAr: string
  priceFrom: string
}

export const SERVICES: Service[] = [
  {
    key: 'Wohnungsreinigung',
    de: 'Wohnungsreinigung',
    ar: 'تنظيف الشقق',
    icon: '🏠',
    descDe: 'Regelmäßige Reinigung Ihrer Wohnung – zuverlässig und gründlich.',
    descAr: 'تنظيف منتظم لشقتك بشكل موثوق ودقيق.',
    priceFrom: '2,50',
  },
  {
    key: 'Büroreinigung',
    de: 'Büroreinigung',
    ar: 'تنظيف المكاتب',
    icon: '🏢',
    descDe: 'Saubere Büros für ein produktives Arbeitsumfeld.',
    descAr: 'مكاتب نظيفة لبيئة عمل منتجة.',
    priceFrom: '2,20',
  },
  {
    key: 'Fensterreinigung',
    de: 'Fensterreinigung',
    ar: 'تنظيف النوافذ',
    icon: '🪟',
    descDe: 'Streifenfreie Fenster innen und außen.',
    descAr: 'نوافذ خالية من الخطوط من الداخل والخارج.',
    priceFrom: '3,50',
  },
  {
    key: 'Grundreinigung',
    de: 'Grundreinigung',
    ar: 'التنظيف الشامل',
    icon: '✨',
    descDe: 'Intensivreinigung bei Umzug, Übergabe oder nach Renovierung.',
    descAr: 'تنظيف عميق عند الانتقال أو التسليم أو بعد الترميم.',
    priceFrom: '4,50',
  },
]
