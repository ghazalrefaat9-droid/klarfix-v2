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
    <header className="sticky top-0 z-50 border-b border-primary/10 bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-xl font-bold text-primary">
          KlarFix
        </Link>

        <nav className="flex flex-wrap items-center gap-4 text-sm font-medium text-primary">
          <Link href="/#leistungen" className="hover:text-primary-hover">
            {t('Leistungen', 'الخدمات', 'Services')}
          </Link>
          <Link href="/#preise" className="hover:text-primary-hover">
            {t('Preise', 'الأسعار', 'Prices')}
          </Link>
          <Link href="/partner/werden" className="hover:text-primary-hover">
            {t('Partner werden', 'كن شريكاً', 'Become a partner')}
          </Link>
          <Link
            href="/buchen"
            className="rounded-full bg-primary px-5 py-2 text-card transition-colors hover:bg-primary-hover"
          >
            {t('Jetzt buchen', 'احجز الآن', 'Book now')}
          </Link>
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={t('Sprache wählen', 'اختر اللغة', 'Choose language')}
              aria-expanded={open}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/20 bg-card text-primary/80 hover:border-primary hover:text-primary-hover"
            >
              <Globe className="h-4 w-4" />
            </button>
            {open && (
              <ul className="absolute end-0 mt-2 w-40 overflow-hidden rounded-lg border border-primary/10 bg-card py-1 text-sm text-primary shadow-lg">
                {LANGUAGES.map((l) => (
                  <li key={l.code}>
                    <button
                      type="button"
                      onClick={() => {
                        setLang(l.code)
                        setOpen(false)
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-start hover:bg-primary/5"
                    >
                      <span>{l.label}</span>
                      {lang === l.code && <Check className="h-4 w-4 text-primary" />}
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
