'use client'

import Link from 'next/link'
import { useLang } from './LanguageProvider'

export default function Footer() {
  const { t } = useLang()

  return (
    <footer className="mt-16 bg-gray-900 text-gray-300">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="text-lg font-bold text-white">KlarFix</p>
          <p className="mt-2 text-sm">
            {t('Reinigungsservice in Stuttgart und Umgebung.', 'خدمة تنظيف في شتوتغارت والمناطق المحيطة.')}
          </p>
        </div>
        <div className="text-sm">
          <p className="mb-2 font-semibold text-white">{t('Navigation', 'التنقل')}</p>
          <ul className="space-y-1">
            <li>
              <Link href="/buchen" className="hover:text-white">
                {t('Jetzt buchen', 'احجز الآن')}
              </Link>
            </li>
            <li>
              <Link href="/partner/werden" className="hover:text-white">
                {t('Partner werden', 'كن شريكاً')}
              </Link>
            </li>
            <li>
              <Link href="/partner/login" className="hover:text-white">
                {t('Partner-Login', 'دخول الشركاء')}
              </Link>
            </li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="mb-2 font-semibold text-white">{t('Rechtliches', 'قانوني')}</p>
          <ul className="space-y-1">
            <li>
              <span>{t('Impressum', 'بيانات الشركة')}</span>
            </li>
            <li>
              <span>{t('Datenschutz', 'سياسة الخصوصية')}</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-800 py-4 text-center text-xs text-gray-500">
        © KlarFix
      </div>
    </footer>
  )
}
