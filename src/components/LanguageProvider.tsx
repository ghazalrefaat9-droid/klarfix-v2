'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Lang = 'de' | 'ar'

type LanguageContextValue = {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (de: string, ar: string) => string
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
    t: (de, ar) => (lang === 'ar' ? ar : de),
  }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLang() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLang must be used inside LanguageProvider')
  return ctx
}
