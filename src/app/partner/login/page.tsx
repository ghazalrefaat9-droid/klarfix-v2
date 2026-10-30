'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import PasswordInput from '@/components/PasswordInput'

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#0F60C6] focus:outline-none focus:ring-2 focus:ring-[#0F60C6]/30'

export default function PartnerLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/partner/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    setLoading(false)

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      setError(data.error ?? 'Fehler beim Login. Bitte versuchen Sie es erneut.')
      return
    }

    const partner = (await res.json()) as { id: string; company_name: string; email: string }
    localStorage.setItem('partner', JSON.stringify(partner))
    router.push('/partner/dashboard')
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-6 text-3xl font-bold text-[#0F60C6]">Partner-Login</h1>
      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl bg-white p-6 shadow-sm">
        <div>
          <label className="mb-1 block text-sm font-medium">E-Mail</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Passwort</label>
          <PasswordInput
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[#0F60C6] py-3 font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Prüfe…' : 'Einloggen'}
        </button>
      </form>
    </main>
  )
}
