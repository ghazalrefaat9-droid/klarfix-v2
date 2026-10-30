'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#0F60C6] focus:outline-none focus:ring-2 focus:ring-[#0F60C6]/30'

export default function PartnerLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: queryError } = await supabase
      .from('partners')
      .select('id, company_name, email')
      .eq('email', email.trim())
      .maybeSingle()

    setLoading(false)
    if (queryError) {
      setError('Fehler beim Login. Bitte versuchen Sie es erneut.')
      return
    }
    if (!data) {
      setError('Kein Partner mit dieser E-Mail gefunden.')
      return
    }

    localStorage.setItem('partner', JSON.stringify(data))
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
