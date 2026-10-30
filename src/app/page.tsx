'use client'

import Link from 'next/link'
import { SERVICES, serviceDesc, serviceName } from '@/lib/services'
import { useLang } from '@/components/LanguageProvider'

export default function HomePage() {
  const { t, lang } = useLang()

  return (
    <main>
      <section className="bg-gradient-to-br from-[#0F60C6] to-[#0a4a9a] px-4 py-20 text-white">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest opacity-80">
            {t('Reinigung in Stuttgart', 'تنظيف في شتوتغارت', 'Cleaning in Stuttgart')}
          </p>
          <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
            {t(
              'Saubere Räume. Klare Preise.',
              'مساحات نظيفة. أسعار واضحة.',
              'Clean spaces. Clear prices.',
            )}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg opacity-90">
            {t(
              'Wohnung, Büro, Fenster oder Grundreinigung – geprüfte Partner, faire Preise, schnelle Antwort.',
              'شقق ومكاتب ونوافذ وتنظيف شامل – شركاء معتمدون وأسعار عادلة ورد سريع.',
              'Apartment, office, windows or deep cleaning – vetted partners, fair prices, fast replies.',
            )}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/buchen"
              className="rounded-lg bg-white px-6 py-3 font-semibold text-[#0F60C6] shadow hover:opacity-90"
            >
              {t('Preis anfragen', 'اطلب السعر', 'Request a quote')}
            </Link>
            <a
              href="#leistungen"
              className="rounded-lg border border-white/60 px-6 py-3 font-semibold text-white hover:bg-white/10"
            >
              {t('Leistungen ansehen', 'عرض الخدمات', 'View services')}
            </a>
          </div>
        </div>
      </section>

      <section id="leistungen" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-3xl font-bold text-gray-900">
          {t('Unsere Leistungen', 'خدماتنا', 'Our services')}
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s) => (
            <div key={s.key} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
              <div className="text-4xl">{s.icon}</div>
              <h3 className="mt-4 text-lg font-semibold">{serviceName(s, lang)}</h3>
              <p className="mt-2 text-sm text-gray-600">{serviceDesc(s, lang)}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="preise" className="bg-white px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold">{t('Preise', 'الأسعار', 'Prices')}</h2>
          <p className="mt-3 text-center text-sm text-gray-500">
            {t(
              'Richtpreise pro m². Der genaue Preis erhalten Sie nach Ihrer Anfrage.',
              'أسعار تقريبية لكل م². السعر النهائي يُرسل بعد طلبك.',
              'Indicative prices per m². You receive the exact price after your request.',
            )}
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map((s) => (
              <div key={s.key} className="flex flex-col rounded-2xl border border-gray-200 p-6 text-center">
                <h3 className="font-semibold">{serviceName(s, lang)}</h3>
                <p className="mt-4 text-sm text-gray-500">{t('ab', 'من', 'from')}</p>
                <p className="text-3xl font-extrabold text-[#0F60C6]">
                  {s.priceFrom} €
                </p>
                <p className="text-sm text-gray-500">{t('pro m²', 'لكل م²', 'per m²')}</p>
                <Link
                  href={`/buchen?service=${encodeURIComponent(s.key)}`}
                  className="mt-6 rounded-lg bg-[#0F60C6] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                >
                  {t('Anfragen', 'اطلب', 'Request')}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-3xl font-bold">
          {t('So funktioniert es', 'كيف تعمل الخدمة', 'How it works')}
        </h2>
        <ol className="mt-10 grid gap-6 sm:grid-cols-3">
          {[
            { de: 'Anfrage senden', ar: 'أرسل طلبك', en: 'Send your request', n: '1' },
            { de: 'Angebot erhalten', ar: 'احصل على عرض السعر', en: 'Receive your quote', n: '2' },
            { de: 'Termin bestätigen', ar: 'أكد الموعد', en: 'Confirm the appointment', n: '3' },
          ].map((step) => (
            <li key={step.n} className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-gray-200">
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#0F60C6] font-bold text-white">
                {step.n}
              </span>
              <p className="mt-4 font-semibold">{t(step.de, step.ar, step.en)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-[#0F60C6] px-4 py-14 text-center text-white">
        <h2 className="text-2xl font-bold">
          {t(
            'Bereit für saubere Räume?',
            'هل أنت مستعد لمساحات نظيفة؟',
            'Ready for clean spaces?',
          )}
        </h2>
        <Link
          href="/buchen"
          className="mt-6 inline-block rounded-lg bg-white px-6 py-3 font-semibold text-[#0F60C6] hover:opacity-90"
        >
          {t('Jetzt Preis anfragen', 'اطلب السعر الآن', 'Request a quote now')}
        </Link>
      </section>
    </main>
  )
}
