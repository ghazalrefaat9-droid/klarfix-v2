'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

const SERVICES = ['Wohnungsreinigung', 'Büroreinigung', 'Fensterreinigung', 'Grundreinigung']

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#0F60C6] focus:outline-none focus:ring-2 focus:ring-[#0F60C6]/30'

export default function PartnerRegisterPage() {
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [postcode, setPostcode] = useState('')
  const [services, setServices] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  function toggleService(service: string) {
    setServices((prev) => (prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]))
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: insertError } = await supabase.from('partners').insert({
      company_name: companyName,
      email,
      phone: phone || null,
      city: city || null,
      postcode: postcode || null,
      services,
    })

    setLoading(false)
    if (insertError) {
      setError(
        insertError.code === '23505'
          ? 'Diese E-Mail ist bereits registriert.'
          : 'Fehler bei der Registrierung. Bitte versuchen Sie es erneut.'
      )
      return
    }
    setSubmitted(true)
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold text-[#0F60C6]">Partner werden</h1>
      <p className="mb-8 text-gray-600">Registrieren Sie Ihr Unternehmen und erhalten Sie neue Aufträge.</p>

      {submitted ? (
        <div className="rounded-xl bg-green-50 p-8 text-center">
          <h2 className="text-2xl font-semibold text-green-700">Vielen Dank!</h2>
          <p className="mt-2 text-gray-600">Wir prüfen Ihre Daten. Sie erhalten eine Bestätigung per E-Mail.</p>
          <Link
            href="/partner/login"
            className="mt-6 inline-block rounded-lg bg-[#0F60C6] px-5 py-2 font-medium text-white hover:opacity-90"
          >
            Zum Partner-Login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5 rounded-xl bg-white p-6 shadow-sm">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Firmenname *</label>
              <input required value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">E-Mail *</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Telefon</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Stadt</label>
              <input value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">PLZ</label>
              <input value={postcode} onChange={(e) => setPostcode(e.target.value)} className={inputClass} />
            </div>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">Angebotene Services</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {SERVICES.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={services.includes(s)}
                    onChange={() => toggleService(s)}
                    className="h-4 w-4 accent-[#0F60C6]"
                  />
                  {s}
                </label>
              ))}
            </div>
          </fieldset>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#0F60C6] py-3 font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Wird gesendet…' : 'Registrieren'}
          </button>
        </form>
      )}
    </main>
  )
}
