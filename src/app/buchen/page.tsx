'use client'

import { Suspense, useEffect, useRef, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { REINIGUNGSARTEN } from '@/lib/services'
import { ANREDEN, type LeadPayload } from '@/lib/leads'
import { useLang } from '@/components/LanguageProvider'
import AddressAutocomplete from '@/components/AddressAutocomplete'

const inputClass =
  'mt-1 w-full rounded-lg border border-primary/20 bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50'

const TIME_MIN = '08:00'
const TIME_MAX = '18:00'

// Accepts both ids ("wohnungsreinigung") and labels ("Wohnungsreinigung") from ?service=
function findInitialService(param: string | null) {
  if (!param) return ''
  const value = param.toLowerCase()
  return REINIGUNGSARTEN.find((r) => r.id === value || r.label.toLowerCase() === value)?.id ?? ''
}

function BookingForm() {
  const router = useRouter()
  const params = useSearchParams()
  const { t } = useLang()

  const [form, setForm] = useState({
    anrede: 'Keine Angabe',
    vorname: '',
    nachname: '',
    firma: '',
    email: '',
    phone: '',
    address: '',
    postcode: '',
    area: '',
    date: '',
    time: '',
    message: '',
    otherService: '',
  })
  const [serviceId, setServiceId] = useState(() => findInitialService(params.get('service')))
  const [isOpen, setIsOpen] = useState(false)
  const [isFlexible, setIsFlexible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    if (!selected) {
      setError(t('Bitte wählen Sie eine Reinigungsart aus.', 'يرجى اختيار نوع التنظيف.', 'Please select a cleaning type.'))
      return
    }

    setLoading(true)

    const payload: LeadPayload = {
      ...form,
      firma: isFirma ? form.firma : '',
      serviceId: selected.id,
      isFlexible,
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
                {a}
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
        <div className="block text-sm font-medium">
          <label htmlFor="buchen-address">{t('Adresse / Straße *', 'العنوان / الشارع *', 'Address / Street *')}</label>
          <AddressAutocomplete
            id="buchen-address"
            required
            placeholder={t(
              'z.B. Musterstraße 12, 70173 Stuttgart',
              'مثال: Musterstraße 12, 70173 Stuttgart',
              'e.g. Musterstraße 12, 70173 Stuttgart',
            )}
            value={form.address}
            onChange={(address) => setForm((prev) => ({ ...prev, address }))}
            onSelect={(pick) => {
              if (pick.postcode) setForm((prev) => ({ ...prev, postcode: pick.postcode }))
            }}
            className={inputClass}
          />
        </div>
        <label className="block text-sm font-medium">
          {t('PLZ *', 'الرمز البريدي *', 'Postcode *')}
          <input required value={form.postcode} onChange={update('postcode')} className={inputClass} />
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
                <span className="block font-semibold text-primary">{selected.label}</span>
                <span className="block truncate text-xs text-primary/70">{selected.desc}</span>
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
              aria-label="Reinigungsarten"
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
                        <span className="block text-sm font-semibold text-primary">{r.label}</span>
                        <span className="block text-xs text-primary/70">{r.desc}</span>
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

      <label className="block text-sm font-medium">
        {t('Fläche in m²', 'المساحة بالمتر المربع', 'Area in m²')}
        <input type="number" min="1" value={form.area} onChange={update('area')} className={inputClass} />
      </label>

      <section className="space-y-3">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            {t('Wunschtermin', 'الموعد المفضل', 'Preferred date')}
            <input type="date" value={form.date} onChange={update('date')} className={inputClass} />
          </label>
          <label className="block text-sm font-medium">
            {t('Uhrzeit (08:00–18:00)', 'الوقت (08:00–18:00)', 'Time (08:00–18:00)')}
            <input
              type="time"
              min={TIME_MIN}
              max={TIME_MAX}
              step={900}
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

      <label className="block text-sm font-medium">
        {t('Nachricht', 'رسالة', 'Message')}
        <textarea rows={4} value={form.message} onChange={update('message')} className={inputClass} />
      </label>

      {error && <p className="rounded-lg bg-background p-3 text-sm text-primary">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-card hover:bg-primary-hover disabled:opacity-60"
      >
        {loading
          ? t('Wird gesendet…', 'جارٍ الإرسال…', 'Sending…')
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
