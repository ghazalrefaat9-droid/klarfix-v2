'use client'

import { useLang } from '@/components/LanguageProvider'
import { REINIGUNGSARTEN, reinigungsartIcon, reinigungsartName } from '@/lib/reinigungsarten'
import type { CleaningTypeId } from '@/lib/applications'

function selectService(serviceId: CleaningTypeId) {
  localStorage.setItem('klarfix-selected-service', serviceId)
  document.getElementById('preise')?.scrollIntoView({ behavior: 'smooth' })
  window.dispatchEvent(new CustomEvent('klarfix-service', { detail: serviceId }))
}

export default function AlleReinigungsartenCompact() {
  const { t, lang } = useLang()

  return (
    <section id="leistungen" className="scroll-mt-28 bg-[#E8F0E6] px-4 py-12 md:px-8 md:py-16">
      <h2 className="mb-2 text-center text-3xl font-bold text-[#1A3C34] md:text-4xl">
        {t('Unsere Leistungen', 'خدماتنا', 'Our services')}
      </h2>
      <p className="mb-8 text-center text-sm text-[#4F6B62]">
        {t('Alle Reinigungsarten auf einen Blick', 'جميع أنواع التنظيف في لمحة', 'All cleaning types at a glance')}
      </p>
      <ul className="mx-auto grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4">
        {REINIGUNGSARTEN.map((r) => {
          const Icon = reinigungsartIcon(r.id)
          return (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => selectService(r.id)}
                className="flex w-full items-center gap-3 rounded-2xl border border-[#D5E5D5] bg-[#FFFFFF] px-5 py-4 text-start text-[15px] font-medium text-[#1A3C34] shadow-sm transition-all hover:bg-[#FFFBF5] hover:shadow-md md:text-[16px]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E6F0E8]">
                  <Icon size={18} className="text-[#2F7A55]" aria-hidden="true" />
                </span>
                <span>{reinigungsartName(r, lang)}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
