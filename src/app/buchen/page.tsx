'use client'

import { Suspense, useEffect, useRef, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { REINIGUNGSARTEN, reinigungsartText } from '@/lib/services'
import { ANREDEN, ANREDE_LABELS, type LeadPayload } from '@/lib/leads'
import { useLang } from '@/components/LanguageProvider'
import AddressAutocomplete from '@/components/AddressAutocomplete'
import PhotoUpload, { type LeadPhoto } from '@/components/PhotoUpload'
import SliderPicker, {
  AREA_CONFIG,
  AREA_DEFAULT,
  ROOMS_CONFIG,
  ROOMS_DEFAULT,
  isValidManual,
} from '@/components/SliderPicker'

const inputClass =
  'mt-1 w-full rounded-lg border border-primary/20 bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50'

const TIME_MIN = '08:00'
const TIME_MAX = '20:00'

// Inserted into the message field when the chip is clicked.
const MESSAGE_CHIPS = [
  { de: 'Grundreinigung', ar: 'تنظيف أساسي', en: 'Deep cleaning' },
  { de: 'Endreinigung / Umzug', ar: 'تنظيف نهائي / انتقال', en: 'Move-out cleaning' },
  { de: 'Fenster', ar: 'نوافذ', en: 'Windows' },
  { de: 'Küche / Ofen', ar: 'مطبخ / فرن', en: 'Kitchen / oven' },
  { de: 'Haustier', ar: 'حيوان أليف', en: 'Pet' },
] as const

const hasHouseNumber = (street: string) => /\d/.test(street)

async function lookupCity(postcode: string, signal: AbortSignal) {
  const res = await fetch(`https://openplzapi.org/de/Localities?postalCode=${postcode}`, { signal })
  if (!res.ok) return ''
  const rows = (await res.json()) as { name?: string }[]
  return rows[0]?.name ?? ''
}

// Accepts both ids ("wohnungsreinigung") and labels ("Wohnungsreinigung") from ?service=
function findInitialService(param: string | null) {
  if (!param) return ''
  const value = param.toLowerCase()
  return REINIGUNGSARTEN.find((r) => r.id === value || r.label.toLowerCase() === value)?.id ?? ''
}

function BookingForm() {
  const router = useRouter()
  const params = useSearchParams()
  const { t, lang } = useLang()

  const [form, setForm] = useState({
    anrede: 'Keine Angabe',
    vorname: '',
    nachname: '',
    firma: '',
    email: '',
    phone: '',
    strasseHausnummer: '',
    postcode: '',
    city: '',
    floor: '',
    date: '',
    time: '',
    message: '',
    otherService: '',
  })
  const serviceParam = params.get('service')
  const [serviceId, setServiceId] = useState(() => findInitialService(serviceParam))
  // The page stays mounted between client navigations, so re-sync when ?service= changes.
  const [syncedParam, setSyncedParam] = useState(serviceParam)
  if (serviceParam !== syncedParam) {
    setSyncedParam(serviceParam)
    if (serviceParam) setServiceId(findInitialService(serviceParam))
  }
  const [isOpen, setIsOpen] = useState(false)
  const [isFlexible, setIsFlexible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [photos, setPhotos] = useState<LeadPhoto[]>([])
  const [streetTouched, setStreetTouched] = useState(false)
  const [areaSlider, setAreaSlider] = useState(AREA_DEFAULT)
  const [areaManual, setAreaManual] = useState<string | null>(null)
  const [areaManualTouched, setAreaManualTouched] = useState(false)
  const [roomsSlider, setRoomsSlider] = useState(ROOMS_DEFAULT)
  const [roomsManual, setRoomsManual] = useState<string | null>(null)
  const [roomsManualTouched, setRoomsManualTouched] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  // Last city filled in automatically; a city typed by the user is never overwritten.
  const autoCityRef = useRef('')

  const photosBusy = photos.some((p) => p.status === 'uploading')
  const houseNumberMessage = t('Bitte Hausnummer eingeben', 'يرجى إدخال رقم المنزل', 'Please enter a house number')
  const showHouseNumberHint =
    streetTouched && !!form.strasseHausnummer.trim() && !hasHouseNumber(form.strasseHausnummer)

  useEffect(() => {
    const postcode = form.postcode.trim()
    if (!/^\d{5}$/.test(postcode)) return
    const ac = new AbortController()
    lookupCity(postcode, ac.signal)
      .then((city) => {
        if (!city) return
        setForm((prev) => {
          if (prev.postcode.trim() !== postcode) return prev
          if (prev.city.trim() && prev.city !== autoCityRef.current) return prev
          autoCityRef.current = city
          return { ...prev, city }
        })
      })
      .catch(() => {})
    return () => ac.abort()
  }, [form.postcode])

  useEffect(() => {
    if (!isOpen) return
    const close = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) setIsOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [isOpen])

  const update = (field: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const selected = REINIGUNGSARTEN.find((r) => r.id === serviceId)
  const isOther = serviceId === 'sonstiges'
  const isFirma = form.anrede === 'Firma'

  function addChip(text: string) {
    setForm((prev) => {
      if (prev.message.includes(text)) return prev
      const current = prev.message.trimEnd()
      return { ...prev, message: current ? `${current}, ${text}` : text }
    })
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    if (!hasHouseNumber(form.strasseHausnummer)) {
      setStreetTouched(true)
      document.getElementById('buchen-street')?.focus()
      return
    }

    if (areaManual !== null && !isValidManual(areaManual, AREA_CONFIG)) {
      setAreaManualTouched(true)
      document.getElementById('buchen-area-manual')?.focus()
      return
    }

    if (roomsManual !== null && !isValidManual(roomsManual, ROOMS_CONFIG)) {
      setRoomsManualTouched(true)
      document.getElementById('buchen-rooms-manual')?.focus()
      return
    }

    if (!selected) {
      setError(t('Bitte wählen Sie eine Reinigungsart aus.', 'يرجى اختيار نوع التنظيف.', 'Please select a cleaning type.'))
      return
    }

    // Validated here instead of native min/max/step, which iOS Safari enforces inconsistently.
    if (!isFlexible && form.time && (form.time < TIME_MIN || form.time > TIME_MAX)) {
      setError(
        t(
          'Bitte Zeit zwischen 08:00 und 20:00 wählen',
          'يرجى اختيار وقت بين 08:00 و 20:00',
          'Please choose a time between 08:00 and 20:00',
        ),
      )
      return
    }

    setLoading(true)

    const payload: LeadPayload = {
      ...form,
      firma: isFirma ? form.firma : '',
      serviceId: selected.id,
      area: areaManual ?? String(areaSlider),
      rooms: roomsManual ?? String(roomsSlider),
      isFlexible,
      photoPaths: photos.flatMap((p) => (p.status === 'done' && p.path ? [p.path] : [])),
    }

    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => null)

    setLoading(false)

    if (!res?.ok) {
      setError(
        res?.status === 429
          ? t(
              'Zu viele Anfragen. Bitte versuchen Sie es später erneut.',
              'طلبات كثيرة جداً. حاول لاحقاً.',
              'Too many requests. Please try again later.',
            )
          : t(
              'Die Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es erneut.',
              'تعذر إرسال الطلب. حاول مرة أخرى.',
              'The request could not be sent. Please try again.',
            ),
      )
      return
    }

    router.push('/danke')
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6 rounded-2xl bg-card p-6 shadow-sm ring-1 ring-primary/10 sm:p-8">
      <div className="space-y-5">
        <label className="block text-sm font-medium sm:w-1/3">
          {t('Anrede', 'اللقب', 'Title')}
          <select value={form.anrede} onChange={update('anrede')} className={inputClass}>
            {ANREDEN.map((a) => (
              <option key={a} value={a}>
                {lang === 'de' ? a : ANREDE_LABELS[a][lang]}
              </option>
            ))}
          </select>
        </label>
        {isFirma && (
          <label className="block text-sm font-medium">
            {t('Firmenname *', 'اسم الشركة *', 'Company name *')}
            <input
              required
              autoComplete="organization"
              value={form.firma}
              onChange={update('firma')}
              className={inputClass}
            />
          </label>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            {isFirma ? t('Ansprechpartner Vorname *', 'اسم جهة الاتصال *', 'Contact first name *') : t('Vorname *', 'الاسم الأول *', 'First name *')}
            <input required autoComplete="given-name" value={form.vorname} onChange={update('vorname')} className={inputClass} />
          </label>
          <label className="block text-sm font-medium">
            {isFirma ? t('Ansprechpartner Nachname *', 'اسم عائلة جهة الاتصال *', 'Contact last name *') : t('Nachname *', 'اسم العائلة *', 'Last name *')}
            <input required autoComplete="family-name" value={form.nachname} onChange={update('nachname')} className={inputClass} />
          </label>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          {t('E-Mail *', 'البريد الإلكتروني *', 'Email *')}
          <input type="email" required value={form.email} onChange={update('email')} className={inputClass} />
        </label>
        <label className="block text-sm font-medium">
          {t('Telefon', 'الهاتف', 'Phone')}
          <input type="tel" value={form.phone} onChange={update('phone')} className={inputClass} />
        </label>
      </div>

      <div className="space-y-5">
        <div className="block text-sm font-medium">
          <label htmlFor="buchen-street">{t('Straße und Hausnummer *', 'الشارع ورقم المنزل *', 'Street and house number *')}</label>
          <AddressAutocomplete
            id="buchen-street"
            required
            placeholder={t('z.B. Hauptstraße 12', 'مثال: Hauptstraße 12', 'e.g. Hauptstraße 12')}
            value={form.strasseHausnummer}
            onChange={(strasseHausnummer) => setForm((prev) => ({ ...prev, strasseHausnummer }))}
            onBlur={() => setStreetTouched(true)}
            onSelect={(pick) => {
              if (pick.city) autoCityRef.current = pick.city
              setForm((prev) => ({
                ...prev,
                strasseHausnummer: pick.street || prev.strasseHausnummer,
                postcode: pick.postcode || prev.postcode,
                city: pick.city || prev.city,
              }))
            }}
            className={`${inputClass} ${showHouseNumberHint ? 'border-danger focus:border-danger' : ''}`}
          />
          {showHouseNumberHint && (
            <p role="alert" className="mt-1 text-xs font-normal text-danger">
              {houseNumberMessage}
            </p>
          )}
        </div>

        <div className="grid items-start gap-5 min-[360px]:grid-cols-2 min-[360px]:gap-4">
          <label className="block text-sm font-medium">
            {t('PLZ *', 'الرمز البريدي *', 'Postcode *')}
            <input
              required
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={5}
              placeholder="70173"
              value={form.postcode}
              onChange={update('postcode')}
              className={inputClass}
            />
          </label>
          <label className="block text-sm font-medium">
            {t('Ort', 'المدينة', 'City')}
            <input
              autoComplete="address-level2"
              placeholder="Stuttgart"
              value={form.city}
              onChange={update('city')}
              className={inputClass}
            />
          </label>
        </div>

        <label className="block text-sm font-medium">
          {t('Stockwerk / Wohnung', 'الطابق / الشقة', 'Floor / apartment')}{' '}
          <span className="font-normal text-primary/60">- {t('optional', 'اختياري', 'optional')}</span>
          <input
            placeholder={t('z.B. 2. OG, Wohnung 5', 'مثال: الطابق 2، شقة 5', 'e.g. 2nd floor, apartment 5')}
            maxLength={100}
            value={form.floor}
            onChange={update('floor')}
            className={inputClass}
          />
        </label>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-primary">{t('Reinigungsarten *', 'أنواع التنظيف *', 'Cleaning types *')}</h3>
          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold ${
              selected ? 'bg-primary text-card' : 'bg-primary/5 text-primary/70'
            }`}
            aria-live="polite"
          >
            {selected ? 1 : 0} {t('ausgewählt', 'محدد', 'selected')}
          </span>
        </div>
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            onClick={() => setIsOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-3 rounded-lg border border-primary/20 bg-card px-3 py-2.5 text-left text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {selected ? (
              <span className="min-w-0">
                <span className="block font-semibold text-primary">{reinigungsartText(selected, lang).label}</span>
                <span className="block truncate text-xs text-primary/70">{reinigungsartText(selected, lang).desc}</span>
              </span>
            ) : (
              <span className="text-primary/60">{t('Bitte wählen...', 'يرجى الاختيار...', 'Please select...')}</span>
            )}
            <span aria-hidden="true" className={`shrink-0 text-primary transition ${isOpen ? 'rotate-180' : ''}`}>
              ▾
            </span>
          </button>
          {isOpen && (
            <ul
              role="listbox"
              aria-label={t('Reinigungsarten', 'أنواع التنظيف', 'Cleaning types')}
              className="absolute z-20 mt-1 max-h-[320px] w-full overflow-y-auto rounded-lg border border-primary/20 bg-card shadow-lg"
            >
              {REINIGUNGSARTEN.map((r) => {
                const isSelected = r.id === serviceId
                return (
                  <li key={r.id} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      onClick={() => {
                        setServiceId(r.id)
                        setIsOpen(false)
                      }}
                      className={`flex w-full items-start justify-between gap-3 px-3 py-2 text-left hover:bg-primary/5 ${
                        isSelected ? 'bg-primary/10' : ''
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-primary">{reinigungsartText(r, lang).label}</span>
                        <span className="block text-xs text-primary/70">{reinigungsartText(r, lang).desc}</span>
                      </span>
                      {isSelected && <span className="shrink-0 font-bold text-primary">✓</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>        {isOther && (
          <label className="block text-sm font-medium">
            {t('Welche Reinigung benötigen Sie? *', 'ما نوع التنظيف الذي تحتاجه؟ *', 'What cleaning do you need? *')}
            <textarea
              required
              rows={3}
              value={form.otherService}
              onChange={update('otherService')}
              className={inputClass}
            />
          </label>
        )}
      </section>

      <SliderPicker
        id="buchen-area"
        label={t('Fläche', 'المساحة', 'Area')}
        unit="m²"
        config={AREA_CONFIG}
        slider={areaSlider}
        manual={areaManual}
        onSliderChange={setAreaSlider}
        onManualChange={(value) => {
          setAreaManual(value)
          if (value === null) setAreaManualTouched(false)
        }}
        manualPlaceholder={t('z.B. 450', 'مثال: 450', 'e.g. 450')}
        manualHelp={t('Größer als 300 m²? Bitte genaue Fläche eingeben.', 'أكبر من 300 م²؟ يرجى إدخال المساحة الدقيقة.', 'Larger than 300 m²? Please enter the exact area.')}
        manualError={t('Bitte eine Fläche zwischen 301 und 5000 m² eingeben.', 'يرجى إدخال مساحة بين 301 و 5000 م².', 'Please enter an area between 301 and 5000 m².')}
        showManualError={areaManualTouched}
      />

      <SliderPicker
        id="buchen-rooms"
        label={t('Anzahl Zimmer', 'عدد الغرف', 'Number of rooms')}
        unit={t('Zimmer', 'غرف', 'rooms')}
        config={ROOMS_CONFIG}
        slider={roomsSlider}
        manual={roomsManual}
        onSliderChange={setRoomsSlider}
        onManualChange={(value) => {
          setRoomsManual(value)
          if (value === null) setRoomsManualTouched(false)
        }}
        manualPlaceholder={t('z.B. 7', 'مثال: 7', 'e.g. 7')}
        manualHelp={t('Mehr als 5 Zimmer? Bitte genaue Anzahl eingeben.', 'أكثر من 5 غرف؟ يرجى إدخال العدد الدقيق.', 'More than 5 rooms? Please enter the exact number.')}
        manualError={t('Bitte eine Anzahl zwischen 6 und 50 Zimmern eingeben.', 'يرجى إدخال عدد بين 6 و 50 غرفة.', 'Please enter a number between 6 and 50 rooms.')}
        showManualError={roomsManualTouched}
      />

      <section className="space-y-3">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            {t('Wunschtermin', 'الموعد المفضل', 'Preferred date')}
            <input type="date" value={form.date} onChange={update('date')} className={inputClass} />
          </label>
          <label className="block text-sm font-medium">
            {t('Uhrzeit (08:00–20:00)', 'الوقت (08:00–20:00)', 'Time (08:00–20:00)')}
            <input
              type="time"
              value={isFlexible ? '' : form.time}
              onChange={update('time')}
              disabled={isFlexible}
              className={inputClass}
            />
          </label>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isFlexible}
          onClick={() => setIsFlexible((v) => !v)}
          className="flex w-full items-center gap-3 rounded-xl border border-primary/15 bg-background/60 p-3 text-left text-sm font-medium text-primary"
        >
          <span
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
              isFlexible ? 'bg-primary' : 'bg-primary/20'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-card shadow transition ${
                isFlexible ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </span>
          {t(
            'Ich bin flexibel - ganztägig / Uhrzeit egal',
            'أنا مرن - طوال اليوم / الوقت غير مهم',
            "I'm flexible - all day / any time",
          )}
        </button>
      </section>

      <section className="space-y-2">
        <label htmlFor="buchen-message" className="block text-sm font-medium">
          {t('Nachricht', 'رسالة', 'Message')}
        </label>
        <p id="buchen-message-help" className="text-xs text-primary/60">
          {t(
            'Beschreiben Sie kurz Art der Reinigung + Details. Je genauer, desto besser und günstiger Ihr Festpreis.',
            'صف باختصار نوع التنظيف والتفاصيل. كلما كان الوصف أدق، كان سعرك الثابت أفضل وأرخص.',
            'Briefly describe the type of cleaning + details. The more precise, the better and cheaper your fixed price.',
          )}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {MESSAGE_CHIPS.map((chip) => {
            const text = chip[lang]
            const active = form.message.includes(text)
            return (
              <button
                key={chip.de}
                type="button"
                onClick={() => addChip(text)}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? 'border-primary bg-primary text-card'
                    : 'border-primary/20 bg-card text-primary hover:bg-primary/5'
                }`}
              >
                {active ? '✓ ' : '+ '}
                {text}
              </button>
            )
          })}
        </div>
        <textarea
          id="buchen-message"
          rows={4}
          value={form.message}
          onChange={update('message')}
          aria-describedby="buchen-message-help buchen-message-note"
          placeholder={t(
            'z.B. Endreinigung nach Umzug, 2 Zimmer + Küche + Bad, Fenster innen, Ofen stark verschmutzt, Hund im Haushalt...',
            'مثال: تنظيف نهائي بعد الانتقال، غرفتان + مطبخ + حمام، نوافذ من الداخل، فرن متسخ جداً، كلب في المنزل...',
            'e.g. move-out cleaning, 2 rooms + kitchen + bathroom, windows inside, very dirty oven, dog in the household...',
          )}
          className={inputClass}
        />
        <p id="buchen-message-note" className="text-xs text-primary/60">
          {t(
            'Optional - aber hilft uns, Ihnen den besten Preis zu geben. Keine Überraschungen vor Ort.',
            'اختياري - لكنه يساعدنا على تقديم أفضل سعر لك. بدون مفاجآت في الموقع.',
            'Optional - but helps us give you the best price. No surprises on site.',
          )}
        </p>
      </section>

      <PhotoUpload photos={photos} setPhotos={setPhotos} />

      {error && <p className="rounded-lg bg-background p-3 text-sm text-primary">{error}</p>}

      <button
        type="submit"
        disabled={loading || photosBusy}
        className="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-card hover:bg-primary-hover disabled:opacity-60"
      >
        {loading
          ? t('Wird gesendet…', 'جارٍ الإرسال…', 'Sending…')
          : photosBusy
            ? t('Fotos werden hochgeladen…', 'جارٍ رفع الصور…', 'Uploading photos…')
            : t('Preis anfragen', 'اطلب السعر', 'Request a quote')}
      </button>
    </form>
  )
}
export default function BuchenPage() {
  const { t } = useLang()

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">
        {t('Jetzt Preis anfragen', 'اطلب السعر الآن', 'Request a quote now')}
      </h1>
      <p className="mt-2 text-primary/80">
        {t(
          'Füllen Sie das Formular aus. Wir melden uns mit einem Angebot.',
          'املأ النموذج وسنرسل لك عرض السعر.',
          'Fill in the form. We will get back to you with a quote.',
        )}
      </p>
      <Suspense fallback={null}>
        <BookingForm />
      </Suspense>
    </main>
  )
}
