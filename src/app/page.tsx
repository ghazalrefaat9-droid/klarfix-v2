'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, CalendarCheck, CalendarX, Check, ChevronDown, FileText, ReceiptEuro, Send, ShieldCheck } from 'lucide-react'
import { useLang } from '@/components/LanguageProvider'
import AlleReinigungsartenCompact from '@/components/AlleReinigungsartenCompact'
import { BRAND } from '@/lib/brand'
import Decor from '@/components/Decor'

// "So funktioniert es": green -> orange -> dark green (KlarFix primary).
const STEPS = [
  {
    icon: Send,
    color: BRAND.green,
    de: 'Anfrage senden',
    ar: 'أرسل طلبك',
    en: 'Send your request',
    subDe: 'In 2 Minuten · ohne Anmeldung',
    subAr: 'في دقيقتين · بدون تسجيل',
    subEn: 'In 2 minutes · no sign-up',
  },
  {
    icon: FileText,
    color: BRAND.orange,
    de: 'Angebot erhalten',
    ar: 'احصل على عرض السعر',
    en: 'Receive your quote',
    subDe: 'Erhalte dein persönliches Angebot',
    subAr: 'احصل على عرضك الخاص',
    subEn: 'Get your personal offer',
  },
  {
    icon: CalendarCheck,
    color: BRAND.darkGreen,
    de: 'Termin bestätigen',
    ar: 'أكّد الموعد',
    en: 'Confirm the appointment',
    subDe: 'Entspannt zurücklehnen – wir putzen!',
    subAr: 'استرخِ – نحن نتولى التنظيف!',
    subEn: 'Sit back and relax – we clean!',
  },
]

// "Warum KlarFix?" – same brand tints as the service icons (light green, light orange, mint).
const TRUST = [
  {
    icon: ShieldCheck,
    circle: '#DFF0E3',
    color: '#1A3C2E',
    hl: false,
    de: 'Geprüfte Partner',
    ar: 'شركاء معتمدون',
    en: 'Vetted partners',
    subDe: 'Nur Partner mit Nachweis & Erfahrung',
    subAr: 'فقط شركاء لديهم إثباتات وخبرة',
    subEn: 'Only partners with credentials & experience',
  },
  {
    icon: ReceiptEuro,
    circle: '#F5D6C0',
    color: '#C67A4A',
    hl: true,
    de: 'Festpreis ohne Überraschungen',
    ar: 'سعر ثابت بدون مفاجآت',
    en: 'Fixed price, no surprises',
    subDe: 'Der Preis, den du siehst, ist der Preis, den du zahlst',
    subAr: 'السعر الذي تراه هو السعر الذي تدفعه',
    subEn: 'The price you see is the price you pay',
  },
  {
    icon: CalendarX,
    circle: '#F7E8C0',
    color: '#B98A2F',
    hl: true,
    de: 'Kostenlos stornieren per E-Mail bis 24h vorher',
    ar: 'إلغاء مجاني عبر الإيميل حتى قبل 24 ساعة',
    en: 'Free cancellation by e-mail up to 24h before',
    subDe: 'Bis 24h vorher, ohne Fragen',
    subAr: 'حتى 24 ساعة قبل الموعد، دون أي أسئلة',
    subEn: 'Up to 24h before, no questions asked',
  },
]

// Small trust card under the hero button.
const HERO_POINTS = [
  { de: '24h Antwort', ar: 'رد خلال 24 ساعة', en: 'Reply within 24h' },
  { de: 'Geprüfte Partner', ar: 'شركاء معتمدون', en: 'Vetted partners' },
  { de: 'Ohne Anmeldung', ar: 'بدون تسجيل', en: 'No sign-up' },
]

export default function HomePage() {
  const { t } = useLang()
  const heroTitle = t('Saubere Räume. Klare Preise.', 'مساحات نظيفة. أسعار واضحة.', 'Clean spaces. Clear prices.')
  const split = heroTitle.indexOf('. ')
  const heroA = split === -1 ? heroTitle : heroTitle.slice(0, split + 1)
  const heroB = split === -1 ? '' : heroTitle.slice(split + 2)

  return (
    <main>
      <section className="relative isolate bg-background px-4 pb-16 pt-14 text-primary md:pb-24 md:pt-20">
        <Decor
          items={[
            { k: 'vacuum', x: 0.03, y: 0.08, size: 50, rot: -8 },
            { k: 'spray', x: 0.97, y: 0.07, size: 46, rot: 10, m: false },
            { k: 'sparkle', x: 0.33, y: 0.1, size: 40, m: false },
            { k: 'sparkle', x: 0.96, y: 0.5, size: 42, delay: 3 },
          ]}
        />
        <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2 md:gap-12">
          <div className="text-center md:text-start">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-[#C67A4A]">
              {t('Reinigung in Stuttgart', 'تنظيف في شتوتغارت', 'Cleaning in Stuttgart')}
            </p>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-[#1A3C2E] sm:text-5xl lg:text-6xl">
              {heroA}{' '}
              <span className="text-[#C67A4A] underline decoration-[#E9B44C]/40 decoration-[6px] underline-offset-[6px]">
                {heroB}
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#2F4A3A] md:mx-0">
              {t(
                'Wohnung, Büro, Fenster oder Grundreinigung – geprüfte Partner, faire Preise, schnelle Antwort.',
                'شقق ومكاتب ونوافذ وتنظيف شامل – شركاء معتمدون وأسعار عادلة ورد سريع.',
                'Apartment, office, windows or deep cleaning – vetted partners, fair prices, fast replies.',
              )}
            </p>
            <div className="mt-8 flex flex-col items-center gap-5 md:items-start">
              <Link
                href="/buchen"
                className="rounded-full bg-[#1A3C2E] px-8 py-3.5 text-lg font-semibold text-card shadow-md transition-colors hover:bg-[#2D5A4C]"
              >
                {t('Preis anfragen', 'اطلب السعر', 'Request a quote')}
              </Link>
              <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 rounded-2xl bg-[#FFFFFF] px-5 py-3 text-sm font-medium text-primary shadow-sm ring-1 ring-primary/10 md:justify-start">
                {HERO_POINTS.map((p) => (
                  <li key={p.de} className="flex items-center gap-1.5">
                    <Check className="h-4 w-4 shrink-0" strokeWidth={3} style={{ color: BRAND.green }} aria-hidden="true" />
                    {t(p.de, p.ar, p.en)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-xl md:max-w-none">
            <Image
              src="/hero-wohnzimmer.webp"
              alt={t('Helles, sauberes Wohnzimmer', 'غرفة معيشة مشرقة ونظيفة', 'Bright, clean living room')}
              width={1400}
              height={933}
              preload
              sizes="(min-width: 768px) 50vw, 100vw"
              className="h-auto w-full rounded-3xl object-cover shadow-lg ring-1 ring-primary/10"
            />
          </div>
        </div>
        <div className="mt-10 flex justify-center">
          <a
            href="#leistungen"
            aria-label={t('Nach unten scrollen', 'التمرير للأسفل', 'Scroll down')}
            className="flex h-10 w-10 items-center justify-center rounded-full text-primary/60 transition-colors hover:bg-primary/5 hover:text-primary motion-safe:animate-bounce"
          >
            <ChevronDown className="h-6 w-6" />
          </a>
        </div>
      </section>

      <AlleReinigungsartenCompact />

      <div className="relative isolate">
      <Decor
        items={[
          { k: 'calendar', x: 0.04, y: 0.08, size: 48 },
          { k: 'bucket', x: 0.04, y: 0.5, size: 50, m: false },
          { k: 'squeegee', x: 0.95, y: 0.9, size: 46, rot: -10, m: false },
        ]}
      />
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
                className="flex items-center justify-between gap-4 rounded-2xl bg-[#FFFFFF] p-5 text-[#1A3C2E] shadow-md sm:p-6"
              >
                <div className="min-w-0">
                  <h3 className="text-lg font-bold sm:text-xl">{t(step.de, step.ar, step.en)}</h3>
                  <p className="mt-1 text-sm text-[#2F4A3A] sm:text-base">{t(step.subDe, step.subAr, step.subEn)}</p>
                </div>
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#EAF4EC] sm:h-16 sm:w-16">
                  <Icon className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden="true" />
                </span>
              </li>
            )
          })}
        </ol>
        <div className="mt-8 text-center">
          <Link
            href="/buchen"
            className="inline-flex items-center gap-2 rounded-full bg-[#1A3C2E] px-10 py-4 text-lg font-bold text-[#FFFFFF] shadow-lg transition-colors hover:bg-[#2D5A4C]"
          >
            {t('Jetzt anfragen', 'اطلب الآن', 'Request now')}
            <ArrowRight className="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
          </Link>
        </div>
      </section>
      </div>

      <section className="relative isolate bg-[#FFFFFF] px-4 pb-14 pt-12">
        <Decor
          items={[
            { k: 'leaf', x: 0.04, y: 0.1, size: 46 },
            { k: 'shield', x: 0.96, y: 0.12, size: 48 },
            { k: 'smiley', x: 0.05, y: 0.9, size: 44, m: false },
            { k: 'heart', x: 0.95, y: 0.9, size: 42 },
            { k: 'sparkle', x: 0.5, y: 0.03, size: 40 },
          ]}
        />
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold text-primary">
            {t('Warum KlarFix?', 'لماذا KlarFix؟', 'Why KlarFix?')}
          </h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-3">
            {TRUST.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.de} className="flex items-center gap-4 rounded-2xl bg-[#FFFFFF] p-5 shadow-sm ring-1 ring-primary/10 sm:flex-col sm:text-center">
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: item.circle, color: item.color }}
                  >
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    {(() => {
                      const title = t(item.de, item.ar, item.en)
                      const sp = title.indexOf(' ')
                      return (
                        <p className="font-bold text-[#1A3C2E]">
                          {item.hl && sp > 0 ? (
                            <>
                              <span className="text-[#C67A4A]">{title.slice(0, sp)}</span>
                              {title.slice(sp)}
                            </>
                          ) : (
                            title
                          )}
                        </p>
                      )
                    })()}
                    <p className="mt-1 text-sm text-[#2F4A3A]">{t(item.subDe, item.subAr, item.subEn)}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </section>
    </main>
  )
}
