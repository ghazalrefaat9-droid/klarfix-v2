'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Minus, Plus } from 'lucide-react'
import {
  APPLICATION_LANGUAGES,
  APPLICATION_SERVICES,
  PRICE_MAX,
  PRICE_MIN,
  RADIUS_MAX,
  RADIUS_MIN,
  TEAM_MAX,
  TEAM_MIN,
} from '@/lib/applications'

const TEAL = '#14B8A6'
const inputClass =
  'w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base outline-none focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/30'

type ServiceState = Record<string, { on: boolean; price: number }>

function Bi({ de, ar }: { de: string; ar: string }) {
  return (
    <span className="flex flex-wrap items-baseline justify-between gap-x-2">
      <span>{de}</span>
      <span dir="rtl" lang="ar" className="text-gray-500">
        {ar}
      </span>
    </span>
  )
}

export default function PartnerBewerbenPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phoneFixed, setPhoneFixed] = useState('')
  const [phoneWhatsapp, setPhoneWhatsapp] = useState('')
  const [city, setCity] = useState('Stuttgart')
  const [companyAddress, setCompanyAddress] = useState('')

  const [services, setServices] = useState<ServiceState>(() =>
    Object.fromEntries(APPLICATION_SERVICES.map((s) => [s.key, { on: false, price: 35 }]))
  )

  const [teamSize, setTeamSize] = useState(1)
  const [languages, setLanguages] = useState<string[]>(['DE'])
  const [workRadius, setWorkRadius] = useState(20)
  const [hasGewerbe, setHasGewerbe] = useState(false)
  const [hasHaftpflicht, setHasHaftpflicht] = useState(false)

  const step1Valid =
    fullName.trim() !== '' &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    phoneFixed.trim() !== '' &&
    city.trim() !== '' &&
    companyAddress.trim() !== ''
  const step2Valid = Object.values(services).some((s) => s.on)

  const updateService = (key: string, patch: Partial<ServiceState[string]>) =>
    setServices((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))

  const toggleLanguage = (code: string) =>
    setLanguages((prev) => (prev.includes(code) ? prev.filter((l) => l !== code) : [...prev, code]))

  async function submit() {
    setError('')
    setSubmitting(true)
    const data = {
      full_name: fullName.trim(),
      email: email.trim(),
      phone_fixed: phoneFixed.trim(),
      phone_whatsapp: phoneWhatsapp.trim() || null,
      city: city.trim(),
      company_address: companyAddress.trim(),
      services: APPLICATION_SERVICES.filter((s) => services[s.key].on).map((s) => ({
        key: s.key,
        price: services[s.key].price,
      })),
      team_size: teamSize,
      languages,
      work_radius: workRadius,
      has_gewerbe: hasGewerbe,
      has_haftpflicht: hasHaftpflicht,
    }
    try {
      const res = await fetch('/api/partner/bewerben', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        setError(body?.error ?? 'Antrag konnte nicht gesendet werden.')
        setSubmitting(false)
        return
      }
      router.push('/partner/bewerben/danke')
    } catch {
      setError('Verbindungsfehler. Bitte erneut versuchen.')
      setSubmitting(false)
    }
  }

  const primaryBtn =
    'rounded-2xl bg-[#14B8A6] px-6 py-3 text-base font-semibold text-white shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none'
  const secondaryBtn =
    'rounded-2xl border border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50'

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between text-sm font-medium text-gray-600">
          <span>Schritt {step}/3</span>
          <span dir="rtl" lang="ar">
            الخطوة {step}/3
          </span>
        </div>
        <div className="flex items-center">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex flex-1 items-center last:flex-none">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  n <= step ? 'bg-[#14B8A6] text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {n < step ? <Check className="h-4 w-4" /> : n}
              </div>
              {n < 3 && <div className={`mx-1 h-1 flex-1 rounded ${n < step ? 'bg-[#14B8A6]' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-lg">
        {step === 1 && (
          <div className="space-y-4">
            <h1 className="text-xl font-bold text-gray-900">
              <Bi de="Grunddaten" ar="البيانات الأساسية" />
            </h1>
            <label className="block text-sm font-medium">
              <Bi de="Vollständiger Name *" ar="الاسم الكامل" />
              <input className={`${inputClass} mt-1`} value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </label>
            <label className="block text-sm font-medium">
              <Bi de="E-Mail *" ar="البريد الإلكتروني" />
              <input type="email" className={`${inputClass} mt-1`} value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label className="block text-sm font-medium">
              <Bi de="Telefon Festnetz *" ar="هاتف ثابت" />
              <input
                type="tel"
                className={`${inputClass} mt-1`}
                placeholder="0711 / 123456"
                value={phoneFixed}
                onChange={(e) => setPhoneFixed(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm font-medium">
              <Bi de="WhatsApp (optional)" ar="واتساب (اختياري)" />
              <input
                type="tel"
                className={`${inputClass} mt-1`}
                placeholder="+49 1XX XXX XXXX"
                value={phoneWhatsapp}
                onChange={(e) => setPhoneWhatsapp(e.target.value)}
              />
            </label>
            <label className="block text-sm font-medium">
              <Bi de="Stadt *" ar="المدينة" />
              <input className={`${inputClass} mt-1`} value={city} onChange={(e) => setCity(e.target.value)} required />
            </label>
            <label className="block text-sm font-medium">
              <Bi de="Firmenadresse *" ar="عنوان الشركة" />
              <input
                className={`${inputClass} mt-1`}
                placeholder="Hauptstr. 12, 70173 Stuttgart"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                required
              />
            </label>
            <div className="flex justify-end pt-2">
              <button type="button" className={primaryBtn} disabled={!step1Valid} onClick={() => setStep(2)}>
                Weiter / التالي
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h1 className="text-xl font-bold text-gray-900">
              <Bi de="Welche Reinigung bieten Sie?" ar="ما خدمات التنظيف؟" />
            </h1>
            <p className="text-sm text-gray-500">
              Mindestens eine Leistung wählen und Ihren Preis festlegen ({PRICE_MIN}–{PRICE_MAX} €).
            </p>
            <ul className="space-y-3">
              {APPLICATION_SERVICES.map((s) => {
                const st = services[s.key]
                return (
                  <li key={s.key} className="rounded-2xl border border-gray-200 p-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={st.on}
                        aria-label={s.de}
                        onClick={() => updateService(s.key, { on: !st.on })}
                        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${st.on ? 'bg-green-500' : 'bg-gray-300'}`}
                      >
                        <span
                          className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                            st.on ? 'translate-x-5' : ''
                          }`}
                        />
                      </button>
                      <div className="min-w-0 flex-1 text-sm font-medium">
                        <Bi de={s.de} ar={s.ar} />
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <input
                        type="range"
                        min={PRICE_MIN}
                        max={PRICE_MAX}
                        step={1}
                        value={st.price}
                        disabled={!st.on}
                        aria-label={`${s.de} Preis`}
                        onChange={(e) => updateService(s.key, { price: Number(e.target.value) })}
                        className="h-2 flex-1 accent-[#14B8A6] disabled:cursor-not-allowed disabled:opacity-40"
                      />
                      <span
                        className={`w-14 rounded-full py-1 text-center text-sm font-bold ${
                          st.on ? 'bg-[#14B8A6]/15 text-[#0f8f80]' : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {st.price}€
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
            <div className="flex justify-between pt-2">
              <button type="button" className={secondaryBtn} onClick={() => setStep(1)}>
                Zurück / رجوع
              </button>
              <button type="button" className={primaryBtn} disabled={!step2Valid} onClick={() => setStep(3)}>
                Weiter / التالي
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h1 className="text-xl font-bold text-gray-900">
              <Bi de="Bestätigung" ar="التأكيد" />
            </h1>

            <div>
              <p className="mb-2 text-sm font-medium">
                <Bi de="Teamgröße" ar="حجم الفريق" />
              </p>
              <div className="flex items-center justify-center gap-6">
                <button
                  type="button"
                  aria-label="Weniger"
                  disabled={teamSize <= TEAM_MIN}
                  onClick={() => setTeamSize((n) => Math.max(TEAM_MIN, n - 1))}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
                >
                  <Minus className="h-5 w-5" />
                </button>
                <span className="w-10 text-center text-2xl font-bold">{teamSize}</span>
                <button
                  type="button"
                  aria-label="Mehr"
                  disabled={teamSize >= TEAM_MAX}
                  onClick={() => setTeamSize((n) => Math.min(TEAM_MAX, n + 1))}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">
                <Bi de="Sprachen" ar="اللغات" />
              </p>
              <div className="flex flex-wrap gap-2">
                {APPLICATION_LANGUAGES.map((code) => {
                  const active = languages.includes(code)
                  return (
                    <button
                      key={code}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleLanguage(code)}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        active ? 'border-[#14B8A6] bg-[#14B8A6] text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-[#14B8A6]'
                      }`}
                    >
                      {code}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <p className="mb-2 flex items-center justify-between text-sm font-medium">
                <span className="flex-1">
                  <Bi de="Arbeitsradius" ar="نطاق العمل" />
                </span>
                <span className="ml-3 rounded-full bg-[#14B8A6]/15 px-3 py-1 font-bold text-[#0f8f80]">{workRadius} km</span>
              </p>
              <input
                type="range"
                min={RADIUS_MIN}
                max={RADIUS_MAX}
                step={1}
                value={workRadius}
                onChange={(e) => setWorkRadius(Number(e.target.value))}
                aria-label="Arbeitsradius"
                className="h-2 w-full accent-[#14B8A6]"
              />
            </div>

            <div className="space-y-3">
              {[
                { checked: hasGewerbe, set: setHasGewerbe, de: 'Ich besitze ein Gewerbe', ar: 'هل لديك سجل تجاري Gewerbe؟' },
                { checked: hasHaftpflicht, set: setHasHaftpflicht, de: 'Ich besitze Haftpflicht', ar: 'هل لديك تأمين Haftpflicht؟' },
              ].map((c) => (
                <label key={c.de} className="flex cursor-pointer items-center gap-4 rounded-2xl border border-gray-200 p-4 hover:border-[#14B8A6]">
                  <input type="checkbox" checked={c.checked} onChange={(e) => c.set(e.target.checked)} className="peer sr-only" />
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-gray-300 text-transparent peer-checked:border-[#14B8A6] peer-checked:bg-[#14B8A6] peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-[#14B8A6]/50"
                    aria-hidden
                  >
                    <Check className="h-6 w-6" strokeWidth={3} />
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-medium">
                    <Bi de={c.de} ar={c.ar} />
                  </span>
                </label>
              ))}
            </div>

            <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
              <p>
                <strong>Hinweis:</strong> Kein Upload jetzt. Dokumente werden nach Annahme angefordert.
              </p>
              <p dir="rtl" lang="ar" className="mt-1">
                <strong>ملاحظة:</strong> لا حاجة لرفع الوثائق الآن، سيتم طلب صور الوثائق بعد قبول طلبك
              </p>
            </div>

            {error && (
              <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                style={{ backgroundColor: submitting ? undefined : TEAL }}
                className="w-full rounded-2xl px-6 py-4 text-lg font-bold text-white shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {submitting ? 'Wird gesendet…' : 'Antrag senden (إرسال الطلب)'}
              </button>
              <button type="button" className={secondaryBtn} disabled={submitting} onClick={() => setStep(2)}>
                Zurück / رجوع
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
