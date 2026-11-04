'use client'

import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from 'react'

export type Lang = 'de' | 'ar' | 'en'

export const LANGUAGES: { code: Lang; label: string }[] = [
  { code: 'de', label: 'Deutsch' },
  { code: 'ar', label: 'العربية' },
  { code: 'en', label: 'English' },
]

const STORAGE_KEY = 'klarfix-lang'
const TITLES: Record<Lang, string> = {
  de: 'KlarFix – Reinigung in Stuttgart',
  ar: 'KlarFix – تنظيف في شتوتغارت',
  en: 'KlarFix – Cleaning in Stuttgart',
}

// The chosen language lives in localStorage so it survives reloads and direct links.
const listeners = new Set<() => void>()

function readLang(): Lang {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'ar' || stored === 'en' ? stored : 'de'
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

function storeLang(lang: Lang) {
  window.localStorage.setItem(STORAGE_KEY, lang)
  listeners.forEach((l) => l())
}

type LanguageContextValue = {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (de: string, ar: string, en?: string) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore(subscribe, readLang, () => 'de' as Lang)

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [lang])

  // Next.js re-applies the German metadata title on load/navigation, so keep the tab title in the chosen language.
  useEffect(() => {
    const wanted = TITLES[lang]
    const apply = () => {
      if (document.title !== wanted) document.title = wanted
    }
    apply()
    const observer = new MutationObserver(apply)
    observer.observe(document.head, { subtree: true, childList: true, characterData: true })
    return () => observer.disconnect()
  }, [lang])

  const value: LanguageContextValue = {
    lang,
    setLang: storeLang,
    t: (de, ar, en) => {
      if (lang === 'ar') return ar
      if (lang === 'en') return en ?? de
      return de
    },
  }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLang() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLang must be used inside LanguageProvider')
  return ctx
}
