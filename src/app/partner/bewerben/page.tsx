'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Sparkles } from 'lucide-react'
import { useLang } from '@/components/LanguageProvider'
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

type SubmitError = '' | 'invalid' | 'requirements' | 'save' | 'network'

type AddressSuggestion = {
  city: string
  postcode: string
  state: string
  street: string
  housenumber: string
  lat: number
  lon: number
}

type PhotonFeature = {
  geometry: { coordinates: [number, number] }
  properties: {
    name?: string
    city?: string
    postcode?: string
    state?: string
    street?: string
    housenumber?: string
    countrycode?: string
  }
}

// Photon is built for search-as-you-type; the public Nominatim API forbids autocomplete use.
const PHOTON_URL = 'https://photon.komoot.io/api/'
const GERMANY_BBOX = '5.87,47.27,15.04,55.06'
const AUTOCOMPLETE_DELAY_MS = 300
const MAX_SUGGESTIONS = 6

type PhotonPlace = AddressSuggestion & { name: string }

async function searchPhoton(params: Record<string, string>, signal: AbortSignal): Promise<PhotonPlace[]> {
  const query = new URLSearchParams({ lang: 'de', limit: '15', bbox: GERMANY_BBOX, ...params })
  const res = await fetch(`${PHOTON_URL}?${query}`, { signal })
  if (!res.ok) throw new Error(`Photon ${res.status}`)
  const data = (await res.json()) as { features?: PhotonFeature[] }
  return (data.features ?? [])
    .filter((f) => f.properties.countrycode === 'DE')
    .map((f) => ({
      name: f.properties.name ?? '',
      city: f.properties.city ?? '',
      postcode: f.properties.postcode ?? '',
      state: f.properties.state ?? '',
      street: f.properties.street ?? '',
      housenumber: f.properties.housenumber ?? '',
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
    }))
}

function uniqueBy<T>(items: T[], key: (item: T) => string) {
  const seen = new Set<string>()
  return items.filter((item) => {
    const k = key(item)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

const suggestionListClass =
  'absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-gray-200 bg-white text-sm font-normal shadow-xl'
const suggestionItemClass = 'cursor-pointer border-b border-gray-100 p-3 last:border-0 hover:bg-blue-50'

export default function PartnerBewerbenPage() {
  const router = useRouter()
  const { t, lang } = useLang()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<SubmitError>('')

  const [anrede, setAnrede] = useState('')
  const [vorname, setVorname] = useState('')
  const [nachname, setNachname] = useState('')
  const [email, setEmail] = useState('')
  const [phoneFixed, setPhoneFixed] = useState('')
  const [phoneWhatsapp, setPhoneWhatsapp] = useState('')
  const [street, setStreet] = useState('')
  const [houseNumber, setHouseNumber] = useState('')
  const [plz, setPLZ] = useState('')
  const [city, setCity] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [showMap, setShowMap] = useState(false)
  const [streetSuggestions, setStreetSuggestions] = useState<AddressSuggestion[]>([])
  const [plzSuggestions, setPlzSuggestions] = useState<AddressSuggestion[]>([])
  const [citySuggestions, setCitySuggestions] = useState<AddressSuggestion[]>([])
  const searchTimers = useRef<Partial<Record<'street' | 'plz' | 'city', ReturnType<typeof setTimeout>>>>({})
  const searchControllers = useRef<Partial<Record<'street' | 'plz' | 'city', AbortController>>>({})

  const [employeeCount, setEmployeeCount] = useState(1)
  const [selectedServices, setSelectedServices] = useState<CleaningTypeId[]>([])
  const [servicePrices, setServicePrices] = useState<Partial<Record<CleaningTypeId, number>>>({})
  const [servicesError, setServicesError] = useState(false)
  const [languages, setLanguages] = useState<string[]>(['DE'])
  const [workRadius, setWorkRadius] = useState(20)
  const [hasGewerbe, setHasGewerbe] = useState(false)
  const [hasHaftpflicht, setHasHaftpflicht] = useState(false)
  const requirementsMet = hasGewerbe && hasHaftpflicht

  const fullName = `${anrede} ${vorname} ${nachname}`.trim()
  const streetLine = [street.trim(), houseNumber.trim()].filter(Boolean).join(' ')
  const companyAddress = `${streetLine}, ${plz} ${city.trim()}`
  const step1Valid =
    anrede !== '' &&
    vorname.trim() !== '' &&
    nachname.trim() !== '' &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    phoneFixed.trim() !== '' &&
    street.trim() !== '' &&
    /^\d{5}$/.test(plz) &&
    city.trim() !== ''
  const step2Valid =
    Number.isInteger(employeeCount) &&
    employeeCount >= 1 &&
    employeeCount <= 50 &&
    selectedServices.length > 0 &&
    selectedServices.every((id) => {
      const price = servicePrices[id]
      return price !== undefined && Number.isInteger(price) && price >= CLEANING_PRICE_MIN && price <= CLEANING_PRICE_MAX
    })

  useEffect(() => {
    const timers = searchTimers.current
    const controllers = searchControllers.current
    return () => {
      Object.values(timers).forEach((t) => clearTimeout(t))
      Object.values(controllers).forEach((c) => c?.abort())
    }
  }, [])

  const cancelSearch = (field: 'street' | 'plz' | 'city') => {
    clearTimeout(searchTimers.current[field])
    searchControllers.current[field]?.abort()
  }

  const scheduleSearch = (
    field: 'street' | 'plz' | 'city',
    run: (signal: AbortSignal) => Promise<AddressSuggestion[]>,
    setSuggestions: (s: AddressSuggestion[]) => void
  ) => {
    cancelSearch(field)
    searchTimers.current[field] = setTimeout(async () => {
      const controller = new AbortController()
      searchControllers.current[field] = controller
      try {
        const results = await run(controller.signal)
        if (!controller.signal.aborted) setSuggestions(results.slice(0, MAX_SUGGESTIONS))
      } catch (err) {
        if (!controller.signal.aborted) {
          console.warn('Adressvorschläge nicht verfügbar', err)
          setSuggestions([])
        }
      }
    }, AUTOCOMPLETE_DELAY_MS)
  }

  const handleCitySearch = (q: string) => {
    setCity(q)
    setCoords(null)
    if (q.trim().length < 2) {
      cancelSearch('city')
      setCitySuggestions([])
      return
    }
    scheduleSearch(
      'city',
      async (signal) =>
        uniqueBy(
          (await searchPhoton({ q: q.trim(), layer: 'city' }, signal))
            .filter((p) => p.name)
            .map((p) => ({ ...p, city: p.name })),
          (s) => `${s.city}|${s.postcode}|${s.state}`
        ),
      setCitySuggestions
    )
  }

  const handlePLZSearch = (value: string) => {
    const q = value.replace(/\D/g, '').slice(0, 5)
    setPLZ(q)
    setCoords(null)
    if (q.length < 2) {
      cancelSearch('plz')
      setPlzSuggestions([])
      return
    }
    scheduleSearch(
      'plz',
      async (signal) => {
        // Photon matches 4-digit input exactly against foreign postcodes (e.g. LU "7372") instead of
        // prefix-matching German ones, so search by the 3-digit prefix and filter locally. A high limit plus
        // a bias toward the centre of Germany keeps foreign postcodes (e.g. PL "70-123") from crowding out
        // German results.
        const params = { q: q.length === 4 ? q.slice(0, 3) : q, limit: '50', lat: '51.16', lon: '10.45' }
        return uniqueBy(
          (await searchPhoton({ ...params, osm_tag: 'place:postcode' }, signal))
            .filter((p) => /^\d{5}$/.test(p.name) && p.name.startsWith(q))
            .map((p) => ({ ...p, postcode: p.name })),
          (s) => `${s.postcode}|${s.city}`
        )
      },
      setPlzSuggestions
    )
  }

  const handleStreetSearch = (q: string) => {
    setStreet(q)
    if (q.trim().length < 2) {
      cancelSearch('street')
      setStreetSuggestions([])
      return
    }
    const term = q.trim()
    // Adding the PLZ to the query drowns out the street term in Photon; bias by city + location instead.
    const params: Record<string, string> = { q: [term, city.trim()].filter(Boolean).join(' '), layer: 'street' }
    if (coords) {
      params.lat = String(coords.lat)
      params.lon = String(coords.lon)
    }
    scheduleSearch(
      'street',
      async (signal) => {
        const places = (await searchPhoton(params, signal)).filter((p) => p.name).map((p) => ({ ...p, street: p.name }))
        const matching = places.filter((p) => p.street.toLowerCase().includes(term.toLowerCase()))
        const ranked = (matching.length > 0 ? matching : places).sort(
          (x, y) => Number(y.postcode === plz) - Number(x.postcode === plz)
        )
        return uniqueBy(ranked, (s) => `${s.street}|${s.postcode}|${s.city}`)
      },
      setStreetSuggestions
    )
  }

  const selectStreet = (s: AddressSuggestion) => {
    cancelSearch('street')
    setStreet(s.street)
    if (s.housenumber) setHouseNumber(s.housenumber)
    if (s.postcode) setPLZ(s.postcode)
    if (s.city) setCity(s.city)
    setCoords({ lat: s.lat, lon: s.lon })
    setStreetSuggestions([])
  }

  const selectPLZ = (s: AddressSuggestion) => {
    cancelSearch('plz')
    setPLZ(s.postcode)
    if (s.city) setCity(s.city)
    setCoords({ lat: s.lat, lon: s.lon })
    setPlzSuggestions([])
  }

  const selectCity = (s: AddressSuggestion) => {
    cancelSearch('city')
    setCity(s.city)
    if (s.postcode) setPLZ(s.postcode)
    setCoords({ lat: s.lat, lon: s.lon })
    setCitySuggestions([])
  }

  const toggleService = (id: CleaningTypeId) => {
    if (selectedServices.includes(id)) {
      setSelectedServices((prev) => prev.filter((s) => s !== id))
    } else {
      setSelectedServices((prev) => [...prev, id])
      setServicePrices((prev) => ({ ...prev, [id]: prev[id] ?? DEFAULT_CLEANING_PRICES[id] }))
      setServicesError(false)
    }
  }

  const goToStep3 = () => {
    if (selectedServices.length === 0) {
      setServicesError(true)
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
      company_address: companyAddress,
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
        setError(
          res.status === 400 ? (body?.error?.includes('Gewerbe') ? 'requirements' : 'invalid') : 'save'
        )
        setSubmitting(false)
        return
      }
      router.push('/partner/bewerben/danke')
    } catch {
      setError('network')
      setSubmitting(false)
    }
  }

  const errorText: Record<Exclude<SubmitError, ''>, string> = {
    invalid: t(
      'Bitte alle Pflichtfelder korrekt ausfüllen.',
      'يرجى تعبئة جميع الحقول المطلوبة بشكل صحيح.',
      'Please fill in all required fields correctly.'
    ),
    requirements: t(
      'Gewerbe und Betriebshaftpflicht sind Voraussetzung für eine Partnerschaft.',
      'السجل التجاري وتأمين المسؤولية شرطان أساسيان للشراكة.',
      'A registered business and liability insurance are required for a partnership.'
    ),
    save: t(
      'Antrag konnte nicht gespeichert werden. Bitte später erneut versuchen.',
      'تعذّر حفظ الطلب. يرجى المحاولة لاحقًا.',
      'Your application could not be saved. Please try again later.'
    ),
    network: t(
      'Verbindungsfehler. Bitte erneut versuchen.',
      'خطأ في الاتصال. يرجى المحاولة مرة أخرى.',
      'Connection error. Please try again.'
    ),
  }
  const typeLabel = (type: (typeof CLEANING_TYPES)[number]) => t(type.label, type.labelAr, type.labelEn)
  const typeDesc = (type: (typeof CLEANING_TYPES)[number]) => t(type.desc, type.descAr, type.descEn)
  const stepNames = [
    t('Persönlich', 'البيانات الشخصية', 'Personal'),
    t('Unternehmen', 'الشركة', 'Company'),
    t('Bestätigung', 'التأكيد', 'Confirmation'),
  ]

  const primaryBtn =
    'rounded-2xl bg-[#2563eb] px-6 py-3 text-base font-semibold text-white shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none'
  const secondaryBtn =
    'rounded-2xl border border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50'

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <div className="mb-6">
        <div className="mb-3 text-sm font-medium text-gray-600">
          {t('Schritt', 'الخطوة', 'Step')} {step}/3 · {stepNames[step - 1]}
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
            <h1 className="text-xl font-bold text-gray-900">{stepNames[0]}</h1>
            <label className="block text-sm font-medium">
              {t('Anrede *', 'صيغة المخاطبة *', 'Salutation *')}
              <select
                className={`${inputClass} mt-1`}
                value={anrede}
                onChange={(e) => setAnrede(e.target.value)}
                required
              >
                <option value="" disabled>
                  {t('Bitte auswählen', 'يرجى الاختيار', 'Please select')}
                </option>
                <option value="Herr">{t('Herr', 'السيد', 'Mr')}</option>
                <option value="Frau">{t('Frau', 'السيدة', 'Ms')}</option>
                <option value="Divers">{t('Divers', 'آخر', 'Diverse')}</option>
                <option value="Dr.">{t('Dr.', 'د.', 'Dr')}</option>
                <option value="Firma">{t('Firma', 'شركة', 'Company')}</option>
              </select>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="block text-sm font-medium">
                {t('Vorname *', 'الاسم الأول *', 'First name *')}
                <input
                  className={`${inputClass} mt-1`}
                  placeholder=""
                  value={vorname}
                  onChange={(e) => setVorname(e.target.value)}
                  required
                />
              </label>
              <label className="block text-sm font-medium">
                {t('Nachname *', 'اسم العائلة *', 'Last name *')}
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
                <span className="font-semibold">{t('Vollständiger Name:', 'الاسم الكامل:', 'Full name:')}</span> {fullName}
              </p>
            )}
            <label className="block text-sm font-medium">
              {t('E-Mail *', 'البريد الإلكتروني *', 'Email *')}
              <input type="email" className={`${inputClass} mt-1`} value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label className="block text-sm font-medium">
              {t('Telefon Festnetz *', 'الهاتف الثابت *', 'Landline phone *')}
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
              {t('WhatsApp (optional)', 'واتساب (اختياري)', 'WhatsApp (optional)')}
              <input
                type="tel"
                className={`${inputClass} mt-1`}
                placeholder="+49 1XX XXX XXXX"
                value={phoneWhatsapp}
                onChange={(e) => setPhoneWhatsapp(e.target.value)}
              />
            </label>
            <div className="grid gap-4">
              <div className="grid grid-cols-[2fr_1fr] gap-3">
                <div className="relative">
                  <label className="block text-sm font-medium">
                    {t('Straße *', 'الشارع *', 'Street *')}
                    <input
                      className={`${inputClass} mt-1`}
                      placeholder={t('z.B. Hauptstr.', 'مثال: Hauptstr.', 'e.g. Hauptstr.')}
                      value={street}
                      onChange={(e) => handleStreetSearch(e.target.value)}
                      onBlur={() => setStreetSuggestions([])}
                      onKeyDown={(e) => e.key === 'Escape' && setStreetSuggestions([])}
                      autoComplete="off"
                      required
                    />
                  </label>
                  {streetSuggestions.length > 0 && (
                    <ul className={suggestionListClass} role="listbox" aria-label={t('Straßenvorschläge', 'اقتراحات الشوارع', 'Street suggestions')}>
                      {streetSuggestions.map((s) => (
                        <li
                          key={`${s.street}|${s.postcode}|${s.city}`}
                          role="option"
                          aria-selected={false}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => selectStreet(s)}
                          className={suggestionItemClass}
                        >
                          📍 {s.street}
                          {s.housenumber ? ` ${s.housenumber}` : ''} - {s.city} {s.postcode}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <label className="block text-sm font-medium">
                  {t('Hausnr.', 'رقم المبنى', 'No.')}
                  <input
                    className={`${inputClass} mt-1`}
                    placeholder="12"
                    value={houseNumber}
                    onChange={(e) => setHouseNumber(e.target.value)}
                  />
                </label>
              </div>

              <div className="grid grid-cols-[1fr_2fr] gap-3">
                <div className="relative">
                  <label className="block text-sm font-medium">
                    {t('Postleitzahl *', 'الرمز البريدي *', 'Postcode *')}
                    <input
                      className={`${inputClass} mt-1`}
                      placeholder="70173"
                      inputMode="numeric"
                      maxLength={5}
                      value={plz}
                      onChange={(e) => handlePLZSearch(e.target.value)}
                      onBlur={() => setPlzSuggestions([])}
                      onKeyDown={(e) => e.key === 'Escape' && setPlzSuggestions([])}
                      autoComplete="off"
                      required
                    />
                  </label>
                  {plzSuggestions.length > 0 && (
                    <ul className={suggestionListClass} role="listbox" aria-label={t('PLZ-Vorschläge', 'اقتراحات الرمز البريدي', 'Postcode suggestions')}>
                      {plzSuggestions.map((s) => (
                        <li
                          key={`${s.postcode}|${s.city}`}
                          role="option"
                          aria-selected={false}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => selectPLZ(s)}
                          className={suggestionItemClass}
                        >
                          {s.postcode} - {s.city}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium">
                    {t('Stadt / Ort *', 'المدينة *', 'City *')}
                    <input
                      className={`${inputClass} mt-1`}
                      placeholder="Stuttgart"
                      value={city}
                      onChange={(e) => handleCitySearch(e.target.value)}
                      onBlur={() => setCitySuggestions([])}
                      onKeyDown={(e) => e.key === 'Escape' && setCitySuggestions([])}
                      autoComplete="off"
                      required
                    />
                  </label>
                  {citySuggestions.length > 0 && (
                    <ul className={suggestionListClass} role="listbox" aria-label={t('Ortsvorschläge', 'اقتراحات المدن', 'City suggestions')}>
                      {citySuggestions.map((s) => (
                        <li
                          key={`${s.city}|${s.postcode}|${s.state}`}
                          role="option"
                          aria-selected={false}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => selectCity(s)}
                          className={suggestionItemClass}
                        >
                          🏙️ {s.city}
                          {s.postcode ? ` - ${s.postcode}` : ''} {s.state}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-400">
                {t('Adressvorschläge ab 2 Zeichen · Daten ©', 'تظهر اقتراحات العناوين بعد حرفين · البيانات ©', 'Address suggestions after 2 characters · Data ©')}{' '}
                <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">
                  {t('OpenStreetMap-Mitwirkende', 'المساهمون في OpenStreetMap', 'OpenStreetMap contributors')}
                </a>
              </p>
            </div>

            <div>
              <button type="button" onClick={() => setShowMap((v) => !v)} className="text-sm text-blue-600 hover:underline">
                📍{' '}
                {showMap
                  ? t('Karte ausblenden', 'إخفاء الخريطة', 'Hide map')
                  : t('Karte anzeigen', 'عرض الخريطة', 'Show map')}
              </button>
              {showMap &&
                (coords ? (
                  <iframe
                    title={t('Karte der Firmenadresse', 'خريطة عنوان الشركة', 'Map of company address')}
                    className="mt-2 h-[200px] w-full rounded-xl border"
                    loading="lazy"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lon - 0.01},${coords.lat - 0.01},${coords.lon + 0.01},${coords.lat + 0.01}&marker=${coords.lat},${coords.lon}`}
                  />
                ) : (
                  <p className="mt-2 text-sm text-gray-500">
                    {t(
                      'Bitte zuerst eine Adresse, PLZ oder Stadt aus den Vorschlägen wählen.',
                      'يرجى أولًا اختيار عنوان أو رمز بريدي أو مدينة من الاقتراحات.',
                      'Please first choose an address, postcode or city from the suggestions.'
                    )}
                  </p>
                ))}
            </div>
            <div className="flex justify-end pt-2">
              <button type="button" className={primaryBtn} disabled={!step1Valid} onClick={() => setStep(2)}>
                {t('Weiter', 'التالي', 'Next')}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h1 className="text-xl font-bold text-gray-900">{stepNames[1]}</h1>
            <p className="text-sm text-gray-500">
              {t(
                `Wählen Sie Ihre Leistungen und legen Sie Ihren Preis fest (${CLEANING_PRICE_MIN}–${CLEANING_PRICE_MAX} € pro Stunde).`,
                `اختر خدماتك وحدد سعرك (${CLEANING_PRICE_MIN}–${CLEANING_PRICE_MAX} € للساعة).`,
                `Choose your services and set your price (${CLEANING_PRICE_MIN}–${CLEANING_PRICE_MAX} € per hour).`
              )}
            </p>
            <div className="space-y-4 rounded-3xl border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-[22px] font-bold tracking-tight text-gray-900">
                  {t('Anzahl Mitarbeiter', 'عدد الموظفين', 'Number of employees')}
                </h3>
                <div className="rounded-full bg-[#2563eb] px-5 py-2 text-[17px] font-bold text-white shadow-lg" aria-live="polite">
                  {employeeCount} {t('Mitarbeiter', 'موظف', employeeCount === 1 ? 'employee' : 'employees')}
                </div>
              </div>

              <div className="relative pt-2">
                <input
                  type="range"
                  min={1}
                  max={50}
                  step={1}
                  value={employeeCount}
                  aria-label={t('Anzahl Mitarbeiter', 'عدد الموظفين', 'Number of employees')}
                  onChange={(e) => setEmployeeCount(parseInt(e.target.value, 10))}
                  className="h-[14px] w-full cursor-pointer appearance-none rounded-full bg-[#eef2ff] [&::-moz-range-thumb]:h-9 [&::-moz-range-thumb]:w-9 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[#2563eb] [&::-webkit-slider-thumb]:h-9 [&::-webkit-slider-thumb]:w-9 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#2563eb] [&::-webkit-slider-thumb]:shadow-lg"
                  style={{
                    // Range inputs run right-to-left in RTL, so the filled part must start on the right.
                    background: `linear-gradient(to ${lang === 'ar' ? 'left' : 'right'}, #2563eb ${((employeeCount - 1) / 49) * 100}%, #eef2ff ${((employeeCount - 1) / 49) * 100}%)`,
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
                  aria-label={t('Weniger Mitarbeiter', 'تقليل عدد الموظفين', 'Fewer employees')}
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
                  aria-label={t('Mehr Mitarbeiter', 'زيادة عدد الموظفين', 'More employees')}
                  onClick={() => setEmployeeCount((n) => Math.min(50, n + 1))}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2563eb] text-2xl font-light text-white shadow-md hover:bg-blue-700"
                >
                  +
                </button>
              </div>

              <p className="pt-1 text-center text-[14px] text-gray-400">
                {t('Ziehen zum Einstellen', 'اسحب للتعديل', 'Drag to adjust')}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">{t('Reinigungsarten *', 'أنواع التنظيف *', 'Cleaning types *')}</h3>
              <span
                className={`rounded-full px-3 py-1 text-sm font-semibold ${
                  selectedServices.length > 0 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                }`}
                aria-live="polite"
              >
                {selectedServices.length} {t('ausgewählt', 'محدد', 'selected')}
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
                        aria-label={typeLabel(type)}
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
                        <span className="block font-bold text-gray-900">{typeLabel(type)}</span>
                        <span className="mt-1 block text-sm font-normal text-gray-500">{typeDesc(type)}</span>
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
                          aria-label={t(`${type.label} Preis`, `سعر ${type.labelAr}`, `${type.labelEn} price`)}
                          onChange={(event) =>
                            setServicePrices((current) => ({ ...current, [type.id]: Number(event.target.value) }))
                          }
                          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-blue-100 accent-blue-600"
                        />
                        <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                          <span>{CLEANING_PRICE_MIN} €</span>
                          <span>{t('Aktuell', 'الحالي', 'Current')}: {price} €/h</span>
                          <span>{CLEANING_PRICE_MAX} €</span>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleService(type.id)}
                        className="shrink-0 self-end rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:border-blue-600 hover:text-blue-600 sm:self-center"
                      >
                        {t('Auswählen', 'اختيار', 'Select')}
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
            {servicesError && (
              <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {t(
                  'Bitte wählen Sie mindestens eine Reinigungsart',
                  'يرجى اختيار نوع تنظيف واحد على الأقل',
                  'Please select at least one cleaning type'
                )}
              </p>
            )}
            <div className="flex justify-between pt-2">
              <button type="button" className={secondaryBtn} onClick={() => setStep(1)}>
                {t('Zurück', 'رجوع', 'Back')}
              </button>
              <button type="button" className={primaryBtn} onClick={goToStep3}>
                {t('Weiter', 'التالي', 'Next')}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h1 className="text-xl font-bold text-gray-900">{stepNames[2]}</h1>

            <section className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
              <h2 className="font-semibold text-gray-900">{t('Ihre Unternehmensangaben', 'بيانات شركتك', 'Your company details')}</h2>
              <p className="mt-1 text-sm text-gray-600">
                {t('Mitarbeiter', 'الموظفون', 'Employees')}: {employeeCount}
              </p>
              <ul className="mt-3 space-y-1 text-sm text-gray-700">
                {CLEANING_TYPES.filter((type) => selectedServices.includes(type.id)).map((type) => (
                  <li key={type.id} className="flex justify-between gap-4">
                    <span>{typeLabel(type)}</span>
                    <span className="shrink-0 font-semibold">{servicePrices[type.id]} €/h</span>
                  </li>
                ))}
              </ul>
            </section>

            <div>
              <p className="mb-2 text-sm font-medium">
                {t('Sprachen', 'اللغات', 'Languages')}
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
              <p className="mb-2 flex items-center justify-between gap-3 text-sm font-medium">
                <span className="flex-1">{t('Arbeitsradius', 'نطاق العمل', 'Work radius')}</span>
                <span className="rounded-full bg-[#2563eb]/15 px-3 py-1 font-bold text-blue-700">{workRadius} km</span>
              </p>
              <input
                type="range"
                min={RADIUS_MIN}
                max={RADIUS_MAX}
                step={1}
                value={workRadius}
                onChange={(e) => setWorkRadius(Number(e.target.value))}
                aria-label={t('Arbeitsradius', 'نطاق العمل', 'Work radius')}
                className="h-2 w-full accent-blue-600"
              />
            </div>

            <div className="space-y-3">
              {[
                {
                  key: 'gewerbe',
                  checked: hasGewerbe,
                  set: setHasGewerbe,
                  label: t('Ich besitze ein Gewerbe *', 'لدي سجل تجاري *', 'I have a registered business *'),
                },
                {
                  key: 'haftpflicht',
                  checked: hasHaftpflicht,
                  set: setHasHaftpflicht,
                  label: t(
                    'Ich besitze Haftpflicht *',
                    'لدي تأمين المسؤولية المهنية *',
                    'I have liability insurance *'
                  ),
                },
              ].map((c) => (
                <label key={c.key} className="flex cursor-pointer items-center gap-4 rounded-2xl border border-gray-200 p-4 hover:border-[#2563eb]">
                  <input type="checkbox" checked={c.checked} onChange={(e) => c.set(e.target.checked)} className="peer sr-only" />
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-gray-300 text-transparent peer-checked:border-[#2563eb] peer-checked:bg-[#2563eb] peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-[#2563eb]/50"
                    aria-hidden
                  >
                    <Check className="h-6 w-6" strokeWidth={3} />
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-medium">{c.label}</span>
                </label>
              ))}
            </div>

            {!requirementsMet && (
              <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <strong>{t('Voraussetzung:', 'شرط:', 'Requirement:')}</strong>{' '}
                {t(
                  'Ein angemeldetes Gewerbe und eine Betriebshaftpflichtversicherung sind Pflicht, um als Partner zu arbeiten.',
                  'يجب أن يكون لديك سجل تجاري وتأمين المسؤولية المهنية لتتمكن من إرسال الطلب.',
                  'A registered business and liability insurance are required to work as a partner.'
                )}
              </div>
            )}

            <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
              <strong>{t('Hinweis:', 'ملاحظة:', 'Note:')}</strong>{' '}
              {t(
                'Kein Upload jetzt. Dokumente werden nach Annahme angefordert.',
                'لا حاجة لرفع الوثائق الآن، سيتم طلب صور الوثائق بعد قبول طلبك.',
                'No upload needed now. Documents will be requested after acceptance.'
              )}
            </div>

            {error && (
              <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {errorText[error]}
              </p>
            )}

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={submit}
                disabled={submitting || !requirementsMet}
                style={{ backgroundColor: submitting || !requirementsMet ? undefined : BLUE }}
                className="w-full rounded-2xl px-6 py-4 text-lg font-bold text-white shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {submitting
                  ? t('Wird gesendet…', 'جارٍ الإرسال…', 'Sending…')
                  : t('Antrag senden', 'إرسال الطلب', 'Submit application')}
              </button>
              <button type="button" className={secondaryBtn} disabled={submitting} onClick={() => setStep(2)}>
                {t('Zurück', 'رجوع', 'Back')}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
