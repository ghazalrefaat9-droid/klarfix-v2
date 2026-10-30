'use client'

import { Suspense, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import PasswordInput from '@/components/PasswordInput'

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#0F60C6] focus:outline-none focus:ring-2 focus:ring-[#0F60C6]/30'

type Props = {
  accountType: 'partner' | 'admin'
  loginHref: string
}

function ResetForm({ accountType, loginHref }: Props) {
  const params = useSearchParams()
  const linkEmail = params.get('email') ?? ''
  const linkCode = params.get('code') ?? ''
  const fromLink = !!linkEmail && /^\d{6}$/.test(linkCode)

  const [step, setStep] = useState<'email' | 'code' | 'done'>(fromLink ? 'code' : 'email')
  const [email, setEmail] = useState(linkEmail)
  const [code, setCode] = useState(fromLink ? linkCode : '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function requestCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setInfo('')
    const res = await fetch('/api/password/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountType, email }),
    }).catch(() => null)
    setLoading(false)

    if (!res) {
      setError('Netzwerkfehler. Bitte versuchen Sie es erneut.')
      return
    }
    const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string }
    if (!res.ok) {
      setError(data.error ?? 'Fehler beim Senden des Codes.')
      return
    }
    setInfo(data.message ?? '')
    setStep('code')
  }

  async function resetPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) {
      setError('Die Passwörter stimmen nicht überein.')
      return
    }
    setLoading(true)
    const res = await fetch('/api/password/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountType, email, code, newPassword }),
    }).catch(() => null)
    setLoading(false)

    if (!res) {
      setError('Netzwerkfehler. Bitte versuchen Sie es erneut.')
      return
    }
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      setError(data.error ?? 'Das Passwort konnte nicht geändert werden.')
      return
    }
    setStep('done')
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-6 text-3xl font-bold text-[#0F60C6]">Passwort zurücksetzen</h1>

      {step === 'email' && (
        <form onSubmit={requestCode} className="space-y-5 rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-600">
            Geben Sie Ihre E-Mail-Adresse ein. Wir senden Ihnen einen 6-stelligen Code.
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium">E-Mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#0F60C6] py-3 font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Sende Code…' : 'Code senden'}
          </button>
        </form>
      )}

      {step === 'code' && (
        <form onSubmit={resetPassword} className="space-y-5 rounded-xl bg-white p-6 shadow-sm">
          {info && <p className="rounded-lg bg-blue-50 p-3 text-sm text-[#0F60C6]">{info}</p>}
          <div>
            <label className="mb-1 block text-sm font-medium">Bestätigungscode (6 Ziffern)</label>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className={`${inputClass} text-center text-2xl tracking-[0.5em]`}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Neues Passwort (mind. 8 Zeichen)</label>
            <PasswordInput
              required
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Neues Passwort bestätigen</label>
            <PasswordInput
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#0F60C6] py-3 font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Speichere…' : 'Passwort speichern'}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('email')
              setError('')
            }}
            className="w-full text-sm text-gray-500 hover:underline"
          >
            Keinen Code erhalten? Erneut anfordern
          </button>
        </form>
      )}

      {step === 'done' && (
        <div className="space-y-5 rounded-xl bg-white p-6 text-center shadow-sm">
          <p className="text-lg font-semibold text-green-700">Ihr Passwort wurde geändert.</p>
          <Link
            href={loginHref}
            className="inline-block rounded-lg bg-[#0F60C6] px-6 py-3 font-semibold text-white hover:opacity-90"
          >
            Zum Login
          </Link>
        </div>
      )}
    </main>
  )
}

export default function PasswordResetForm(props: Props) {
  return (
    <Suspense fallback={null}>
      <ResetForm {...props} />
    </Suspense>
  )
}
