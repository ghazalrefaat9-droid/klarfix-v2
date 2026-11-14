'use client'

import { useRouter } from 'next/navigation'
import { useLang } from '@/components/LanguageProvider'
import { REINIGUNGSARTEN, reinigungsartIcon, reinigungsartName, type Reinigungsart } from '@/lib/reinigungsarten'

// KlarFix brand palette only: mint, green, dark green, orange as accent.
const GREEN = '#2D8A57'
const ORANGE = '#D9772B'
const DARK = '#1B4332'

// Highlighted cards; all others are white with soft icon circles from the same palette.
const FEATURED: Partial<Record<Reinigungsart['id'], { bg: string; popular?: boolean }>> = {
  wohnung: { bg: GREEN, popular: true },
  haus: { bg: ORANGE },
}

// Rotating soft tints: light green, light orange, mint.
const SOFT_TINTS = [
  { circle: '#E3F1E8', icon: GREEN },
  { circle: '#FBE9DA', icon: ORANGE },
  { circle: '#DDEDE3', icon: DARK },
]
const TINT_BY_ID = new Map(
  REINIGUNGSARTEN.filter((r) => !FEATURED[r.id]).map((r, i) => [r.id, SOFT_TINTS[i % SOFT_TINTS.length]] as const),
)

export default function AlleReinigungsartenCompact() {
  const { t, lang } = useLang()
  const router = useRouter()

  function selectService(r: Reinigungsart) {
    localStorage.setItem('klarfix-selected-service', r.id)
    window.dispatchEvent(new CustomEvent('klarfix-service', { detail: r.id }))
    router.push(`/buchen?service=${encodeURIComponent(r.name)}`)
  }

  const priceText = t('Preis auf Anfrage', 'السعر عند الطلب', 'Price on request')

  return (
    <section id="leistungen" className="scroll-mt-28 bg-[#E8F0E6] px-3 py-10 md:px-8 md:py-14">
      <h2 className="mb-2 text-center text-3xl font-bold text-[#1A3C34] md:text-4xl">
        {t('Unsere Leistungen', 'خدماتنا', 'Our services')}
      </h2>
      <p className="mb-6 text-center text-sm text-[#4F6B62]">
        {t('Alle Reinigungsarten auf einen Blick', 'جميع أنواع التنظيف في لمحة', 'All cleaning types at a glance')}
      </p>
      <ul className="mx-auto grid max-w-5xl grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
        {REINIGUNGSARTEN.map((r) => {
          const Icon = reinigungsartIcon(r.id)
          const featured = FEATURED[r.id]
          const tint = featured ? null : (TINT_BY_ID.get(r.id) ?? SOFT_TINTS[0])
          return (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => selectService(r)}
                style={featured ? { backgroundColor: featured.bg } : undefined}
                className={`relative flex h-[132px] w-full flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-3 text-center shadow-sm transition-all hover:scale-[1.02] hover:shadow-md md:h-[145px] ${
                  featured ? 'text-[#FFFFFF]' : 'border border-[#D5E5D5] bg-[#FFFFFF] text-[#1A3C34] hover:bg-[#FFFBF5]'
                }`}
              >
                {featured?.popular && (
                  <span className="absolute end-2 top-2 rounded-full bg-[#FFFFFF] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ color: GREEN }}>
                    {t('Beliebt', 'الأكثر طلباً', 'Popular')}
                  </span>
                )}
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full md:h-11 md:w-11 ${featured ? 'bg-[#FFFFFF]/20' : ''}`}
                  style={tint ? { backgroundColor: tint.circle } : undefined}
                >
                  <Icon size={20} style={{ color: tint ? tint.icon : '#FFFFFF' }} aria-hidden="true" />
                </span>
                <span className="line-clamp-2 text-[13px] font-semibold leading-tight md:text-[14px]">{reinigungsartName(r, lang)}</span>
                <span className={`text-[11px] md:text-[12px] ${featured ? 'text-[#FFFFFF]/85' : 'text-[#4F6B62]'}`}>{priceText}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
