'use client'

import { Suspense, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { SERVICES, serviceName } from '@/lib/services'
import { useLang } from '@/components/LanguageProvider'

const inputClass =
  'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0F60C6] focus:outline-none focus:ring-2 focus:ring-[#0F60C6]/20'

function BookingForm() {
  const router = useRouter()
  const params = useSearchParams()
  const { t, lang } = useLang()

  const initialService = SERVICES.some((s) => s.key === params.get('service'))
    ? (params.get('service') as string)
    : SERVICES[0].key

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    postcode: '',
    service: initialService,
    area: '',
    date: '',
    message: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const update = (field: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const fullMessage = [
      form.date ? `Wunschtermin: ${form.date}` : '',
      form.message.trim(),
    ]
      .filter(Boolean)
      .join('\n')

    const { error: insertError } = await supabase.from('requests').insert({
      customer_name: form.name.trim(),
      customer_email: form.email.trim(),
      customer_phone: form.phone.trim() || null,
      postcode: form.postcode.trim(),
      service_type: form.service,
      area_sqm: form.area ? Math.round(Number(form.area)) : null,
      message: fullMessage || null,
      status: 'new',
    })

    setLoading(false)

    if (insertError) {
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
    <form onSubmit={handleSubmit} className="mt-8 space-y-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 sm:p-8">
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
        <label className="block text-sm font-medium">
          {t('Leistung *', 'الخدمة *', 'Service *')}
          <select required value={form.service} onChange={update('service')} className={inputClass}>
            {SERVICES.map((s) => (
              <option key={s.key} value={s.key}>
                {serviceName(s, lang)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          {t('Fläche in m²', 'المساحة بالمتر المربع', 'Area in m²')}
          <input type="number" min="1" value={form.area} onChange={update('area')} className={inputClass} />
        </label>
        <label className="block text-sm font-medium sm:col-span-2">
          {t('Wunschtermin', 'الموعد المفضل', 'Preferred date')}
          <input type="date" value={form.date} onChange={update('date')} className={inputClass} />
        </label>
      </div>

      <label className="block text-sm font-medium">
        {t('Nachricht', 'رسالة', 'Message')}
        <textarea rows={4} value={form.message} onChange={update('message')} className={inputClass} />
      </label>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-[#0F60C6] px-4 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-60"
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
      <p className="mt-2 text-gray-600">
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
