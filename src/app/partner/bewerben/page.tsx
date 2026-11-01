'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Sparkles } from 'lucide-react'
import {
  APPLICATION_LANGUAGES,
  CLEANING_PRICE_MAX,
  CLEANING_PRICE_MIN,
  CLEANING_TYPES,
  DEFAULT_CLEANING_PRICES,
  RADIUS_MAX,
  RADIUS_MIN,
  type CleaningTypeId,
} from '@/lib/applications'

const BLUE = '#2563eb'
const inputClass =
  'w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/30'

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

  const [anrede, setAnrede] = useState('')
  const [vorname, setVorname] = useState('')
  const [nachname, setNachname] = useState('')
  const [email, setEmail] = useState('')
  const [phoneFixed, setPhoneFixed] = useState('')
  const [phoneWhatsapp, setPhoneWhatsapp] = useState('')
  const [city, setCity] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')

  const [employeeCount, setEmployeeCount] = useState(1)
  const [selectedServices, setSelectedServices] = useState<CleaningTypeId[]>([])
  const [servicePrices, setServicePrices] = useState<Partial<Record<CleaningTypeId, number>>>({})
  const [servicesError, setServicesError] = useState('')
  const [languages, setLanguages] = useState<string[]>(['DE'])
  const [workRadius, setWorkRadius] = useState(20)
  const [hasGewerbe, setHasGewerbe] = useState(false)
  const [hasHaftpflicht, setHasHaftpflicht] = useState(false)

  const fullName = `${anrede} ${vorname} ${nachname}`.trim()
  const step1Valid =
    anrede !== '' &&
    vorname.trim() !== '' &&
    nachname.trim() !== '' &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    phoneFixed.trim() !== '' &&
    city.trim() !== '' &&
    companyAddress.trim() !== ''
  const step2Valid =
    Number.isInteger(employeeCount) &&
    employeeCount >= 1 &&
    employeeCount <= 50 &&
    selectedServices.length > 0 &&
    selectedServices.every((id) => {
      const price = servicePrices[id]
      return price !== undefined && Number.isInteger(price) && price >= CLEANING_PRICE_MIN && price <= CLEANING_PRICE_MAX
    })

  const toggleService = (id: CleaningTypeId) => {
    if (selectedServices.includes(id)) {
      setSelectedServices((prev) => prev.filter((s) => s !== id))
    } else {
      setSelectedServices((prev) => [...prev, id])
      setServicePrices((prev) => ({ ...prev, [id]: prev[id] ?? DEFAULT_CLEANING_PRICES[id] }))
      setServicesError('')
    }
  }

  const goToStep3 = () => {
    if (selectedServices.length === 0) {
      setServicesError('Bitte wählen Sie mindestens eine Reinigungsart')
      return
    }
    if (!step2Valid) return
    setStep(3)
  }

  const toggleLanguage = (code: string) =>
    setLanguages((prev) => (prev.includes(code) ? prev.filter((l) => l !== code) : [...prev, code]))

  async function submit() {
    setError('')
    setSubmitting(true)
    const data = {
      full_name: fullName.trim(),
      vorname: vorname.trim(),
      nachname: nachname.trim(),
      anrede,
      vollstaendiger_name: fullName.trim(),
      fullName: fullName.trim(),
      email: email.trim(),
      phone_fixed: phoneFixed.trim(),
      phone_whatsapp: phoneWhatsapp.trim() || null,
      city: city.trim(),
      company_address: companyAddress.trim(),
      employee_count: employeeCount,
      cleaning_prices: Object.fromEntries(selectedServices.map((id) => [id, servicePrices[id]])),
      cleaning_types: selectedServices,
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
    'rounded-2xl bg-[#2563eb] px-6 py-3 text-base font-semibold text-white shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none'
  const secondaryBtn =
    'rounded-2xl border border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50'

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between text-sm font-medium text-gray-600">
          <span>Schritt {step}/3 · {['Persönlich', 'Unternehmen', 'Bestätigung'][step - 1]}</span>
          <span dir="rtl" lang="ar">
            الخطوة {step}/3
          </span>
        </div>
        <div className="flex items-center">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex flex-1 items-center last:flex-none">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  n <= step ? 'bg-[#2563eb] text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {n < step ? <Check className="h-4 w-4" /> : n}
              </div>
              {n < 3 && <div className={`mx-1 h-1 flex-1 rounded ${n < step ? 'bg-[#2563eb]' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-lg">
        {step === 1 && (
          <div className="space-y-4">
            <h1 className="text-xl font-bold text-gray-900">
              <Bi de="Persönlich" ar="البيانات الشخصية" />
            </h1>
            <label className="block text-sm font-medium">
              <Bi de="Anrede *" ar="صيغة المخاطبة" />
              <select
                className={`${inputClass} mt-1`}
                value={anrede}
                onChange={(e) => setAnrede(e.target.value)}
                required
              >
                <option value="" disabled>
                  Bitte auswählen
                </option>
                <option value="Herr">Herr</option>
                <option value="Frau">Frau</option>
                <option value="Divers">Divers</option>
                <option value="Dr.">Dr.</option>
                <option value="Firma">Firma</option>
              </select>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="block text-sm font-medium">
                <Bi de="Vorname *" ar="الاسم الأول" />
                <input
                  className={`${inputClass} mt-1`}
                  placeholder=""
                  value={vorname}
                  onChange={(e) => setVorname(e.target.value)}
                  required
                />
              </label>
              <label className="block text-sm font-medium">
                <Bi de="Nachname *" ar="اسم العائلة" />
                <input
                  className={`${inputClass} mt-1`}
                  placeholder=""
                  value={nachname}
                  onChange={(e) => setNachname(e.target.value)}
                  required
                />
              </label>
            </div>
            {anrede && vorname.trim() && nachname.trim() && (
              <p className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-gray-700">
                <span className="font-semibold">Vollständiger Name:</span> {fullName}
              </p>
            )}
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
              <input
                className={`${inputClass} mt-1`}
                placeholder="z.B. Stuttgart"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm font-medium">
              <Bi de="Firmenadresse *" ar="عنوان الشركة" />
              <input
                className={`${inputClass} mt-1`}
                placeholder="z.B. Hauptstr. 12, 70173 Stuttgart"
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
              <Bi de="Unternehmen" ar="الشركة" />
            </h1>
            <p className="text-sm text-gray-500">
              Wählen Sie Ihre Leistungen und legen Sie Ihren Preis fest ({CLEANING_PRICE_MIN}–{CLEANING_PRICE_MAX} € pro Stunde).
            </p>
            <div className="space-y-4 rounded-3xl border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-[22px] font-bold tracking-tight text-gray-900">Anzahl Mitarbeiter</h3>
                <div className="rounded-full bg-[#2563eb] px-5 py-2 text-[17px] font-bold text-white shadow-lg" aria-live="polite">
                  {employeeCount} Mitarbeiter
                </div>
              </div>

              <div className="relative pt-2">
                <input
                  type="range"
                  min={1}
                  max={50}
                  step={1}
                  value={employeeCount}
                  aria-label="Anzahl Mitarbeiter"
                  onChange={(e) => setEmployeeCount(parseInt(e.target.value, 10))}
                  className="h-[14px] w-full cursor-pointer appearance-none rounded-full bg-[#eef2ff] [&::-moz-range-thumb]:h-9 [&::-moz-range-thumb]:w-9 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[#2563eb] [&::-webkit-slider-thumb]:h-9 [&::-webkit-slider-thumb]:w-9 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#2563eb] [&::-webkit-slider-thumb]:shadow-lg"
                  style={{
                    background: `linear-gradient(to right, #2563eb ${((employeeCount - 1) / 49) * 100}%, #eef2ff ${((employeeCount - 1) / 49) * 100}%)`,
                  }}
                />
                <div className="mt-2 flex justify-between text-[13px] font-medium text-gray-400">
                  <span>1</span>
                  <span>50</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Weniger Mitarbeiter"
                  onClick={() => setEmployeeCount((n) => Math.max(1, n - 1))}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white text-xl font-light shadow-sm hover:bg-gray-50"
                >
                  —
                </button>
                <div className="flex h-12 flex-1 items-center justify-center rounded-full border border-[#e0e7ff] bg-[#f8faff]">
                  <div className="mx-4 h-1 w-full rounded-full bg-[#e0e7ff] opacity-50" />
                </div>
                <button
                  type="button"
                  aria-label="Mehr Mitarbeiter"
                  onClick={() => setEmployeeCount((n) => Math.min(50, n + 1))}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2563eb] text-2xl font-light text-white shadow-md hover:bg-blue-700"
                >
                  +
                </button>
              </div>

              <p className="pt-1 text-center text-[14px] text-gray-400">Ziehen zum Einstellen</p>
            </div>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Reinigungsarten *</h3>
              <span
                className={`rounded-full px-3 py-1 text-sm font-semibold ${
                  selectedServices.length > 0 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                }`}
                aria-live="polite"
              >
                {selectedServices.length} ausgewählt
              </span>
            </div>
            <ul className="space-y-3">
              {CLEANING_TYPES.map((type) => {
                const isSelected = selectedServices.includes(type.id)
                const price = servicePrices[type.id] ?? DEFAULT_CLEANING_PRICES[type.id]
                return (
                  <li
                    key={type.id}
                    className={`mb-3 flex flex-col justify-between gap-4 rounded-xl border p-4 transition sm:flex-row sm:items-center ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/30 shadow-md'
                        : 'border-gray-200 bg-white opacity-80 hover:border-gray-300'
                    }`}
                  >
                    <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleService(type.id)}
                        aria-label={type.label}
                        className="mt-1 h-4 w-4 shrink-0 accent-blue-600"
                      />
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                          isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        <Sparkles className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-bold text-gray-900">{type.label}</span>
                        <span className="mt-1 block text-sm font-normal text-gray-500">{type.desc}</span>
                      </span>
                    </label>
                    {isSelected ? (
                      <div className="w-full shrink-0 sm:w-52">
                        <div className="mb-2 flex justify-end">
                          <span className="rounded-full bg-blue-600 px-3 py-1 text-sm font-bold text-white">{price} €/h</span>
                        </div>
                        <input
                          type="range"
                          min={CLEANING_PRICE_MIN}
                          max={CLEANING_PRICE_MAX}
                          step={1}
                          value={price}
                          aria-label={`${type.label} Preis`}
                          onChange={(event) =>
                            setServicePrices((current) => ({ ...current, [type.id]: Number(event.target.value) }))
                          }
                          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-blue-100 accent-blue-600"
                        />
                        <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                          <span>{CLEANING_PRICE_MIN} €</span>
                          <span>Aktuell: {price} €/h</span>
                          <span>{CLEANING_PRICE_MAX} €</span>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleService(type.id)}
                        className="shrink-0 self-end rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:border-blue-600 hover:text-blue-600 sm:self-center"
                      >
                        Auswählen
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
            {servicesError && (
              <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {servicesError}
              </p>
            )}
            <div className="flex justify-between pt-2">
              <button type="button" className={secondaryBtn} onClick={() => setStep(1)}>
                Zurück / رجوع
              </button>
              <button type="button" className={primaryBtn} onClick={goToStep3}>
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

            <section className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
              <h2 className="font-semibold text-gray-900">Ihre Unternehmensangaben</h2>
              <p className="mt-1 text-sm text-gray-600">Mitarbeiter: {employeeCount}</p>
              <ul className="mt-3 space-y-1 text-sm text-gray-700">
                {CLEANING_TYPES.filter((type) => selectedServices.includes(type.id)).map((type) => (
                  <li key={type.id} className="flex justify-between gap-4">
                    <span>{type.label}</span>
                    <span className="shrink-0 font-semibold">{servicePrices[type.id]} €/h</span>
                  </li>
                ))}
              </ul>
            </section>

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
                        active ? 'border-[#2563eb] bg-[#2563eb] text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-[#2563eb]'
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
                <span className="ml-3 rounded-full bg-[#2563eb]/15 px-3 py-1 font-bold text-blue-700">{workRadius} km</span>
              </p>
              <input
                type="range"
                min={RADIUS_MIN}
                max={RADIUS_MAX}
                step={1}
                value={workRadius}
                onChange={(e) => setWorkRadius(Number(e.target.value))}
                aria-label="Arbeitsradius"
                className="h-2 w-full accent-blue-600"
              />
            </div>

            <div className="space-y-3">
              {[
                { checked: hasGewerbe, set: setHasGewerbe, de: 'Ich besitze ein Gewerbe', ar: 'هل لديك سجل تجاري Gewerbe؟' },
                { checked: hasHaftpflicht, set: setHasHaftpflicht, de: 'Ich besitze Haftpflicht', ar: 'هل لديك تأمين Haftpflicht؟' },
              ].map((c) => (
                <label key={c.de} className="flex cursor-pointer items-center gap-4 rounded-2xl border border-gray-200 p-4 hover:border-[#2563eb]">
                  <input type="checkbox" checked={c.checked} onChange={(e) => c.set(e.target.checked)} className="peer sr-only" />
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-gray-300 text-transparent peer-checked:border-[#2563eb] peer-checked:bg-[#2563eb] peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-[#2563eb]/50"
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
                style={{ backgroundColor: submitting ? undefined : BLUE }}
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
