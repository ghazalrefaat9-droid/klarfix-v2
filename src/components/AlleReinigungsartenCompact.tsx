'use client'

import { useRouter } from 'next/navigation'
import { useLang } from '@/components/LanguageProvider'
import { REINIGUNGSARTEN, reinigungsartIcon, reinigungsartName, type Reinigungsart } from '@/lib/reinigungsarten'

export default function AlleReinigungsartenCompact() {
  const { t, lang } = useLang()
  const router = useRouter()

  function selectService(r: Reinigungsart) {
    localStorage.setItem('klarfix-selected-service', r.id)
    window.dispatchEvent(new CustomEvent('klarfix-service', { detail: r.id }))
    router.push(`/buchen?service=${encodeURIComponent(r.name)}`)
  }

  return (
    <section id="leistungen" className="scroll-mt-28 bg-[#E8F0E6] px-3 py-10 md:px-8 md:py-14">
      <h2 className="mb-2 text-center text-3xl font-bold text-[#1A3C34] md:text-4xl">
        {t('Unsere Leistungen', 'Ø®Ø¯Ù…Ø§ØªÙ†Ø§', 'Our services')}
      </h2>
      <p className="mb-6 text-center text-sm text-[#4F6B62]">
        {t('Alle Reinigungsarten auf einen Blick', 'Ø¬Ù…ÙŠØ¹ Ø£Ù†ÙˆØ§Ø¹ Ø§Ù„ØªÙ†Ø¸ÙŠÙ ÙÙŠ Ù„Ù…Ø­Ø©', 'All cleaning types at a glance')}
      </p>
      <ul className="mx-auto grid max-w-5xl grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
        {REINIGUNGSARTEN.map((r) => {
          const Icon = reinigungsartIcon(r.id)
          return (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => selectService(r)}
                className="flex h-[110px] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-[#D5E5D5] bg-[#FFFFFF] px-2 py-3 text-center shadow-sm transition-all hover:scale-[1.02] hover:bg-[#FFFBF5] hover:shadow-md md:h-[125px]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E6F0E8] md:h-11 md:w-11">
                  <Icon size={20} className="text-[#2F7A55]" aria-hidden="true" />
                </span>
                <span className="line-clamp-2 text-[13px] font-medium leading-tight text-[#1A3C34] md:text-[14px]">
                  {reinigungsartName(r, lang)}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
