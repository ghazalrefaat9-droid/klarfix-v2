'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Globe, Check } from 'lucide-react'
import { LANGUAGES, useLang } from './LanguageProvider'

export default function Navbar() {
  const { lang, setLang, t } = useLang()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-xl font-bold text-[#0F60C6]">
          KlarFix
        </Link>

        <nav className="flex flex-wrap items-center gap-4 text-sm font-medium text-gray-700">
          <Link href="/#leistungen" className="hover:text-[#0F60C6]">
            {t('Leistungen', 'الخدمات', 'Services')}
          </Link>
          <Link href="/#preise" className="hover:text-[#0F60C6]">
            {t('Preise', 'الأسعار', 'Prices')}
          </Link>
          <Link href="/partner/werden" className="hover:text-[#0F60C6]">
            {t('Partner werden', 'كن شريكاً', 'Become a partner')}
          </Link>
          <Link
            href="/buchen"
            className="rounded-lg bg-[#0F60C6] px-4 py-2 text-white hover:opacity-90"
          >
            {t('Jetzt buchen', 'احجز الآن', 'Book now')}
          </Link>
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={t('Sprache wählen', 'اختر اللغة', 'Choose language')}
              aria-expanded={open}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 hover:border-[#0F60C6] hover:text-[#0F60C6]"
            >
              <Globe className="h-4 w-4" />
            </button>
            {open && (
              <ul className="absolute end-0 mt-2 w-40 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 text-sm text-gray-900 shadow-lg">
                {LANGUAGES.map((l) => (
                  <li key={l.code}>
                    <button
                      type="button"
                      onClick={() => {
                        setLang(l.code)
                        setOpen(false)
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-start hover:bg-gray-100"
                    >
                      <span>{l.label}</span>
                      {lang === l.code && <Check className="h-4 w-4 text-[#0F60C6]" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}
