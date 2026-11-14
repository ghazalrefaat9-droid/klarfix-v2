'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useLang } from '@/components/LanguageProvider'

const DURATION_MS = 2500
const FADE_MS = 300
// Set by /partner/login after a successful login; the splash shows once and then removes it.
export const WELCOME_FLAG = 'klarfix-partner-welcome'

// Full-screen welcome after login: KlarFix logo + company name, disappears automatically (or on click / Esc).
export default function WelcomeSplash({ name, onDone }: { name: string; onDone: () => void }) {
  const { t } = useLang()
  const [shown, setShown] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const enter = requestAnimationFrame(() => setShown(true))
    const fade = setTimeout(() => setLeaving(true), DURATION_MS - FADE_MS)
    const done = setTimeout(onDone, DURATION_MS)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onDone()
    document.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(enter)
      clearTimeout(fade)
      clearTimeout(done)
      document.removeEventListener('keydown', onKey)
    }
  }, [onDone])

  const visible = shown && !leaving

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={onDone}
      className={`fixed inset-0 z-[100] flex cursor-pointer flex-col items-center justify-center bg-background px-6 text-center transition-opacity duration-300 motion-reduce:transition-none ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        className={`flex flex-col items-center transition duration-700 ease-out motion-reduce:transition-none ${
          visible ? 'translate-y-0 scale-100' : 'translate-y-2 scale-95'
        }`}
      >
        <Image src="/logo.svg" alt="KlarFix" width={235} height={70} preload className="h-auto w-[200px] sm:w-[240px]" />
        <p className="mt-8 text-base font-medium text-primary/70 sm:text-lg">
          {t('Willkommen zurück,', 'مرحباً بعودتك،', 'Welcome back,')}
        </p>
        <p className="mt-1 max-w-md break-words text-2xl font-bold text-primary sm:text-3xl">{name}</p>
      </div>
      <div className="mt-10 h-1 w-40 overflow-hidden rounded-full bg-primary/10" aria-hidden="true">
        <div
          className="h-full rounded-full bg-primary transition-[width] ease-linear motion-reduce:transition-none"
          style={{ width: shown ? '100%' : '0%', transitionDuration: `${DURATION_MS}ms` }}
        />
      </div>
    </div>
  )
}
