'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { BackToAdmin, btnPrimary, cardClass, fieldClass, pageClass } from '@/components/admin/exportUi'
import { PIN_REGEX, SS_EXPORT_UNTIL } from '@/lib/exportConstants'
import { setSessionNumber, useAdminFlag } from '@/lib/exportSessionClient'

type Msg = { kind: 'ok' | 'error'; text: string } | null

function PinField({ id, label, value, onChange, autoComplete }: { id: string; label: string; value: string; onChange: (v: string) => void; autoComplete: string }) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1 block text-sm font-semibold text-[#1B4332]">{label}</span>
      <input
        id={id}
        type="password"
        inputMode="numeric"
        maxLength={4}
        autoComplete={autoComplete}
        className={`${fieldClass} text-center text-2xl tracking-[0.6em]`}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
      />
    </label>
  )
}

export default function AdminSettingsPage() {
  const router = useRouter()
  const isAdmin = useAdminFlag()
  const [oldPin, setOldPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)

  useEffect(() => {
    if (isAdmin === false) router.replace('/admin/login')
  }, [isAdmin, router])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    if (!PIN_REGEX.test(oldPin)) return setMsg({ kind: 'error', text: 'Alter PIN muss 4 Ziffern haben.' })
    if (!PIN_REGEX.test(newPin)) return setMsg({ kind: 'error', text: 'Neuer PIN muss genau 4 Ziffern haben.' })
    if (newPin !== confirmPin) return setMsg({ kind: 'error', text: 'Neuer PIN und Bestätigung stimmen nicht überein.' })
    if (newPin === oldPin) return setMsg({ kind: 'error', text: 'Neuer PIN muss sich vom alten unterscheiden.' })

    setBusy(true)
    try {
      const res = await fetch('/api/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPin, newPin }),
      })
      if (res.status === 401) {
        localStorage.removeItem('admin')
        router.replace('/admin/login')
        return
      }
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) {
        setOldPin('')
        setNewPin('')
        setConfirmPin('')
        // The server ended the export session; the new PIN is required next time.
        setSessionNumber(SS_EXPORT_UNTIL, null)
        setMsg({ kind: 'ok', text: '✅ PIN erfolgreich geändert – تم تغيير PIN بنجاح' })
      } else {
        setMsg({ kind: 'error', text: data.error ?? 'PIN konnte nicht geändert werden.' })
      }
    } catch {
      setMsg({ kind: 'error', text: 'Netzwerkfehler – bitte erneut versuchen.' })
    } finally {
      setBusy(false)
    }
  }

  if (!isAdmin) return <div className={`${pageClass} p-8 text-center text-[#4B5563]`}>Lade…</div>

  return (
    <div className={pageClass}>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
        <header className="mb-6 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-[#1B4332] sm:text-3xl">⚙️ Einstellungen</h1>
          <BackToAdmin label="← Zurück zum Dashboard" />
        </header>

        <form onSubmit={submit} noValidate className={`${cardClass} p-6 sm:p-8`}>
          <h2 className="text-lg font-extrabold text-[#1B4332]" dir="auto">
            🔐 تغيير PIN للتصدير
          </h2>
          <p className="mt-1 text-sm text-[#4B5563]">PIN für das Export Center ändern (genau 4 Ziffern).</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <PinField id="old-pin" label="Old PIN" value={oldPin} onChange={setOldPin} autoComplete="current-password" />
            <PinField id="new-pin" label="New PIN" value={newPin} onChange={setNewPin} autoComplete="new-password" />
            <PinField id="confirm-pin" label="Confirm New PIN" value={confirmPin} onChange={setConfirmPin} autoComplete="new-password" />
          </div>

          {msg && (
            <p
              role="status"
              dir="auto"
              className={`mt-5 rounded-xl px-3 py-2 text-sm font-semibold ${
                msg.kind === 'ok' ? 'bg-[#14A090]/10 text-[#14A090]' : 'bg-[#E85D5D]/10 text-[#E85D5D]'
              }`}
            >
              {msg.text}
            </p>
          )}

          <button type="submit" className={`${btnPrimary} mt-6 w-full sm:w-auto`} disabled={busy}>
            {busy ? '⏳ …' : '💾 حفظ PIN الجديد'}
          </button>
        </form>
      </main>
    </div>
  )
}
