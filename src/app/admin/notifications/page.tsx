'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCheck, Inbox } from 'lucide-react'
import { useLang } from '@/components/LanguageProvider'
import AdminNotifications, {
  NotificationRow,
  markAllAdminNotificationsRead,
  useNotifications,
  useOpenNotification,
} from '@/components/admin/AdminNotifications'

// Full list behind "Alle Benachrichtigungen ansehen" (newest first, read and unread).
export default function AdminNotificationsPage() {
  const router = useRouter()
  const { t } = useLang()
  const [ready, setReady] = useState(false)
  const { data } = useNotifications(100)
  const openItem = useOpenNotification()

  useEffect(() => {
    const init = async () => {
      if (!localStorage.getItem('admin')) {
        router.replace('/admin/login')
        return
      }
      setReady(true)
    }
    init()
  }, [router])

  if (!ready) return <div className="min-h-screen bg-[#E6F1E6] p-8 text-center text-[#4B5563]">{t('Lade…', 'جارٍ التحميل…', 'Loading…')}</div>

  return (
    <div className="min-h-screen bg-[#E6F1E6]">
      <main className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
        <div className="mb-5 flex items-center gap-3">
          <Link
            href="/admin/dashboard"
            aria-label={t('Zurück zum Dashboard', 'العودة إلى لوحة التحكم', 'Back to dashboard')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FFFFFF] text-[#1A4D2E] shadow-[0_2px_10px_rgba(0,0,0,0.05)] hover:bg-[#F5F5F0]"
          >
            <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
          </Link>
          <h1 className="min-w-0 flex-1 truncate text-2xl font-bold text-[#1A4D2E]">{t('Benachrichtigungen', 'الإشعارات', 'Notifications')}</h1>
          <AdminNotifications />
        </div>

        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => markAllAdminNotificationsRead()}
            disabled={!data || data.total === 0}
            className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#FFFFFF] px-4 text-sm font-semibold text-[#1A4D2E] shadow-sm hover:bg-[#F5F5F0] disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" aria-hidden="true" />
            {t('Alle als gelesen markieren', 'تعليم الكل كمقروء', 'Mark all as read')}
          </button>
        </div>

        <div className="overflow-hidden rounded-[20px] bg-[#FFFFFF] shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
          {!data ? (
            <p className="p-8 text-center text-sm text-[#4B5563]">{t('Lade…', 'جارٍ التحميل…', 'Loading…')}</p>
          ) : data.items.length === 0 ? (
            <div className="p-10 text-center text-sm text-[#4B5563]">
              <Inbox className="mx-auto mb-2 h-8 w-8 opacity-40" aria-hidden="true" />
              {t('Keine Benachrichtigungen', 'لا توجد إشعارات', 'No notifications')}
            </div>
          ) : (
            <div className="divide-y divide-[#1A4D2E]/5">
              {data.items.map((n) => (
                <NotificationRow key={n.id} n={n} onOpen={openItem} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
