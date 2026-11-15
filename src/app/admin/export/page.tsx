'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'
import PinInput from '@/components/admin/PinInput'
import { BackToAdmin, btnPrimary, cardClass, pageClass } from '@/components/admin/exportUi'
import { SS_EXPORT_UNTIL, SS_PIN_LOCK_UNTIL } from '@/lib/exportConstants'
import { formatCountdown, setSessionNumber, useAdminFlag, useNow, useSessionNumber } from '@/lib/exportSessionClient'

const EMPTY = ['', '', '', '']

// PIN gate for the Export Center. The PIN is verified only by POST /api/check-pin.
export default function ExportPinGatePage() {
  const router = useRouter()
  const isAdmin = useAdminFlag()
  const exportUntil = useSessionNumber(SS_EXPORT_UNTIL)
  const lockUntil = useSessionNumber(SS_PIN_LOCK_UNTIL)
  const now = useNow()

  const [digits, setDigits] = useState<string[]>(EMPTY)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const locked = now > 0 && lockUntil > now
  const pin = digits.join('')

  useEffect(() => {
    if (isAdmin === false) router.replace('/admin/login')
  }, [isAdmin, router])

  // Still unlocked in this tab? Confirm with the server cookie, then skip the gate.
  useEffect(() => {
    if (exportUntil <= 0) return
    if (exportUntil < Date.now()) {
      setSessionNumber(SS_EXPORT_UNTIL, null)
      return
    }
    let cancelled = false
    fetch('/api/check-pin', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        if (d.ok) router.replace('/admin/export-center')
        else setSessionNumber(SS_EXPORT_UNTIL, null)
      })
      .catch(() => null)
    return () => {
      cancelled = true
    }
  }, [exportUntil, router])

  async function submit() {
    if (pin.length !== 4 || locked || busy) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/check-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      if (res.status === 401) {
        localStorage.removeItem('admin')
        router.replace('/admin/login')
        return
      }
      const data = await res.json().catch(() => ({}))
      if (data.ok) {
        setSessionNumber(SS_PIN_LOCK_UNTIL, null)
        setSessionNumber(SS_EXPORT_UNTIL, Date.now() + (data.expiresIn ?? 900) * 1000)
        router.replace('/admin/export-center')
        return
      }
      setDigits(EMPTY)
      document.getElementById('gate-0')?.focus()
      if (data.locked && data.lockedUntil) {
        setSessionNumber(SS_PIN_LOCK_UNTIL, new Date(data.lockedUntil).getTime())
      } else if (typeof data.attemptsLeft === 'number') {
        setError(`PIN غلط (${data.attemptsLeft} محاولات متبقية)`)
      } else {
        setError(data.error ?? 'PIN غلط')
      }
    } catch {
      setError('Netzwerkfehler – bitte erneut versuchen.')
    } finally {
      setBusy(false)
    }
  }

  if (!isAdmin) return <div className={`${pageClass} p-8 text-center text-[#4B5563]`}>Lade…</div>

  return (
    <div className={pageClass}>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
        <header className="flex items-center justify-between gap-3">
          <p className="text-2xl font-bold text-[#1B4332]">Admin-Dashboard</p>
          <BackToAdmin />
        </header>

        <div className={`${cardClass} mx-auto mt-8 w-full max-w-md p-6 text-center sm:mt-12 sm:p-10`}>
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#2A9DCC]/15 text-[#2A9DCC]">
            <Lock className="h-8 w-8" />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold text-[#1B4332]" dir="auto">
            🔒 Export Center محمي
          </h1>
          <p className="mt-1 text-sm text-[#4B5563]" dir="auto">
            أدخل رمز PIN المكوّن من 4 أرقام
          </p>

          <form
            className="mt-6"
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            <PinInput
              value={digits}
              onChange={(d) => {
                setDigits(d)
                setError('')
              }}
              onComplete={submit}
              disabled={locked || busy}
              idPrefix="gate"
            />

            {(locked || error) && (
              <p role="alert" dir="auto" className="mt-5 rounded-xl bg-[#E85D5D]/10 px-3 py-2 text-sm font-semibold text-[#E85D5D]">
                {locked ? `PIN غلط – 3 محاولات خاطئة. 🔒 مقفول لمدة 5 دقائق (${formatCountdown(lockUntil - now)})` : error}
              </p>
            )}

            <button type="submit" className={`${btnPrimary} mt-6 w-full text-lg`} disabled={pin.length !== 4 || locked || busy}>
              {busy ? '…' : 'دخول'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
