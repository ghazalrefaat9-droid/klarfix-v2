'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, BellRing, CheckCheck, Inbox, MessageCircle, Sparkles, UserPlus, type LucideIcon } from 'lucide-react'
import { useLang } from '@/components/LanguageProvider'
import { callApi } from '@/lib/apiClient'
import { BRAND } from '@/lib/brand'
import { NOTIFICATIONS_REFRESH_EVENT, markAdminNotificationRead, refreshAdminNotifications } from '@/lib/notificationsClient'

// Mirrors AdminNotification in src/lib/adminNotifications.ts
export type AdminNotification = {
  id: string
  type: 'chat' | 'partner' | 'request' | 'other'
  kind: 'chat' | 'application' | 'partner_verify' | 'request' | 'offer' | 'accepted' | 'rejected'
  name: string | null
  service: string | null
  city: string | null
  preview: string | null
  count: number
  createdAt: string
  href: string
  unread: boolean
}

type Data = { items: AdminNotification[]; total: number; chat: number; chatPartners: { id: string; count: number }[] }

const POLL_MS = 12000
const GRAY = '#4B5563'

const TYPE_STYLE: Record<AdminNotification['type'], { icon: LucideIcon; color: string; bg: string }> = {
  chat: { icon: MessageCircle, color: BRAND.green, bg: BRAND.greenTint },
  partner: { icon: UserPlus, color: BRAND.orange, bg: BRAND.orangeTint },
  request: { icon: Sparkles, color: BRAND.darkGreen, bg: BRAND.mint },
  other: { icon: Bell, color: GRAY, bg: '#F5F5F0' },
}

function useNotifications(limit: number) {
  const [data, setData] = useState<Data | null>(null)

  const load = useCallback(async () => {
    const res = await callApi<Data>('admin', `/api/admin/notifications?limit=${limit}`)
    if (res.ok && res.data) setData(res.data)
  }, [limit])

  useEffect(() => {
    const init = async () => {
      await load()
    }
    init()
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load()
    }, POLL_MS)
    const onRefresh = () => load()
    window.addEventListener(NOTIFICATIONS_REFRESH_EVENT, onRefresh)
    window.addEventListener('focus', onRefresh)
    return () => {
      clearInterval(timer)
      window.removeEventListener(NOTIFICATIONS_REFRESH_EVENT, onRefresh)
      window.removeEventListener('focus', onRefresh)
    }
  }, [load])

  return { data, reload: load }
}

// Text for one notification in the current language. Never contains email addresses or phone numbers.
export function useNotificationText() {
  const { t, lang } = useLang()
  const locale = lang === 'en' ? 'en-GB' : lang === 'ar' ? 'ar-DE' : 'de-DE'
  const unknown = t('Unbekannt', 'غير معروف', 'Unknown')

  const title = (n: AdminNotification) => {
    const name = n.name ?? unknown
    const where = [n.service, n.city].filter(Boolean)
    const serviceIn = n.city ? t(`${n.service ?? ''} in ${n.city}`, `${n.service ?? ''} في ${n.city}`, `${n.service ?? ''} in ${n.city}`) : (n.service ?? '')
    switch (n.kind) {
      case 'chat':
        return n.count > 1
          ? t(`${n.count} neue Nachrichten von ${name}`, `${n.count} رسائل جديدة من ${name}`, `${n.count} new messages from ${name}`)
          : t(`Neue Nachricht von ${name}`, `رسالة جديدة من ${name}`, `New message from ${name}`)
      case 'application':
        return t(`Neue Partner-Anmeldung: ${name} wartet auf Freigabe`, `تسجيل شريك جديد: ${name} بانتظار الموافقة`, `New partner sign-up: ${name} is waiting for approval`)
      case 'partner_verify':
        return t(`Partner ${name} wartet auf Freigabe (Dokumente prüfen)`, `الشريك ${name} بانتظار الموافقة (مراجعة المستندات)`, `Partner ${name} is waiting for approval (check documents)`)
      case 'request':
        return where.length
          ? t(`Neue Kunden-Anfrage: ${serviceIn}`, `طلب عميل جديد: ${serviceIn}`, `New customer request: ${serviceIn}`)
          : t('Neue Kunden-Anfrage', 'طلب عميل جديد', 'New customer request')
      case 'offer':
        return t(`Neues Partner-Angebot von ${name}${n.service ? ` für ${n.service}` : ''}`, `عرض جديد من الشريك ${name}${n.service ? ` لـ ${n.service}` : ''}`, `New partner offer from ${name}${n.service ? ` for ${n.service}` : ''}`)
      case 'accepted':
        return t(`Kunde hat Angebot angenommen: ${serviceIn}`, `العميل قبل العرض: ${serviceIn}`, `Customer accepted the offer: ${serviceIn}`)
      case 'rejected':
        return t(`Kunde hat Angebot abgelehnt: ${serviceIn}`, `العميل رفض العرض: ${serviceIn}`, `Customer declined the offer: ${serviceIn}`)
    }
  }

  const time = (iso: string) => {
    const diff = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
    if (diff < 1) return t('gerade eben', 'الآن', 'just now')
    if (diff < 60) return t(`vor ${diff} Min.`, `منذ ${diff} د`, `${diff} min ago`)
    if (diff < 24 * 60) {
      const h = Math.round(diff / 60)
      return t(`vor ${h} Std.`, `منذ ${h} س`, `${h} h ago`)
    }
    return new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' })
  }

  return { title, time }
}

export function NotificationRow({ n, onOpen }: { n: AdminNotification; onOpen: (n: AdminNotification) => void }) {
  const { title, time } = useNotificationText()
  const style = TYPE_STYLE[n.type]
  const Icon = style.icon
  return (
    <button
      type="button"
      onClick={() => onOpen(n)}
      className={`flex w-full items-start gap-3 px-4 py-3 text-start transition hover:bg-[#F5F5F0] ${n.unread ? 'bg-[#FFFFFF]' : 'bg-[#FFFFFF] opacity-70'}`}
    >
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: style.bg, color: style.color }}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[13px] leading-snug text-[#1A4D2E] ${n.unread ? 'font-semibold' : 'font-medium'}`}>{title(n)}</span>
        {n.preview && <span className="mt-0.5 block truncate text-[12px] text-[#4B5563]">„{n.preview}“</span>}
        <span className="mt-0.5 block text-[11px] text-[#4B5563]">{time(n.createdAt)}</span>
      </span>
      {n.unread && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-danger" aria-hidden="true" />}
    </button>
  )
}

export function useOpenNotification() {
  const router = useRouter()
  return useCallback(
    (n: AdminNotification) => {
      // The target page marks the item as read as well; marking here makes the count drop immediately.
      void markAdminNotificationRead(n.id)
      router.push(n.href)
    },
    [router],
  )
}

export async function markAllAdminNotificationsRead() {
  await callApi('admin', '/api/admin/notifications', 'POST', { action: 'readAll' })
  refreshAdminNotifications()
}

const circle =
  'relative flex h-12 w-12 items-center justify-center rounded-full bg-[#FFFFFF] shadow-[0_2px_10px_rgba(0,0,0,0.08)] transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A4D2E]/40'

function Badge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="absolute -end-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[11px] font-bold leading-none text-[#FFFFFF] shadow motion-safe:animate-pulse">
      {count > 99 ? '99+' : count}
    </span>
  )
}

// Bell (all notifications) + chat icon (only chat messages) for the top of every admin page.
export default function AdminNotifications() {
  const { t } = useLang()
  const router = useRouter()
  const { data, reload } = useNotifications(15)
  const openItem = useOpenNotification()
  const [open, setOpen] = useState(false)
  const [shakeKey, setShakeKey] = useState(0)
  const lastTotal = useRef<number | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const total = data?.total ?? 0
  const chat = data?.chat ?? 0

  // Shake the bell 3x on the first load with unread items and whenever the number goes up.
  useEffect(() => {
    if (!data) return
    const prev = lastTotal.current
    lastTotal.current = data.total
    if (data.total > 0 && (prev === null || data.total > prev)) {
      const id = requestAnimationFrame(() => setShakeKey((k) => k + 1))
      return () => cancelAnimationFrame(id)
    }
  }, [data])

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function openChats() {
    const partners = data?.chatPartners ?? []
    if (partners.length === 1) router.push(`/admin/dashboard?chat=${partners[0].id}`)
    else router.push('/admin/dashboard?tab=partners&unread=1')
  }

  const BellIcon = total > 0 ? BellRing : Bell
  const bellLabel = t(`Benachrichtigungen (${total} ungelesen)`, `الإشعارات (${total} غير مقروءة)`, `Notifications (${total} unread)`)
  const chatLabel = t(`Nachrichten (${chat} ungelesen)`, `الرسائل (${chat} غير مقروءة)`, `Messages (${chat} unread)`)

  return (
    <div ref={wrapRef} className="relative flex items-center gap-2 sm:gap-3">
      <button type="button" onClick={openChats} aria-label={chatLabel} title={chatLabel} className={circle}>
        <MessageCircle className="h-5 w-5" style={{ color: chat > 0 ? BRAND.orange : BRAND.darkGreen }} aria-hidden="true" />
        <Badge count={chat} />
      </button>

      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v)
          if (!open) reload()
        }}
        aria-label={bellLabel}
        title={bellLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`${circle} ${total > 0 ? 'ring-4 ring-danger/20' : ''}`}
      >
        <BellIcon
          key={shakeKey}
          className={`h-5 w-5 ${total > 0 && shakeKey > 0 ? 'klarfix-bell-shake' : ''}`}
          style={{ color: total > 0 ? BRAND.orange : BRAND.darkGreen }}
          aria-hidden="true"
        />
        <Badge count={total} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t('Benachrichtigungen', 'الإشعارات', 'Notifications')}
          className="absolute end-0 top-full z-[60] mt-2 w-[min(23rem,calc(100vw-2rem))] overflow-hidden rounded-2xl bg-[#FFFFFF] shadow-[0_12px_32px_rgba(0,0,0,0.18)] ring-1 ring-[#1A4D2E]/10"
        >
          <div className="flex items-center justify-between gap-2 border-b border-[#1A4D2E]/10 px-4 py-3">
            <p className="font-bold text-[#1A4D2E]">{t('Benachrichtigungen', 'الإشعارات', 'Notifications')}</p>
            {total > 0 && (
              <span className="rounded-full bg-danger px-2 py-0.5 text-[11px] font-bold text-[#FFFFFF]">
                {t(`${total} neu`, `${total} جديد`, `${total} new`)}
              </span>
            )}
          </div>
          <div className="max-h-[min(60vh,26rem)] divide-y divide-[#1A4D2E]/5 overflow-y-auto">
            {!data ? (
              <p className="px-4 py-8 text-center text-sm text-[#4B5563]">{t('Lade…', 'جارٍ التحميل…', 'Loading…')}</p>
            ) : data.items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[#4B5563]">
                <Inbox className="mx-auto mb-2 h-7 w-7 opacity-40" aria-hidden="true" />
                {t('Keine Benachrichtigungen', 'لا توجد إشعارات', 'No notifications')}
              </div>
            ) : (
              data.items.map((n) => (
                <NotificationRow
                  key={n.id}
                  n={n}
                  onOpen={(item) => {
                    setOpen(false)
                    openItem(item)
                  }}
                />
              ))
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-[#1A4D2E]/10 p-3">
            <button
              type="button"
              onClick={() => markAllAdminNotificationsRead()}
              disabled={total === 0}
              className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-[#F5F5F0] px-2 text-[12px] font-semibold text-[#1A4D2E] hover:bg-[#ECECE4] disabled:opacity-50"
            >
              <CheckCheck className="h-4 w-4" aria-hidden="true" />
              {t('Alle als gelesen markieren', 'تعليم الكل كمقروء', 'Mark all as read')}
            </button>
            <Link
              href="/admin/notifications"
              onClick={() => setOpen(false)}
              className="flex min-h-[44px] items-center justify-center rounded-xl bg-[#1A4D2E] px-2 text-center text-[12px] font-semibold text-[#FFFFFF] hover:bg-[#2D5A4C]"
            >
              {t('Alle Benachrichtigungen ansehen', 'عرض كل الإشعارات', 'View all notifications')}
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

export { useNotifications }
