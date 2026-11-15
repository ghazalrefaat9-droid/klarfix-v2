'use client'

import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, MapPin, User } from 'lucide-react'
import { callApi } from '@/lib/apiClient'
import { useLang } from '@/components/LanguageProvider'

// Mirrors PartnerRequestView in src/lib/requests.ts. `customer` is only sent by the API after the customer accepted.
type PartnerRequest = {
  id: string
  service_type: string
  area_sqm: number | null
  rooms: string | null
  photos: string[]
  postcode: string
  city: string | null
  preferred_date: string | null
  preferred_time: string | null
  is_flexible: boolean
  note: string | null
  status: 'new' | 'offer_pending' | 'assigned' | 'offer_sent' | 'offer_accepted' | 'offer_rejected' | 'done'
  created_at: string
  offer: { price: number; message: string | null; sent_at: string | null } | null
  customer: { name: string | null; email: string; phone: string | null; address: string | null } | null
}

const DONE_BADGE = 'rounded-full bg-[#F5F5F0] px-2.5 py-0.5 text-[11px] font-semibold text-[#4B5563]'

const parseDate = (d: string) => new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T12:00:00` : d)
// Job date = agreed service date, falling back to when the request came in.
const jobDate = (r: PartnerRequest) => r.preferred_date ?? r.created_at

// Partner dashboard: only this partner's own completed jobs (the API filters by the session's partner_id).
export default function PartnerRequests({ locale }: { locale: string }) {
  const { t } = useLang()
  const [completed, setCompleted] = useState<PartnerRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [selected, setSelected] = useState<PartnerRequest | null>(null)

  const load = useCallback(async () => {
    const res = await callApi<{ mine: PartnerRequest[] }>('partner', '/api/partner/requests')
    if (res.ok && res.data) {
      const done = (res.data.mine ?? []).filter((r) => r.status === 'done')
      done.sort((a, b) => (parseDate(jobDate(b)).getTime() || 0) - (parseDate(jobDate(a)).getTime() || 0))
      setCompleted(done)
    } else if (res.status !== 401) {
      setNotice(t('Aufträge konnten nicht geladen werden.', 'تعذّر تحميل الطلبات.', 'Jobs could not be loaded.'))
    }
    setLoading(false)
  }, [t])

  useEffect(() => {
    const init = async () => {
      await load()
    }
    init()
  }, [load])

  if (loading) return <p className="text-center text-primary/70">{t('Lade…', 'جارٍ التحميل…', 'Loading…')}</p>

  const formatPrice = (v: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(v)
  const shortDate = (r: PartnerRequest) => {
    const d = jobDate(r)
    const date = parseDate(d)
    return Number.isNaN(date.getTime()) ? d : date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
  }
  const place = (r: PartnerRequest) => [r.postcode, r.city].filter(Boolean).join(' ')
  const customerName = (r: PartnerRequest) => r.customer?.name ?? '–'
  const address = (r: PartnerRequest) => r.customer?.address ?? (place(r) || '–')
  const amount = (r: PartnerRequest) => (r.offer ? formatPrice(r.offer.price) : '–')
  const doneLabel = t('Erledigt', 'منجز', 'Done')

  const L = {
    date: t('Datum', 'التاريخ', 'Date'),
    customer: t('Kunde', 'العميل', 'Customer'),
    address: t('Adresse', 'العنوان', 'Address'),
    job: t('Auftrag', 'الطلب', 'Job'),
    amount: t('Betrag', 'المبلغ', 'Amount'),
    status: t('Status', 'الحالة', 'Status'),
  }

  return (
    <div className="space-y-4">
      {notice && <p className="rounded-lg bg-primary/5 p-3 text-sm text-primary">{notice}</p>}

      <section>
        <h2 className="mb-3 text-lg font-bold">{t('Abgeschlossene Aufträge', 'الطلبات المنجزة', 'Completed jobs')}</h2>

        {completed.length === 0 ? (
          <p className="rounded-xl bg-card p-8 text-center text-primary/70 shadow-sm">
            {t('Noch keine abgeschlossenen Aufträge.', 'لا توجد طلبات منجزة بعد.', 'No completed jobs yet.')}
          </p>
        ) : (
          <>
            {/* Mobile: stacked cards, nothing is cut off. */}
            <ul className="space-y-3 md:hidden">
              {completed.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(r)}
                    className="block w-full min-w-0 rounded-xl bg-card p-4 text-start shadow-sm ring-1 ring-transparent transition hover:ring-primary"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 break-words font-semibold text-primary">{r.service_type}</p>
                      <span className={`shrink-0 ${DONE_BADGE}`}>{doneLabel}</span>
                    </div>
                    <dl className="mt-3 space-y-1.5 text-sm text-primary/80">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
                        <dt className="sr-only">{L.date}</dt>
                        <dd>{shortDate(r)}</dd>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 shrink-0" aria-hidden />
                        <dt className="sr-only">{L.customer}</dt>
                        <dd className="min-w-0 break-words font-medium text-primary">{customerName(r)}</dd>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                        <dt className="sr-only">{L.address}</dt>
                        <dd className="min-w-0 break-words">{address(r)}</dd>
                      </div>
                    </dl>
                    <div className="mt-3 flex items-center justify-between border-t border-primary/10 pt-3 text-sm">
                      <span className="text-primary/70">{L.amount}</span>
                      <span className="font-semibold text-primary">{amount(r)}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>

            {/* Desktop: table */}
            <div className="hidden overflow-hidden rounded-xl bg-card shadow-sm md:block">
              <table className="w-full table-fixed text-sm">
                <thead className="border-b border-primary/10 bg-primary/5 text-[12px] font-semibold uppercase tracking-wide text-primary/70">
                  <tr>
                    <th className="w-[14%] px-4 py-3 text-start">{L.date}</th>
                    <th className="w-[18%] px-4 py-3 text-start">{L.customer}</th>
                    <th className="w-[28%] px-4 py-3 text-start">{L.address}</th>
                    <th className="w-[16%] px-4 py-3 text-start">{L.job}</th>
                    <th className="w-[12%] px-4 py-3 text-end">{L.amount}</th>
                    <th className="w-[12%] px-4 py-3 text-start">{L.status}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/5 text-primary">
                  {completed.map((r) => (
                    <tr key={r.id} onClick={() => setSelected(r)} className="cursor-pointer align-top hover:bg-primary/5">
                      <td className="whitespace-nowrap px-4 py-3">{shortDate(r)}</td>
                      <td className="break-words px-4 py-3 font-medium">{customerName(r)}</td>
                      <td className="break-words px-4 py-3">{address(r)}</td>
                      <td className="break-words px-4 py-3">{r.service_type}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-end font-semibold">{amount(r)}</td>
                      <td className="px-4 py-3">
                        <span className={DONE_BADGE}>{doneLabel}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-primary/50 sm:items-center sm:p-4" onClick={() => setSelected(null)}>
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-card p-6 shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="break-words text-xl font-bold">{selected.service_type}</h2>
                <p className="text-sm text-primary/70">{shortDate(selected)}</p>
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
              <Field label={L.customer} value={customerName(selected)} wide />
              <Field label={L.address} value={address(selected)} wide />
              {selected.customer && (
                <>
                  <Field label={t('E-Mail', 'البريد الإلكتروني', 'Email')} value={selected.customer.email} />
                  <Field label={t('Telefon', 'الهاتف', 'Phone')} value={selected.customer.phone ?? '–'} />
                </>
              )}
              <Field label={t('Fläche', 'المساحة', 'Area')} value={selected.area_sqm ? `${selected.area_sqm} m²` : '–'} />
              <Field label={t('Zimmer', 'الغرف', 'Rooms')} value={selected.rooms ?? '–'} />
              <Field label={L.amount} value={amount(selected)} />
              <Field label={L.status} value={doneLabel} />
              <Field label={t('Nachricht', 'رسالة', 'Message')} value={selected.note ?? '–'} wide />
            </dl>

            {selected.photos.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary/60">
                  {t('Fotos', 'الصور', 'Photos')} ({selected.photos.length})
                </p>
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {selected.photos.map((url, i) => (
                    <li key={url}>
                      <a href={url} target="_blank" rel="noopener noreferrer" className="block aspect-square overflow-hidden rounded-lg ring-1 ring-primary/10 hover:ring-primary">
                        {/* eslint-disable-next-line @next/next/no-img-element -- signed private storage URL */}
                        <img src={url} alt={t(`Foto ${i + 1}`, `صورة ${i + 1}`, `Photo ${i + 1}`)} loading="lazy" className="h-full w-full object-cover" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <dt className="text-primary/70">{label}</dt>
      <dd className="whitespace-pre-line break-words font-medium">{value}</dd>
    </div>
  )
}
