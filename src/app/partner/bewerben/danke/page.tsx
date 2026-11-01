import Link from 'next/link'
import { CheckCircle } from 'lucide-react'

export default function BewerbenDankePage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <div className="rounded-2xl bg-white p-8 text-center shadow-lg">
        <CheckCircle className="mx-auto mb-4 h-14 w-14 text-[#14B8A6]" />
        <h1 className="text-2xl font-bold text-gray-900">Antrag gesendet!</h1>
        <p dir="rtl" lang="ar" className="mt-1 text-xl font-bold text-gray-900">
          تم إرسال الطلب!
        </p>
        <p className="mt-4 text-gray-600">
          Wir prüfen deinen Antrag und melden uns. Nach Annahme fordern wir die Dokumente (Gewerbe &amp; Haftpflicht) an.
        </p>
        <Link href="/" className="mt-6 inline-block rounded-2xl bg-[#14B8A6] px-6 py-3 font-semibold text-white shadow-md hover:opacity-90">
          Zur Startseite
        </Link>
      </div>
    </main>
  )
}
