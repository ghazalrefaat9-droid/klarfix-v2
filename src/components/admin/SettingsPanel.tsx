'use client'

import { useEffect, useState, type FormEvent } from 'react'

const inputClass =
  'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#0F60C6] focus:outline-none focus:ring-2 focus:ring-[#0F60C6]/30'

type Loaded = { email: string; companyName: string; contactEmail: string }

export default function SettingsPanel({ onMessage }: { onMessage: (msg: string) => void }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [companyName, setCompanyName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/admin/settings')
      if (!res.ok) {
        setError('Einstellungen konnten nicht geladen werden.')
        return
      }
      const data = (await res.json()) as { email: string; companyName: string; contactEmail: string }
      setLoaded(data)
      setCompanyName(data.companyName)
      setContactEmail(data.contactEmail)
    }
    load()
  }, [])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    if (newPassword && newPassword !== confirmPassword) {
      setError('Die neuen Passwörter stimmen nicht überein.')
      return
    }

    setSaving(true)
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newEmail, newPassword, companyName, contactEmail }),
    })
    const data = (await res.json().catch(() => ({}))) as { error?: string; email?: string }
    setSaving(false)

    if (!res.ok) {
      setError(data.error ?? 'Speichern fehlgeschlagen.')
      return
    }

    if (data.email) {
      localStorage.setItem('admin', JSON.stringify({ email: data.email }))
    }
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setNewEmail('')
    onMessage('Einstellungen gespeichert.')

    const reload = await fetch('/api/admin/settings')
    if (reload.ok) {
      const fresh = (await reload.json()) as Loaded
      setLoaded(fresh)
      setCompanyName(fresh.companyName)
      setContactEmail(fresh.contactEmail)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-6 rounded-xl bg-white p-6 shadow-sm">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Allgemein</h2>
        <label className="block text-sm font-medium">
          Firmenname
          <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm font-medium">
          Kontakt-E-Mail für Benachrichtigungen
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className={inputClass}
          />
        </label>
      </section>

      <section className="space-y-4 border-t border-gray-200 pt-6">
        <h2 className="text-lg font-semibold">Zugang</h2>
        <p className="text-sm text-gray-500">
          Aktuelle Admin-E-Mail: <span className="font-medium text-gray-800">{loaded?.email || '–'}</span>
        </p>
        <label className="block text-sm font-medium">
          Neue E-Mail (leer lassen, wenn unverändert)
          <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm font-medium">
          Neues Passwort (mind. 8 Zeichen, leer lassen, wenn unverändert)
          <input
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block text-sm font-medium">
          Neues Passwort wiederholen
          <input
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
          />
        </label>
      </section>

      <section className="space-y-4 border-t border-gray-200 pt-6">
        <label className="block text-sm font-medium">
          Aktuelles Passwort (zur Bestätigung erforderlich) *
          <input
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClass}
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[#0F60C6] px-5 py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Speichern…' : 'Einstellungen speichern'}
        </button>
      </section>
    </form>
  )
}
