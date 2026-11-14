'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { useLang } from '@/components/LanguageProvider'
import { REINIGUNGSARTEN, reinigungsartIcon, reinigungsartName, type Reinigungsart } from '@/lib/reinigungsarten'
import { BRAND } from '@/lib/brand'

// The first 6 services are shown directly, the rest after "Alle 14 Leistungen anzeigen".
const INITIAL_COUNT = 6

// KlarFix brand palette only: mint, green, dark green, orange as accent.
const GREEN = BRAND.green
const ORANGE = BRAND.orange
const DARK = BRAND.darkGreen

// Highlighted cards; all others are white with soft icon circles from the same palette.
const FEATURED: Partial<Record<Reinigungsart['id'], { bg: string; popular?: boolean }>> = {
  wohnung: { bg: GREEN, popular: true },
  haus: { bg: ORANGE },
}

// Rotating soft tints: light green, light orange, mint.
const SOFT_TINTS = [
  { circle: BRAND.greenTint, icon: GREEN },
  { circle: BRAND.orangeTint, icon: ORANGE },
  { circle: BRAND.mint, icon: DARK },
]
const TINT_BY_ID = new Map(
  REINIGUNGSARTEN.filter((r) => !FEATURED[r.id]).map((r, i) => [r.id, SOFT_TINTS[i % SOFT_TINTS.length]] as const),
)

export default function AlleReinigungsartenCompact() {
  const { t, lang } = useLang()
  const router = useRouter()
  const [showAll, setShowAll] = useState(false)

  function selectService(r: Reinigungsart) {
    localStorage.setItem('klarfix-selected-service', r.id)
    window.dispatchEvent(new CustomEvent('klarfix-service', { detail: r.id }))
    router.push(`/buchen?service=${encodeURIComponent(r.name)}`)
  }

  const visible = showAll ? REINIGUNGSARTEN : REINIGUNGSARTEN.slice(0, INITIAL_COUNT)
  const hiddenCount = REINIGUNGSARTEN.length - INITIAL_COUNT

  return (
    <section id="leistungen" className="scroll-mt-28 bg-[#E8F0E6] px-3 py-10 md:px-8 md:py-14">
      <h2 className="mb-2 text-center text-3xl font-bold text-[#1A3C34] md:text-4xl">
        {t('Unsere Leistungen', 'خدماتنا', 'Our services')}
      </h2>
      <p className="mb-6 text-center text-sm font-medium text-[#4F6B62]">
        {t('Alle Preise auf Anfrage', 'جميع الأسعار عند الطلب', 'All prices on request')}
      </p>
      <ul id="leistungen-liste" className="mx-auto grid max-w-5xl grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-3">
        {visible.map((r) => {
          const Icon = reinigungsartIcon(r.id)
          const featured = FEATURED[r.id]
          const tint = featured ? null : (TINT_BY_ID.get(r.id) ?? SOFT_TINTS[0])
          return (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => selectService(r)}
                style={featured ? { backgroundColor: featured.bg } : undefined}
                className={`relative flex h-[110px] w-full flex-col items-center justify-center gap-2 rounded-2xl px-2 py-3 text-center shadow-sm transition-all hover:scale-[1.02] hover:shadow-md md:h-[125px] ${
                  featured ? 'text-[#FFFFFF]' : 'border border-[#D5E5D5] bg-[#FFFFFF] text-[#1A3C34] hover:bg-[#F2E7E0]'
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
              </button>
            </li>
          )
        })}
      </ul>
      {hiddenCount > 0 && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            aria-expanded={showAll}
            aria-controls="leistungen-liste"
            className="inline-flex items-center gap-2 rounded-full border border-[#1A3C34]/20 bg-[#FFFFFF] px-6 py-2.5 text-sm font-semibold text-[#1A3C34] shadow-sm transition hover:border-[#1A3C34]/40 hover:shadow-md"
          >
            {showAll
              ? t('Weniger anzeigen', 'عرض أقل', 'Show less')
              : t(
                  `Alle ${REINIGUNGSARTEN.length} Leistungen anzeigen`,
                  `عرض جميع الخدمات (${REINIGUNGSARTEN.length})`,
                  `Show all ${REINIGUNGSARTEN.length} services`,
                )}
            <ChevronDown className={`h-4 w-4 transition-transform ${showAll ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  )
}
