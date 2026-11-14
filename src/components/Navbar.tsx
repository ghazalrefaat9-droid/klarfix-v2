'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Globe, Check, Menu, X } from 'lucide-react'
import { LANGUAGES, useLang } from './LanguageProvider'

const MENU_WIDTH = 160
const VIEWPORT_GAP = 8

export default function Navbar() {
  const { lang, setLang, t } = useLang()
  const [open, setOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuLeft, setMenuLeft] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)

  // No usePathname here: it would force a Suspense boundary on dynamic routes (Cache Components).
  // Every link in the header closes the mobile menu itself instead.
  const closeMobile = () => setMobileOpen(false)

  useEffect(() => {
    if (!mobileOpen) return
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && setMobileOpen(false)
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [mobileOpen])

  useLayoutEffect(() => {
    if (!open) return

    // Place the menu relative to the button, clamped so it always stays inside the viewport.
    function position() {
      const el = menuRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const vw = document.documentElement.clientWidth
      const width = Math.min(MENU_WIDTH, vw - VIEWPORT_GAP * 2)
      const isRtl = getComputedStyle(el).direction === 'rtl'
      const preferred = isRtl ? rect.left : rect.right - width
      const clamped = Math.max(VIEWPORT_GAP, Math.min(preferred, vw - width - VIEWPORT_GAP))
      setMenuLeft(clamped - rect.left)
    }

    function onPointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }

    position()
    window.addEventListener('resize', position)
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('resize', position)
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, lang])

  const links = [
    { href: '/#leistungen', label: t('Leistungen', 'الخدمات', 'Services') },
    { href: '/partner/werden', label: t('Partner werden', 'كن شريكاً', 'Become a partner') },
  ]
  const cta = t('Jetzt anfragen', 'اطلب الآن', 'Request now')

  return (
    <header className="sticky top-0 z-50 border-b border-primary/10 bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link
          href="/"
          onClick={closeMobile}
          aria-label={t('KlarFix – Startseite', 'KlarFix – الصفحة الرئيسية', 'KlarFix – Home')}
          className="shrink-0"
        >
          <Image
            src="/logo.svg"
            alt="KlarFix - Reinigung in Stuttgart"
            width={235}
            height={70}
            preload
            className="h-auto w-[150px] md:w-[180px]"
          />
        </Link>

        <div className="flex items-center gap-2 md:gap-4">
          <nav className="hidden items-center gap-4 text-sm font-medium text-primary md:flex">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-primary-hover">
                {l.label}
              </Link>
            ))}
            <Link href="/buchen" className="rounded-full bg-primary px-5 py-2 text-card transition-colors hover:bg-primary-hover">
              {cta}
            </Link>
          </nav>

          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={t('Sprache wählen', 'اختر اللغة', 'Choose language')}
              aria-expanded={open}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-card text-primary/80 hover:border-primary hover:text-primary-hover md:h-9 md:w-9"
            >
              <Globe className="h-4 w-4" />
            </button>
            {open && (
              <ul
                style={{ left: menuLeft, width: MENU_WIDTH, maxWidth: `calc(100vw - ${VIEWPORT_GAP * 2}px)` }}
                className="absolute top-full z-50 mt-2 overflow-hidden rounded-lg border border-primary/10 bg-card py-1 text-sm text-primary shadow-lg"
              >
                {LANGUAGES.map((l) => (
                  <li key={l.code}>
                    <button
                      type="button"
                      onClick={() => {
                        setLang(l.code)
                        setOpen(false)
                      }}
                      className="flex w-full items-center justify-between px-3 py-2.5 text-start hover:bg-primary/5"
                    >
                      <span>{l.label}</span>
                      {lang === l.code && <Check className="h-4 w-4 text-primary" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={t('Menü', 'القائمة', 'Menu')}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-card hover:bg-primary-hover md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav id="mobile-menu" className="border-t border-primary/10 px-4 pb-4 pt-2 md:hidden">
          <ul className="space-y-1 text-base font-medium text-primary">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex min-h-[48px] items-center rounded-xl px-3 hover:bg-primary/5"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/buchen"
            onClick={() => setMobileOpen(false)}
            className="mt-3 flex min-h-[48px] items-center justify-center rounded-full bg-primary text-base font-semibold text-card hover:bg-primary-hover"
          >
            {cta}
          </Link>
        </nav>
      )}
    </header>
  )
}
