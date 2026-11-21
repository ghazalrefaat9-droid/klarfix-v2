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
    color: '#2E8B57',
    de: 'Anfrage senden',
    ar: 'أرسل طلبك',
    en: 'Send your request',
    subDe: 'In 2 Minuten · ohne Anmeldung',
    subAr: 'في دقيقتين · بدون تسجيل',
    subEn: 'In 2 minutes · no sign-up',
  },
  {
    icon: FileText,
    color: '#B56B3A',
    de: 'Angebot erhalten',
    ar: 'احصل على عرض السعر',
    en: 'Receive your quote',
    subDe: 'Erhalte dein persönliches Angebot',
    subAr: 'احصل على عرضك الخاص',
    subEn: 'Get your personal offer',
  },
  {
    icon: CalendarCheck,
    color: '#1A3C2E',
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
    <main className="overflow-hidden">
      <section className="relative isolate flex min-h-[100dvh] flex-col justify-center bg-[#E0EDE6] px-4 pb-20 pt-28 text-[#1A3C2E] md:items-center md:py-20">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-4 md:grid-cols-2 md:gap-12">
          <div className="text-center md:text-start">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#1A3C2E]">
              {t('Reinigung in Stuttgart', 'تنظيف في شتوتغارت', 'Cleaning in Stuttgart')}
            </p>
            <h1 className="text-[38px] font-bold leading-[1.08] tracking-tight text-[#1A3C2E] md:text-5xl lg:text-6xl">
              {heroA} {heroB}
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-snug text-[#1A3C2E] md:mx-0 md:text-lg">
              {t(
                'Wohnung, Büro, Fenster oder Grundreinigung – geprüfte Partner, faire Preise, schnelle Antwort.',
                'شقق ومكاتب ونوافذ وتنظيف شامل – شركاء معتمدون وأسعار عادلة ورد سريع.',
                'Apartment, office, windows or deep cleaning – vetted partners, fair prices, fast replies.',
              )}
            </p>
            <div className="mt-4 flex flex-col items-center gap-3 md:items-start">
              <Link
                href="/buchen"
                style={{ color: '#FFFFFF' }}
                className="relative z-10 inline-flex items-center justify-center rounded-full bg-[#1A3C2E] px-8 py-3 text-center text-base font-bold shadow-[0_6px_16px_rgba(26,60,46,0.25)] transition-colors hover:bg-[#2D5A4C]"
              >
                {t('Jetzt anfragen', 'اطلب الآن', 'Request now')}
              </Link>
              <ul className="grid w-full grid-cols-3 gap-1 rounded-2xl bg-white p-[10px] text-[11px] font-medium text-[#1A3C2E] shadow-sm md:max-w-md">
                {HERO_POINTS.map((p) => (
                  <li key={p.de} className="flex items-center justify-center gap-1 leading-tight">
                    <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={3} style={{ color: BRAND.green }} aria-hidden="true" />
                    {t(p.de, p.ar, p.en)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-xl md:max-w-none">
            <Image
              src="/hero-wohnzimmer.webp"
              alt={t('Lächelnde Reinigungskraft bei der Arbeit', 'عاملة تنظيف مبتسمة أثناء العمل', 'Smiling cleaner at work')}
              width={1456}
              height={768}
              preload
              sizes="(min-width: 768px) 50vw, 100vw"
              className="h-[220px] w-full rounded-3xl object-cover md:h-auto"
            />
          </div>
        </div>
        <a
          href="#leistungen"
          className="mx-auto mt-8 flex flex-col items-center gap-1 text-xs font-semibold text-[#1A3C2E]/80 transition-colors hover:text-[#1A3C2E]"
        >
          {t('Scrollen zum Mehr', 'مرّر للمزيد', 'Scroll for more')}
          <ChevronDown className="h-5 w-5 motion-safe:animate-bounce" aria-hidden="true" />
        </a>
      </section>

      <AlleReinigungsartenCompact />

      <div className="relative isolate bg-[#F1F5F2]">
      <Decor
        items={[
          { k: 'calendar', x: 0.04, y: 0.08, size: 48 },
          { k: 'bucket', x: 0.04, y: 0.5, size: 50, m: false },
          { k: 'squeegee', x: 0.95, y: 0.9, size: 46, rot: -10, m: false },
        ]}
      />
      <section className="mx-auto max-w-2xl px-4 py-16 md:py-20">
        <h2 className="text-center text-3xl font-bold text-[#1A3C2E]">
          {t('So funktioniert es', 'كيف تعمل الخدمة', 'How it works')}
        </h2>
        <ol className="mt-10 space-y-4">
          {STEPS.map((step) => {
            const Icon = step.icon
            return (
              <li
                key={step.de}
                style={{ backgroundColor: step.color }}
                className="flex items-center justify-between gap-4 rounded-[20px] p-5 text-[#FFFFFF] sm:p-6"
              >
                <div className="min-w-0">
                  <h3 className="text-lg font-bold sm:text-xl">{t(step.de, step.ar, step.en)}</h3>
                  <p className="mt-1 text-sm text-[#FFFFFF] sm:text-base">{t(step.subDe, step.subAr, step.subEn)}</p>
                </div>
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#FFFFFF] sm:h-16 sm:w-16" style={{ color: step.color }}>
                  <Icon className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden="true" />
                </span>
              </li>
            )
          })}
        </ol>
        <div className="mt-8 text-center">
          <Link
            href="/buchen"
            className="inline-flex items-center gap-2 rounded-full bg-[#1A3C2E] px-11 py-[1.1rem] text-xl font-bold text-[#FFFFFF] shadow-[0_6px_16px_rgba(26,60,46,0.25)] transition-colors hover:bg-[#2D5A4C] md:text-lg"
          >
            {t('Jetzt anfragen', 'اطلب الآن', 'Request now')}
            <ArrowRight className="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
          </Link>
        </div>
      </section>
      </div>

      <section className="relative isolate bg-[#FFFFFF] px-4 py-16 md:py-20">
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
            <h2 className="text-center text-3xl font-bold text-[#1A3C2E]">
            {t('Warum KlarFix?', 'لماذا KlarFix؟', 'Why KlarFix?')}
          </h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-3">
            {TRUST.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.de} className="flex items-center gap-4 rounded-2xl border border-[#D6E4D9] bg-[#FFFFFF] p-5 shadow-[0_2px_8px_rgba(26,60,46,0.06)] sm:flex-col sm:text-center">
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
