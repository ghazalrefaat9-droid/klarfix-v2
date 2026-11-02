'use client'

import Link from 'next/link'
import { useLang } from '@/components/LanguageProvider'

export default function DankePage() {
  const { t } = useLang()

  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-3xl text-primary">
        ✓
      </div>
      <h1 className="mt-6 text-3xl font-bold">{t('Vielen Dank!', 'شكراً لك!', 'Thank you!')}</h1>
      <p className="mt-3 text-primary/80">
        {t(
          'Ihre Anfrage ist eingegangen. Wir melden uns in Kürze mit Ihrem Angebot.',
          'تم استلام طلبك. سنتواصل معك قريباً مع عرض السعر.',
          'We have received your request. We will contact you shortly with your quote.',
        )}
      </p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-lg bg-primary px-6 py-3 font-semibold text-card hover:bg-primary-hover"
      >
        {t('Zurück zur Startseite', 'العودة إلى الصفحة الرئيسية', 'Back to home')}
      </Link>
    </main>
  )
}
