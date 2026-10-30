'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Lang = 'de' | 'ar' | 'en'

export const LANGUAGES: { code: Lang; label: string }[] = [
  { code: 'de', label: 'Deutsch' },
  { code: 'ar', label: 'العربية' },
  { code: 'en', label: 'English' },
]

type LanguageContextValue = {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (de: string, ar: string, en?: string) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('de')

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [lang])

  const value: LanguageContextValue = {
    lang,
    setLang,
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
