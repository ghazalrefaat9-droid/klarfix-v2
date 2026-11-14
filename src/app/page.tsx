'use client'

import Link from 'next/link'
import { ArrowRight, CalendarCheck, ChevronDown, FileText, Send } from 'lucide-react'
import { useLang } from '@/components/LanguageProvider'
import AlleReinigungsartenCompact from '@/components/AlleReinigungsartenCompact'

// "So funktioniert es": green -> orange -> dark green (KlarFix primary).
const STEPS = [
  {
    icon: Send,
    color: '#2D8A57',
    de: 'Anfrage senden',
    ar: 'أرسل طلبك',
    en: 'Send your request',
    subDe: 'In 2 Minuten · ohne Anmeldung',
    subAr: 'في دقيقتين · بدون تسجيل',
    subEn: 'In 2 minutes · no sign-up',
  },
  {
    icon: FileText,
    color: '#D9772B',
    de: 'Angebot erhalten',
    ar: 'احصل على عرض السعر',
    en: 'Receive your quote',
    subDe: 'Vergleiche echte Preise von geprüften Partnern',
    subAr: 'قارن أسعاراً حقيقية من شركاء معتمدين',
    subEn: 'Compare real prices from vetted partners',
  },
  {
    icon: CalendarCheck,
    color: '#1B4332',
    de: 'Termin bestätigen',
    ar: 'أكّد الموعد',
    en: 'Confirm the appointment',
    subDe: 'Entspannt zurücklehnen – wir putzen!',
    subAr: 'استرخِ – نحن نتولى التنظيف!',
    subEn: 'Sit back and relax – we clean!',
  },
]

export default function HomePage() {
  const { t } = useLang()

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
          <div className="mt-10 flex flex-col items-center gap-6">
            <Link
              href="/buchen"
              className="rounded-full bg-primary px-8 py-3.5 text-lg font-semibold text-card shadow-md transition-colors hover:bg-primary-hover"
            >
              {t('Preis anfragen', 'اطلب السعر', 'Request a quote')}
            </Link>
            <a
              href="#leistungen"
              aria-label={t('Nach unten scrollen', 'التمرير للأسفل', 'Scroll down')}
              className="flex h-10 w-10 items-center justify-center rounded-full text-primary/60 transition-colors hover:bg-primary/5 hover:text-primary motion-safe:animate-bounce"
            >
              <ChevronDown className="h-6 w-6" />
            </a>
          </div>
        </div>
      </section>

      <AlleReinigungsartenCompact />

      <section className="mx-auto max-w-2xl px-4 py-16">
        <h2 className="text-center text-3xl font-bold text-primary">
          {t('So funktioniert es', 'كيف تعمل الخدمة', 'How it works')}
        </h2>
        <ol className="mt-10 space-y-4">
          {STEPS.map((step) => {
            const Icon = step.icon
            return (
              <li
                key={step.de}
                className="flex items-center justify-between gap-4 rounded-2xl p-5 text-[#FFFFFF] shadow-md sm:p-6"
                style={{ backgroundColor: step.color }}
              >
                <div className="min-w-0">
                  <h3 className="text-lg font-bold sm:text-xl">{t(step.de, step.ar, step.en)}</h3>
                  <p className="mt-1 text-sm opacity-90 sm:text-base">{t(step.subDe, step.subAr, step.subEn)}</p>
                </div>
                <span
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#FFFFFF] shadow-sm sm:h-16 sm:w-16"
                  style={{ color: step.color }}
                >
                  <Icon className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden="true" />
                </span>
              </li>
            )
          })}
        </ol>
        <div className="mt-8 text-center">
          <Link
            href="/buchen"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-10 py-4 text-lg font-bold text-card shadow-lg transition-colors hover:bg-primary-hover"
          >
            {t('Jetzt anfragen', 'اطلب الآن', 'Request now')}
            <ArrowRight className="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
          </Link>
        </div>
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
            className="mt-7 inline-block rounded-full bg-[#FFFFFF] px-10 py-4 text-lg font-bold text-primary shadow-xl ring-4 ring-[#FFFFFF]/20 transition hover:scale-105 hover:shadow-2xl motion-reduce:hover:scale-100"
          >
            {t('Jetzt Preis anfragen', 'اطلب السعر الآن', 'Request a quote now')}
          </Link>
        </div>
      </section>
    </main>
  )
}
