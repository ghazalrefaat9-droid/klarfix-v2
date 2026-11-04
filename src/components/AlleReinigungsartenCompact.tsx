'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useLang } from '@/components/LanguageProvider'
import { REINIGUNGSARTEN, reinigungsartIcon, reinigungsartName } from '@/lib/reinigungsarten'

const VISIBLE_MOBILE = 6
const VISIBLE_DESKTOP = 12

export default function AlleReinigungsartenCompact() {
  const { t, lang } = useLang()
  const [expanded, setExpanded] = useState(false)
  const total = REINIGUNGSARTEN.length
  const hiddenMobile = Math.max(0, total - VISIBLE_MOBILE)
  const hiddenDesktop = Math.max(0, total - VISIBLE_DESKTOP)

  return (
    <section id="alle-leistungen" aria-labelledby="alle-leistungen-title" className="scroll-mt-32 px-4 py-6">
      <div className="mx-auto max-w-6xl">
        <p
          id="alle-leistungen-title"
          className="text-center text-sm font-semibold uppercase tracking-widest text-[#4F6B62]"
        >
          {t('Alle Reinigungsleistungen', 'جميع خدمات التنظيف', 'All cleaning services')}
        </p>
        <ul id="alle-leistungen-liste" className="mt-4 flex flex-wrap justify-center gap-2">
          {REINIGUNGSARTEN.map((r, i) => {
            const Icon = reinigungsartIcon(r.id)
            // Collapsed: 6 pills (~120px) on mobile, 12 from sm up.
            const visibility = expanded
              ? 'flex'
              : i >= VISIBLE_DESKTOP
                ? 'hidden'
                : i >= VISIBLE_MOBILE
                  ? 'hidden sm:flex'
                  : 'flex'
            return (
              <li key={r.id} className={visibility}>
                <Link
                  href={`/buchen?service=${encodeURIComponent(r.name)}`}
                  className="flex items-center gap-1.5 rounded-full border border-[#E6F0E8] bg-[#FFFFFF] px-3 py-1.5 text-[13px] text-[#1A3C34] transition-colors hover:bg-[#E6F0E8]"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-[#2F7A55]" strokeWidth={2} aria-hidden="true" />
                  {reinigungsartName(r, lang)}
                </Link>
              </li>
            )
          })}
          {hiddenMobile > 0 && (
            <li className={hiddenDesktop > 0 || expanded ? 'flex' : 'flex sm:hidden'}>
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                aria-controls="alle-leistungen-liste"
                className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-[#2F7A55] underline-offset-4 transition-colors hover:bg-[#E6F0E8] hover:underline"
              >
                {expanded ? (
                  t('Weniger anzeigen', 'عرض أقل', 'Show less')
                ) : (
                  <>
                    <span className="sm:hidden">+{hiddenMobile} {t('mehr', 'المزيد', 'more')}</span>
                    <span className="hidden sm:inline">+{hiddenDesktop} {t('mehr', 'المزيد', 'more')}</span>
                  </>
                )}
              </button>
            </li>
          )}
        </ul>
      </div>
    </section>
  )
}
