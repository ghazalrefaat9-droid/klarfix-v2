'use client'

import { Suspense, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase, LEADS_TABLE } from '@/lib/supabase'
import { REINIGUNGSARTEN } from '@/lib/services'
import { useLang } from '@/components/LanguageProvider'

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
    name: '',
    email: '',
    phone: '',
    postcode: '',
    area: '',
    date: '',
    time: '',
    message: '',
    otherService: '',
  })
  const [serviceId, setServiceId] = useState(() => findInitialService(params.get('service')))
  const [isFlexible, setIsFlexible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const update = (field: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const selected = REINIGUNGSARTEN.find((r) => r.id === serviceId)
  const isOther = serviceId === 'sonstiges'

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    if (!selected) {
      setError(t('Bitte wählen Sie eine Reinigungsart aus.', 'يرجى اختيار نوع التنظيف.', 'Please select a cleaning type.'))
      return
    }

    setLoading(true)

    const label = selected.label
    const areaSqm = form.area ? Math.round(Number(form.area)) : null
    const preferredTime = isFlexible ? null : form.time || null
    const timeText = isFlexible ? 'flexibel (ganztägig / Uhrzeit egal)' : form.time

    const fullMessage = [
      isOther && form.otherService.trim() ? `Sonstiges: ${form.otherService.trim()}` : '',
      form.date ? `Wunschtermin: ${form.date}` : '',
      timeText ? `Uhrzeit: ${timeText}` : '',
      form.message.trim(),
    ]
      .filter(Boolean)
      .join('\n')

    // Leads table for lead tracking; requests table keeps the admin/partner dashboards working.
    const [leadResult, requestResult] = await Promise.all([
      supabase.from(LEADS_TABLE).insert({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        postcode: form.postcode.trim(),
        service: label,
        service_label: label,
        area_sqm: areaSqm,
        preferred_date: form.date || null,
        preferred_time: preferredTime,
        is_flexible: isFlexible,
        message: fullMessage || null,
      }),
      supabase.from('requests').insert({
        customer_name: form.name.trim(),
        customer_email: form.email.trim(),
        customer_phone: form.phone.trim() || null,
        postcode: form.postcode.trim(),
        service_type: label,
        area_sqm: areaSqm,
        message: fullMessage || null,
        status: 'new',
      }),
    ])

    if (leadResult.error) console.error('Lead insert failed:', leadResult.error.message)
    if (requestResult.error) console.error('Request insert failed:', requestResult.error.message)

    setLoading(false)

    if (leadResult.error && requestResult.error) {
      setError(
        t(
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
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          {t('Name *', 'الاسم *', 'Name *')}
          <input required value={form.name} onChange={update('name')} className={inputClass} />
        </label>
        <label className="block text-sm font-medium">
          {t('E-Mail *', 'البريد الإلكتروني *', 'Email *')}
          <input type="email" required value={form.email} onChange={update('email')} className={inputClass} />
        </label>
        <label className="block text-sm font-medium">
          {t('Telefon', 'الهاتف', 'Phone')}
          <input type="tel" value={form.phone} onChange={update('phone')} className={inputClass} />
        </label>
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
        <ul className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Reinigungsarten">
          {REINIGUNGSARTEN.map((r) => {
            const isSelected = r.id === serviceId
            return (
              <li
                key={r.id}
                className={`flex flex-col justify-between gap-3 rounded-xl border-2 p-4 transition ${
                  isSelected
                    ? 'border-primary bg-primary/[0.03] shadow-md'
                    : 'border-primary/10 bg-card hover:border-primary/30'
                }`}
              >
                <div>
                  <span className="block font-bold text-primary">{r.label}</span>
                  <span className="mt-1 block text-sm text-primary/70">{r.desc}</span>
                </div>
                <button
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setServiceId(r.id)}
                  className={`self-start rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    isSelected
                      ? 'bg-primary text-card'
                      : 'border border-primary/30 text-primary hover:bg-primary/5'
                  }`}
                >
                  {isSelected ? t('✓ Ausgewählt', '✓ تم الاختيار', '✓ Selected') : t('Auswählen', 'اختيار', 'Select')}
                </button>
              </li>
            )
          })}
        </ul>
        {isOther && (
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
