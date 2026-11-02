'use client'

import Link from 'next/link'
import { AppWindow, Building2, House, Sparkles, type LucideIcon } from 'lucide-react'
import { SERVICES, serviceDesc, serviceName } from '@/lib/services'
import { useLang } from '@/components/LanguageProvider'

const SERVICE_ICONS: Record<string, LucideIcon> = {
  Wohnungsreinigung: House,
  Büroreinigung: Building2,
  Fensterreinigung: AppWindow,
  Grundreinigung: Sparkles,
}

export default function HomePage() {
  const { t, lang } = useLang()

  return (
    <main>
      <section className="bg-background px-4 py-24 text-primary">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-primary/70">
            {t('Reinigung in Stuttgart', 'تنظيف في شتوتغارت', 'Cleaning in Stuttgart')}
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-primary sm:text-6xl">
            {t(
              'Saubere Räume. Klare Preise.',
              'مساحات نظيفة. أسعار واضحة.',
              'Clean spaces. Clear prices.',
            )}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-primary/80">
            {t(
              'Wohnung, Büro, Fenster oder Grundreinigung – geprüfte Partner, faire Preise, schnelle Antwort.',
              'شقق ومكاتب ونوافذ وتنظيف شامل – شركاء معتمدون وأسعار عادلة ورد سريع.',
              'Apartment, office, windows or deep cleaning – vetted partners, fair prices, fast replies.',
            )}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/buchen"
              className="rounded-full bg-primary px-7 py-3 font-semibold text-card shadow-md transition-colors hover:bg-primary-hover"
            >
              {t('Preis anfragen', 'اطلب السعر', 'Request a quote')}
            </Link>
            <a
              href="#leistungen"
              className="rounded-full border border-primary/30 bg-card px-7 py-3 font-semibold text-primary transition-colors hover:border-primary"
            >
              {t('Leistungen ansehen', 'عرض الخدمات', 'View services')}
            </a>
          </div>
        </div>
      </section>

      <section id="leistungen" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-3xl font-bold text-primary">
          {t('Unsere Leistungen', 'خدماتنا', 'Our services')}
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s) => {
            const Icon = SERVICE_ICONS[s.key] ?? Sparkles
            return (
              <div key={s.key} className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-primary/10">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background text-primary">
                  <Icon className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{serviceName(s, lang)}</h3>
                <p className="mt-2 text-sm text-primary/80">{serviceDesc(s, lang)}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section id="preise" className="bg-background px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold text-primary">{t('Preise', 'الأسعار', 'Prices')}</h2>
          <p className="mt-3 text-center text-sm text-primary/70">
            {t(
              'Richtpreise pro m². Der genaue Preis erhalten Sie nach Ihrer Anfrage.',
              'أسعار تقريبية لكل م². السعر النهائي يُرسل بعد طلبك.',
              'Indicative prices per m². You receive the exact price after your request.',
            )}
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map((s) => (
              <div key={s.key} className="flex flex-col rounded-2xl bg-card p-6 text-center shadow-sm ring-1 ring-primary/10">
                <h3 className="font-semibold">{serviceName(s, lang)}</h3>
                <p className="mt-4 text-sm text-primary/70">{t('ab', 'من', 'from')}</p>
                <p className="text-3xl font-extrabold text-primary">
                  {s.priceFrom} €
                </p>
                <p className="text-sm text-primary/70">{t('pro m²', 'لكل م²', 'per m²')}</p>
                <Link
                  href={`/buchen?service=${encodeURIComponent(s.key)}`}
                  className="mt-6 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-card transition-colors hover:bg-primary-hover"
                >
                  {t('Anfragen', 'اطلب', 'Request')}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-3xl font-bold text-primary">
          {t('So funktioniert es', 'كيف تعمل الخدمة', 'How it works')}
        </h2>
        <ol className="mt-10 grid gap-6 sm:grid-cols-3">
          {[
            { de: 'Anfrage senden', ar: 'أرسل طلبك', en: 'Send your request', n: '1' },
            { de: 'Angebot erhalten', ar: 'احصل على عرض السعر', en: 'Receive your quote', n: '2' },
            { de: 'Termin bestätigen', ar: 'أكد الموعد', en: 'Confirm the appointment', n: '3' },
          ].map((step) => (
            <li key={step.n} className="rounded-2xl bg-card p-6 text-center shadow-sm ring-1 ring-primary/10">
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary font-bold text-card">
                {step.n}
              </span>
              <p className="mt-4 font-semibold">{t(step.de, step.ar, step.en)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="px-4 pb-4 pt-8">
        <div className="mx-auto max-w-5xl rounded-3xl bg-primary px-6 py-14 text-center text-card shadow-lg">
          <h2 className="text-2xl font-bold">
            {t(
              'Bereit für saubere Räume?',
              'هل أنت مستعد لمساحات نظيفة؟',
              'Ready for clean spaces?',
            )}
          </h2>
          <Link
            href="/buchen"
            className="mt-6 inline-block rounded-full bg-card px-7 py-3 font-semibold text-primary transition-colors hover:bg-background"
          >
            {t('Jetzt Preis anfragen', 'اطلب السعر الآن', 'Request a quote now')}
          </Link>
        </div>
      </section>
    </main>
  )
}
