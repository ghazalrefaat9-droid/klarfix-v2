'use client'

import Link from 'next/link'
import { useLang } from '@/components/LanguageProvider'

export default function NotFound() {
  const { t } = useLang()

  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-6xl font-extrabold text-primary">404</p>
      <h1 className="mt-4 text-2xl font-bold text-primary">
        {t('Seite nicht gefunden', 'الصفحة غير موجودة', 'Page not found')}
      </h1>
      <p className="mt-3 text-primary/80">
        {t(
          'Die gesuchte Seite existiert nicht oder wurde verschoben.',
          'الصفحة التي تبحث عنها غير موجودة أو تم نقلها.',
          'The page you are looking for does not exist or has been moved.',
        )}
      </p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-full bg-primary px-7 py-3 font-semibold text-card transition-colors hover:bg-primary-hover"
      >
        {t('Zur Startseite', 'إلى الصفحة الرئيسية', 'Back to home')}
      </Link>
    </main>
  )
}
