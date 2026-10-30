'use client'

import Link from 'next/link'
import { useLang } from './LanguageProvider'

export default function Navbar() {
  const { lang, setLang, t } = useLang()

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-xl font-bold text-[#0F60C6]">
          KlarFix
        </Link>

        <nav className="flex flex-wrap items-center gap-4 text-sm font-medium text-gray-700">
          <Link href="/#leistungen" className="hover:text-[#0F60C6]">
            {t('Leistungen', 'الخدمات')}
          </Link>
          <Link href="/#preise" className="hover:text-[#0F60C6]">
            {t('Preise', 'الأسعار')}
          </Link>
          <Link href="/partner/werden" className="hover:text-[#0F60C6]">
            {t('Partner werden', 'كن شريكاً')}
          </Link>
          <Link
            href="/buchen"
            className="rounded-lg bg-[#0F60C6] px-4 py-2 text-white hover:opacity-90"
          >
            {t('Jetzt buchen', 'احجز الآن')}
          </Link>
          <div className="flex overflow-hidden rounded-lg border border-gray-300 text-xs">
            <button
              onClick={() => setLang('de')}
              className={`px-2 py-1 ${lang === 'de' ? 'bg-[#0F60C6] text-white' : 'bg-white text-gray-600'}`}
            >
              DE
            </button>
            <button
              onClick={() => setLang('ar')}
              className={`px-2 py-1 ${lang === 'ar' ? 'bg-[#0F60C6] text-white' : 'bg-white text-gray-600'}`}
            >
              AR
            </button>
          </div>
        </nav>
      </div>
    </header>
  )
}
