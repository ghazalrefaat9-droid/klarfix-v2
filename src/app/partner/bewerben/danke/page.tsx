'use client'

import Link from 'next/link'
import { CheckCircle, Mail } from 'lucide-react'
import { useLang } from '@/components/LanguageProvider'

export default function BewerbenDankePage() {
  const { t } = useLang()

  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <div className="rounded-2xl bg-white p-8 text-center shadow-lg">
        <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500" aria-hidden="true" />
        <h1 className="text-2xl font-bold text-gray-900">
          {t('Antrag erfolgreich gesendet!', 'تم إرسال طلبك بنجاح!', 'Application sent successfully!')}
        </h1>

        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5 text-start">
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 h-6 w-6 shrink-0 text-[#2563eb]" aria-hidden="true" />
            <p className="text-sm text-gray-700">
              {t(
                'Vielen Dank für deine Bewerbung. Wir prüfen deinen Antrag sorgfältig und melden uns ',
                'شكرًا لتقديمك. سنقوم بدراسة طلبك وسيتم ',
                'Thank you for your application. We will review it carefully and '
              )}
              <strong>
                {t('in Kürze per E-Mail', 'الرد عليك قريبًا عبر البريد الإلكتروني', 'get back to you by email shortly')}
              </strong>
              {t(' bei dir.', '.', '.')}
            </p>
          </div>
        </div>

        <p className="mt-5 text-sm text-gray-500">
          {t(
            'Nach der Annahme fordern wir die Dokumente (Gewerbe & Haftpflicht) an.',
            'بعد قبول طلبك سنطلب منك صور وثائق السجل التجاري وتأمين المسؤولية.',
            'Once accepted, we will request your documents (business registration & liability insurance).'
          )}
        </p>

        <Link
          href="/"
          className="mt-8 inline-block rounded-2xl bg-[#2563eb] px-6 py-3 font-semibold text-white shadow-md hover:opacity-90"
        >
          {t('Zur Startseite', 'العودة إلى الصفحة الرئيسية', 'Back to home')}
        </Link>
      </div>
    </main>
  )
}
