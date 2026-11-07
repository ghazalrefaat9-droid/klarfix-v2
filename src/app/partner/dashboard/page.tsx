'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle } from 'lucide-react'
import { callApi, logout as logoutSession } from '@/lib/apiClient'
import { useLang } from '@/components/LanguageProvider'
import ChatBox from '@/components/ChatBox'

type Partner = { id: string; company_name: string; email: string }

type Request = {
  id: string
  customer_name: string | null
  customer_email: string
  customer_phone: string | null
  postcode: string
  service_type: string
  area_sqm: number | null
  message: string | null
  status: string
  created_at: string
}

export default function PartnerDashboardPage() {
  const router = useRouter()
  const { t, lang } = useLang()
  const locale = lang === 'en' ? 'en-GB' : lang === 'ar' ? 'ar-DE' : 'de-DE'
  const [partner, setPartner] = useState<Partner | null>(null)
  const [verified, setVerified] = useState(false)
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState<'' | 'loadError' | 'acceptError' | 'accepted'>('')
  const [selected, setSelected] = useState<Request | null>(null)
  const [unread, setUnread] = useState(0)
  const [chatOpen, setChatOpen] = useState(false)

  const loadRequests = useCallback(async () => {
    const res = await callApi<{ requests: Request[] }>('partner', '/api/partner/requests')
    if (!res.ok) {
      setMessage('loadError')
      return
    }
    setRequests(res.data?.requests ?? [])
  }, [])

  const checkAccess = useCallback(
    async () => {
      setLoading(true)
      const res = await callApi<{ verified: boolean; unreadMessages?: number }>('partner', '/api/partner/status', 'POST')
      const isVerified = res.ok && res.data?.verified === true
      setUnread(res.data?.unreadMessages ?? 0)
      setVerified(isVerified)
      if (isVerified) {
        await loadRequests()
      } else {
        setRequests([])
      }
      setLoading(false)
    },
    [loadRequests],
  )

  useEffect(() => {
    const init = async () => {
      const stored = localStorage.getItem('partner')
      if (!stored) {
        router.replace('/partner/login')
        return
      }
      const storedPartner = JSON.parse(stored) as Partner
      setPartner(storedPartner)
      await checkAccess()
    }
    init()
  }, [router, checkAccess])

  // Refresh the unread-messages badge in the background (without the loading screen).
  useEffect(() => {
    if (!verified) return
    const timer = setInterval(async () => {
      if (document.visibilityState !== 'visible') return
      const res = await callApi<{ unreadMessages?: number }>('partner', '/api/partner/status', 'POST')
      if (res.ok) setUnread(res.data?.unreadMessages ?? 0)
    }, 30000)
    return () => clearInterval(timer)
  }, [verified])

  async function acceptRequest(requestId: string) {
    if (!partner || !verified) return
    setBusyId(requestId)
    setMessage('')

    const res = await callApi('partner', `/api/partner/requests/${requestId}`, 'POST')

    setBusyId(null)
    if (!res.ok) {
      setMessage('acceptError')
      await loadRequests()
      return
    }
    setMessage('accepted')
    await loadRequests()
  }

  function logout() {
    void logoutSession('partner')
  }

  if (loading) {
    return <main className="p-8 text-center text-primary/70">{t('Lade…', 'جارٍ التحميل…', 'Loading…')}</main>
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">{t('Partner-Dashboard', 'لوحة الشركاء', 'Partner dashboard')}</h1>
          <p className="text-sm text-primary/80">
            {t('Angemeldet als', 'مسجل الدخول باسم', 'Signed in as')} {partner?.company_name}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {verified && (
            <button
              type="button"
              onClick={() => setChatOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-card hover:bg-primary-hover"
            >
              <MessageCircle className="h-4 w-4" />
              {t('Nachrichten', 'الرسائل', 'Messages')}
              {unread > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[11px] font-bold text-[#FFFFFF]">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </button>
          )}
          <button onClick={logout} className="text-sm text-primary/80 underline hover:text-primary-hover">
            {t('Abmelden', 'تسجيل الخروج', 'Sign out')}
          </button>
        </div>
      </div>

      {message && (
        <p className="mb-4 rounded-lg bg-primary/5 p-3 text-sm text-primary">
          {message === 'loadError'
            ? t('Anfragen konnten nicht geladen werden.', 'تعذّر تحميل الطلبات.', 'Requests could not be loaded.')
            : message === 'acceptError'
              ? t(
                  'Auftrag konnte nicht angenommen werden (evtl. bereits vergeben).',
                  'تعذّر قبول الطلب (ربما تم إسناده لشريك آخر).',
                  'The job could not be accepted (it may already be taken).',
                )
              : t('Auftrag angenommen!', 'تم قبول الطلب!', 'Job accepted!')}
        </p>
      )}

      {!verified ? (
        <div className="rounded-xl bg-card p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-primary">
            {t('Ihr Konto wird noch geprüft', 'حسابك قيد المراجعة', 'Your account is being reviewed')}
          </h2>
          <p className="mt-2 text-primary/80">
            {t(
              'Aufträge und Kundendaten sind erst sichtbar, wenn Ihr Partner-Profil von uns freigeschaltet wurde.',
              'لن تظهر الطلبات وبيانات العملاء إلا بعد تفعيل ملفك كشريك من قبلنا.',
              'Orders and customer data become visible once we have approved your partner profile.',
            )}
          </p>
          <button
            onClick={() => checkAccess()}
            className="mt-6 rounded-lg border border-primary px-5 py-2 font-medium text-primary hover:bg-primary/5"
          >
            {t('Status neu prüfen', 'إعادة التحقق من الحالة', 'Check status again')}
          </button>
        </div>
      ) : requests.length === 0 ? (
        <p className="rounded-xl bg-card p-8 text-center text-primary/70 shadow-sm">
          {t('Keine neuen Anfragen.', 'لا توجد طلبات جديدة.', 'No new requests.')}
        </p>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelected(r)}
              className="block w-full rounded-xl bg-card p-6 text-start shadow-sm ring-1 ring-transparent transition hover:ring-primary"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">{r.service_type}</h2>
                <span className="text-sm text-primary/70">{new Date(r.created_at).toLocaleDateString(locale)}</span>
              </div>
              <p className="mt-1 text-sm text-primary/80">
                {t('PLZ', 'الرمز البريدي', 'Postcode')}: {r.postcode}
                {r.area_sqm ? ` · ${r.area_sqm} m²` : ''}
              </p>
              <p className="mt-3 text-sm font-medium text-primary">
                {t('Details anzeigen →', 'عرض التفاصيل ←', 'View details →')}
              </p>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-primary/50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">{selected.service_type}</h2>
                <p className="text-sm text-primary/70">
                  {new Date(selected.created_at).toLocaleString(locale)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label={t('Schließen', 'إغلاق', 'Close')}
                className="rounded-lg px-2 py-1 text-2xl leading-none text-primary/70 hover:bg-primary/5"
              >
                ×
              </button>
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-primary/70">{t('Kunde', 'العميل', 'Customer')}</dt>
                <dd className="font-medium">{selected.customer_name || '–'}</dd>
              </div>
              <div>
                <dt className="text-primary/70">{t('E-Mail', 'البريد الإلكتروني', 'Email')}</dt>
                <dd className="break-all font-medium">{selected.customer_email}</dd>
              </div>
              <div>
                <dt className="text-primary/70">{t('Telefon', 'الهاتف', 'Phone')}</dt>
                <dd className="font-medium">{selected.customer_phone || '–'}</dd>
              </div>
              <div>
                <dt className="text-primary/70">{t('PLZ', 'الرمز البريدي', 'Postcode')}</dt>
                <dd className="font-medium">{selected.postcode}</dd>
              </div>
              <div>
                <dt className="text-primary/70">{t('Fläche', 'المساحة', 'Area')}</dt>
                <dd className="font-medium">{selected.area_sqm ? `${selected.area_sqm} m²` : '–'}</dd>
              </div>
              <div>
                <dt className="text-primary/70">{t('Status', 'الحالة', 'Status')}</dt>
                <dd className="font-medium">{selected.status}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-primary/70">{t('Nachricht', 'رسالة', 'Message')}</dt>
                <dd className="whitespace-pre-line font-medium">{selected.message || '–'}</dd>
              </div>
            </dl>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg border border-primary/20 px-4 py-2 font-medium text-primary hover:bg-primary/5"
              >
                {t('Schließen', 'إغلاق', 'Close')}
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = selected.id
                  await acceptRequest(id)
                  setSelected(null)
                }}
                disabled={busyId === selected.id}
                className="rounded-lg bg-primary px-5 py-2 font-medium text-card hover:bg-primary-hover disabled:opacity-50"
              >
                {busyId === selected.id
                  ? t('Wird angenommen…', 'جارٍ القبول…', 'Accepting…')
                  : t('Auftrag annehmen', 'قبول الطلب', 'Accept request')}
              </button>
            </div>
          </div>
        </div>
      )}

      {chatOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-primary/50 sm:items-center sm:p-4"
          onClick={() => {
            setChatOpen(false)
            setUnread(0)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg rounded-t-2xl bg-card p-5 shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold">{t('Nachrichten mit KlarFix', 'الرسائل مع KlarFix', 'Messages with KlarFix')}</h2>
              <button
                type="button"
                onClick={() => {
                  setChatOpen(false)
                  setUnread(0)
                }}
                aria-label={t('Schließen', 'إغلاق', 'Close')}
                className="rounded-lg px-2 py-1 text-2xl leading-none text-primary/70 hover:bg-primary/5"
              >
                ×
              </button>
            </div>
            <ChatBox
              me="partner"
              endpoint="/api/partner/messages"
              locale={locale}
              labels={{
                placeholder: t('Nachricht schreiben…', 'اكتب رسالة…', 'Write a message…'),
                send: t('Senden', 'إرسال', 'Send'),
                empty: t(
                  'Noch keine Nachrichten. Schreiben Sie uns!',
                  'لا توجد رسائل بعد. راسلنا!',
                  'No messages yet. Write to us!',
                ),
                loadError: t('Nachrichten konnten nicht geladen werden.', 'تعذّر تحميل الرسائل.', 'Messages could not be loaded.'),
                sendError: t('Nachricht konnte nicht gesendet werden.', 'تعذّر إرسال الرسالة.', 'Message could not be sent.'),
                otherName: 'KlarFix',
              }}
            />
          </div>
        </div>
      )}
    </main>
  )
}
