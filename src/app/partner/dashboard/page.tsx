'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle } from 'lucide-react'
import { callApi, logout as logoutSession } from '@/lib/apiClient'
import { useLang } from '@/components/LanguageProvider'
import ChatBox from '@/components/ChatBox'
import { BackButton, LogoutButton } from '@/components/DashboardNav'
import PartnerRequests from '@/components/partner/PartnerRequests'
import PartnerHome from '@/components/partner/PartnerHome'
import PartnerMedia from '@/components/partner/PartnerMedia'
import { isPartnerView, type PartnerCounts, type PartnerView } from '@/lib/partnerViews'
import WelcomeSplash, { WELCOME_FLAG } from '@/components/partner/WelcomeSplash'

type Partner = { id: string; company_name: string; email: string }

export default function PartnerDashboardPage() {
  const router = useRouter()
  const { t, lang } = useLang()
  const locale = lang === 'en' ? 'en-GB' : lang === 'ar' ? 'ar-DE' : 'de-DE'
  const [partner, setPartner] = useState<Partner | null>(null)
  const [verified, setVerified] = useState(false)
  const [loading, setLoading] = useState(true)
  const [unread, setUnread] = useState(0)
  const [chatOpen, setChatOpen] = useState(false)
  const [welcome, setWelcome] = useState(false)
  const hideWelcome = useCallback(() => setWelcome(false), [])
  const [view, setView] = useState<PartnerView>('start')
  const [counts, setCounts] = useState<PartnerCounts | null>(null)

  // ?tab=… is read from window.location (not useSearchParams) so the page needs no Suspense boundary.
  function selectView(next: PartnerView) {
    setView(next)
    if (next === 'nachrichten') setUnread(0)
    router.replace(`/partner/dashboard?tab=${next}`, { scroll: false })
    window.scrollTo({ top: 0 })
  }

  const checkAccess = useCallback(async () => {
    setLoading(true)
    const res = await callApi<{ verified: boolean; unreadMessages?: number }>('partner', '/api/partner/status', 'POST')
    setUnread(res.data?.unreadMessages ?? 0)
    setVerified(res.ok && res.data?.verified === true)
    setLoading(false)
  }, [])

  useEffect(() => {
    const init = async () => {
      const stored = localStorage.getItem('partner')
      if (!stored) {
        router.replace('/partner/login')
        return
      }
      const storedPartner = JSON.parse(stored) as Partner
      setPartner(storedPartner)
      const tab = new URLSearchParams(window.location.search).get('tab')
      if (isPartnerView(tab)) setView(tab)
      // Only right after login (flag from /partner/login), not on every reload.
      if (sessionStorage.getItem(WELCOME_FLAG)) {
        sessionStorage.removeItem(WELCOME_FLAG)
        setWelcome(true)
      }
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

  function logout() {
    void logoutSession('partner', '/')
  }

  // Unverified partners only ever see the "account is being reviewed" start page.
  const page: PartnerView = verified ? view : 'start'

  const splash = welcome && partner ? <WelcomeSplash name={partner.company_name} onDone={hideWelcome} /> : null

  const chatLabels = {
    placeholder: t('Nachricht schreiben…', 'اكتب رسالة…', 'Write a message…'),
    send: t('Senden', 'إرسال', 'Send'),
    empty: t('Noch keine Nachrichten. Schreiben Sie uns!', 'لا توجد رسائل بعد. راسلنا!', 'No messages yet. Write to us!'),
    loadError: t('Nachrichten konnten nicht geladen werden.', 'تعذّر تحميل الرسائل.', 'Messages could not be loaded.'),
    sendError: t('Nachricht konnte nicht gesendet werden.', 'تعذّر إرسال الرسالة.', 'Message could not be sent.'),
    otherName: 'KlarFix',
  }

  if (loading) {
    return (
      <>
        {splash}
        <main className="p-8 text-center text-primary/70">{t('Lade…', 'جارٍ التحميل…', 'Loading…')}</main>
      </>
    )
  }

  return (
    <>
    {splash}
    <main className="mx-auto max-w-4xl overflow-x-hidden px-4 py-6 sm:py-10">
      <BackButton onClick={() => (page === 'start' ? router.push('/') : selectView('start'))} />
      <div className="mb-6 min-w-0">
        <h1 className="break-words text-2xl font-bold text-primary">{t('Partner-Dashboard', 'لوحة الشركاء', 'Partner dashboard')}</h1>
        <p className="break-words text-sm text-primary/80">
          {t('Angemeldet als', 'مسجل الدخول باسم', 'Signed in as')} {partner?.company_name}
        </p>
      </div>

      {page === 'start' && (
        <div className="mb-6 flex gap-3">
          {verified && (
            <button
              type="button"
              onClick={() => setChatOpen(true)}
              className="flex min-h-[44px] min-w-0 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-card hover:bg-primary-hover"
            >
              <MessageCircle className="h-4 w-4 shrink-0" />
              {t('Nachrichten', 'الرسائل', 'Messages')}
              {unread > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[11px] font-bold text-[#FFFFFF]">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </button>
          )}
          <LogoutButton onConfirm={logout} />
        </div>
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
      ) : (
          <div className="min-w-0">
            <PartnerRequests locale={locale} view={view} onCounts={setCounts} />
            {view === 'start' && <PartnerHome counts={counts} unread={unread} onSelect={selectView} />}
            {view === 'video' && <PartnerMedia />}
            {view === 'nachrichten' && (
              <section>
                <h2 className="mb-3 text-lg font-bold">{t('Nachrichten mit KlarFix', 'الرسائل مع KlarFix', 'Messages with KlarFix')}</h2>
                <div className="rounded-xl bg-card p-5 shadow-sm">
                  <ChatBox me="partner" endpoint="/api/partner/messages" locale={locale} labels={chatLabels} />
                </div>
              </section>
            )}
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
              labels={chatLabels}
            />
          </div>
        </div>
      )}
    </main>
    </>
  )
}
