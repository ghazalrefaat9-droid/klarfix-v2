'use client'

import Link from 'next/link'
import { useLang } from '@/components/LanguageProvider'

export default function DankePage() {
  const { t } = useLang()

  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-700">
        ✓
      </div>
      <h1 className="mt-6 text-3xl font-bold">{t('Vielen Dank!', 'شكراً لك!', 'Thank you!')}</h1>
      <p className="mt-3 text-gray-600">
        {t(
          'Ihre Anfrage ist eingegangen. Wir melden uns in Kürze mit Ihrem Angebot.',
          'تم استلام طلبك. سنتواصل معك قريباً مع عرض السعر.',
          'We have received your request. We will contact you shortly with your quote.',
        )}
      </p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-lg bg-[#0F60C6] px-6 py-3 font-semibold text-white hover:opacity-90"
      >
        {t('Zurück zur Startseite', 'العودة إلى الصفحة الرئيسية', 'Back to home')}
      </Link>
    </main>
  )
}
