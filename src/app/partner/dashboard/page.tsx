'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useLang } from '@/components/LanguageProvider'

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

  const loadRequests = useCallback(async () => {
    const { data, error } = await supabase
      .from('requests')
      .select('id, customer_name, customer_email, customer_phone, postcode, service_type, area_sqm, message, status, created_at')
      .eq('status', 'new')
      .order('created_at', { ascending: false })

    if (error) {
      setMessage('loadError')
      return
    }
    setRequests((data as Request[]) ?? [])
  }, [])

  const checkAccess = useCallback(
    async (p: Partner) => {
      setLoading(true)
      const res = await fetch('/api/partner/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id }),
      })
      const isVerified = res.ok && ((await res.json()) as { verified: boolean }).verified === true
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
      await checkAccess(storedPartner)
    }
    init()
  }, [router, checkAccess])

  async function acceptRequest(requestId: string) {
    if (!partner || !verified) return
    setBusyId(requestId)
    setMessage('')

    const { data, error } = await supabase
      .from('requests')
      .update({ partner_id: partner.id, status: 'assigned' })
      .eq('id', requestId)
      .eq('status', 'new')
      .select('id')

    setBusyId(null)
    if (error || !data || data.length === 0) {
      setMessage('acceptError')
      await loadRequests()
      return
    }
    setMessage('accepted')
    await loadRequests()
  }

  function logout() {
    localStorage.removeItem('partner')
    router.push('/partner/login')
  }

  if (loading) {
    return <main className="p-8 text-center text-primary/70">{t('Lade…', 'جارٍ التحميل…', 'Loading…')}</main>
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">{t('Partner-Dashboard', 'لوحة الشركاء', 'Partner dashboard')}</h1>
          <p className="text-sm text-primary/80">
            {t('Angemeldet als', 'مسجل الدخول باسم', 'Signed in as')} {partner?.company_name}
          </p>
        </div>
        <button onClick={logout} className="text-sm text-primary/80 underline hover:text-primary-hover">
          {t('Abmelden', 'تسجيل الخروج', 'Sign out')}
        </button>
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
            onClick={() => partner && checkAccess(partner)}
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
    </main>
  )
}
