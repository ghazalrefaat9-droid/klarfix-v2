import Link from 'next/link'
import { CheckCircle, Mail } from 'lucide-react'

export default function BewerbenDankePage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <div className="rounded-2xl bg-white p-8 text-center shadow-lg">
        <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500" aria-hidden="true" />
        <h1 className="text-2xl font-bold text-gray-900">Antrag erfolgreich gesendet!</h1>
        <p dir="rtl" lang="ar" className="mt-1 text-xl font-bold text-gray-900">
          تم إرسال طلبك بنجاح!
        </p>

        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5 text-left">
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 h-6 w-6 shrink-0 text-[#2563eb]" aria-hidden="true" />
            <div className="space-y-3 text-sm text-gray-700">
              <p>
                Vielen Dank für deine Bewerbung. Wir prüfen deinen Antrag sorgfältig und melden uns{' '}
                <strong>in Kürze per E-Mail</strong> bei dir.
              </p>
              <p dir="rtl" lang="ar" className="text-right">
                شكرًا لتقديمك. سنقوم بدراسة طلبك وسيتم <strong>الرد عليك قريبًا عبر البريد الإلكتروني</strong>.
              </p>
            </div>
          </div>
        </div>

        <p className="mt-5 text-sm text-gray-500">
          Nach der Annahme fordern wir die Dokumente (Gewerbe &amp; Haftpflicht) an.
        </p>
        <p dir="rtl" lang="ar" className="mt-1 text-sm text-gray-500">
          بعد قبول طلبك سنطلب منك صور وثائق Gewerbe و Haftpflicht.
        </p>

        <Link
          href="/"
          className="mt-8 inline-block rounded-2xl bg-[#2563eb] px-6 py-3 font-semibold text-white shadow-md hover:opacity-90"
        >
          Zur Startseite / الصفحة الرئيسية
        </Link>
      </div>
    </main>
  )
}
