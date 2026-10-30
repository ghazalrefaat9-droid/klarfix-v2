'use client'

import { useState, type ChangeEvent, type FormEvent } from 'react'
import { supabase } from '@/lib/supabaseClient'

const SERVICES = ['Wohnungsreinigung', 'Büroreinigung', 'Fensterreinigung', 'Grundreinigung']

const emptyForm = {
  customer_name: '',
  customer_email: '',
  customer_phone: '',
  postcode: '',
  service_type: '',
  area_sqm: '',
  message: '',
}

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#0F60C6] focus:outline-none focus:ring-2 focus:ring-[#0F60C6]/30'

export default function Home() {
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: insertError } = await supabase.from('requests').insert({
      customer_name: form.customer_name || null,
      customer_email: form.customer_email,
      customer_phone: form.customer_phone || null,
      postcode: form.postcode,
      service_type: form.service_type,
      area_sqm: form.area_sqm ? parseInt(form.area_sqm, 10) : null,
      message: form.message || null,
    })

    setLoading(false)
    if (insertError) {
      setError('Fehler beim Senden. Bitte versuchen Sie es erneut.')
      return
    }
    setSuccess(true)
    setForm(emptyForm)
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-[#0F60C6]">KlarFix</h1>
        <p className="mt-2 text-gray-600">Fordern Sie unverbindlich Ihren Reinigungspreis an.</p>
      </header>

      {success ? (
        <div className="rounded-xl bg-green-50 p-8 text-center">
          <h2 className="text-2xl font-semibold text-green-700">Anfrage gesendet!</h2>
          <p className="mt-2 text-gray-600">Wir melden uns in Kürze mit Ihrem Angebot.</p>
          <button
            onClick={() => setSuccess(false)}
            className="mt-6 rounded-lg bg-[#0F60C6] px-5 py-2 font-medium text-white hover:opacity-90"
          >
            Neue Anfrage
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5 rounded-xl bg-white p-6 shadow-sm">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <input name="customer_name" value={form.customer_name} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">E-Mail *</label>
              <input
                type="email"
                name="customer_email"
                required
                value={form.customer_email}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Telefon</label>
              <input
                type="tel"
                name="customer_phone"
                value={form.customer_phone}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">PLZ *</label>
              <input name="postcode" required value={form.postcode} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Service *</label>
              <select name="service_type" required value={form.service_type} onChange={handleChange} className={inputClass}>
                <option value="">Bitte wählen</option>
                {SERVICES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Fläche m²</label>
              <input
                type="number"
                min="1"
                name="area_sqm"
                value={form.area_sqm}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Nachricht</label>
            <textarea name="message" rows={4} value={form.message} onChange={handleChange} className={inputClass} />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#0F60C6] py-3 font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Wird gesendet…' : 'Preis anfragen'}
          </button>
        </form>
      )}
    </main>
  )
}
