'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { CalendarDays, Camera, Clock, DoorOpen, Lock, Mail, MapPin, Phone, Ruler, Send } from 'lucide-react'
import { callApi } from '@/lib/apiClient'
import { useLang } from '@/components/LanguageProvider'
import OrderSteps from '@/components/OrderSteps'

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

const STATUS_STYLE: Record<string, string> = {
  offer_pending: 'bg-[#F2E7E0] text-[#A65F33]',
  offer_sent: 'bg-[#EDE9FE] text-[#5B21B6]',
  offer_accepted: 'bg-[#DCFCE7] text-[#166534]',
  assigned: 'bg-[#DCFCE7] text-[#166534]',
  done: 'bg-[#F5F5F0] text-[#4B5563]',
}

export default function PartnerRequests({ locale }: { locale: string }) {
  const { t } = useLang()
  const [open, setOpen] = useState<PartnerRequest[]>([])
  const [mine, setMine] = useState<PartnerRequest[]>([])
  const [region, setRegion] = useState<{ postcode: string | null; city: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [selected, setSelected] = useState<PartnerRequest | null>(null)
  const [price, setPrice] = useState('')
  const [offerText, setOfferText] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')

  const load = useCallback(async () => {
    const res = await callApi<{
      open: PartnerRequest[]
      mine: PartnerRequest[]
      region?: { postcode: string | null; city: string | null }
    }>('partner', '/api/partner/requests')
    if (res.ok && res.data) {
      setOpen(res.data.open ?? [])
      setMine(res.data.mine ?? [])
      setRegion(res.data.region ?? null)
    } else if (res.status !== 401) {
      setNotice(t('Anfragen konnten nicht geladen werden.', 'تعذّر تحميل الطلبات.', 'Requests could not be loaded.'))
    }
    setLoading(false)
  }, [t])

  useEffect(() => {
    const init = async () => {
      await load()
    }
    init()
  }, [load])

  const statusLabel = (s: PartnerRequest['status']) =>
    ({
      offer_pending: t('Angebot gesendet', 'تم إرسال العرض', 'Offer sent'),
      offer_sent: t('Beim Kunden', 'لدى العميل', 'With customer'),
      offer_accepted: t('Bestätigt', 'مؤكَّد', 'Confirmed'),
      assigned: t('Bestätigt', 'مؤكَّد', 'Confirmed'),
      done: t('Erledigt', 'منجز', 'Done'),
      new: t('Neu', 'جديد', 'New'),
      offer_rejected: t('Neu', 'جديد', 'New'),
    })[s]

  const formatPrice = (v: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(v)
  const formatDate = (d: string | null) => {
    if (!d) return null
    const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T12:00:00` : d)
    return Number.isNaN(date.getTime()) ? d : date.toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
  }
  const when = (r: PartnerRequest) =>
    [formatDate(r.preferred_date), r.is_flexible ? t('flexibel', 'مرن', 'flexible') : r.preferred_time].filter(Boolean).join(' · ') || null
  const place = (r: PartnerRequest) => [r.postcode, r.city].filter(Boolean).join(' ')
  const hidden = t('*** wird nach Zusage angezeigt ***', '*** يظهر بعد موافقة العميل ***', '*** shown after the customer accepts ***')

  function openDetails(r: PartnerRequest) {
    setSelected(r)
    setPrice('')
    setOfferText('')
    setFormError('')
  }

  async function sendOffer(e: FormEvent) {
    e.preventDefault()
    if (!selected) return
    const value = Number(price.replace(',', '.'))
    if (!Number.isFinite(value) || value <= 0) {
      setFormError(t('Bitte einen gültigen Preis eingeben.', 'يرجى إدخال سعر صحيح.', 'Please enter a valid price.'))
      return
    }
    setBusy(true)
    setFormError('')
    const res = await callApi('partner', `/api/partner/requests/${selected.id}`, 'POST', { price: value, message: offerText })
    setBusy(false)
    if (!res.ok) {
      setFormError(
        res.status === 409
          ? t('Diese Anfrage ist nicht mehr verfügbar.', 'هذا الطلب لم يعد متاحاً.', 'This request is no longer available.')
          : t('Angebot konnte nicht gesendet werden.', 'تعذّر إرسال العرض.', 'The offer could not be sent.'),
      )
      await load()
      return
    }
    setSelected(null)
    setNotice(t('Angebot an KlarFix gesendet. Wir prüfen es und leiten es an den Kunden weiter.', 'تم إرسال العرض إلى KlarFix. سنراجعه ونرسله إلى العميل.', 'Offer sent to KlarFix. We review it and forward it to the customer.'))
    await load()
  }

  async function markDone(r: PartnerRequest) {
    setBusy(true)
    const res = await callApi('partner', `/api/partner/requests/${r.id}`, 'PATCH', { action: 'done' })
    setBusy(false)
    if (res.ok) {
      setSelected(null)
      setNotice(t('Auftrag als erledigt markiert.', 'تم تعليم الطلب كمنجز.', 'Job marked as done.'))
      await load()
    } else {
      setFormError(t('Status konnte nicht geändert werden.', 'تعذّر تغيير الحالة.', 'Status could not be changed.'))
    }
  }

  if (loading) return <p className="text-center text-primary/70">{t('Lade…', 'جارٍ التحميل…', 'Loading…')}</p>

  const card = (r: PartnerRequest, isMine: boolean) => (
    <button
      key={r.id}
      type="button"
      onClick={() => openDetails(r)}
      className="block w-full min-w-0 rounded-xl bg-card p-5 text-start shadow-sm ring-1 ring-transparent transition hover:ring-primary"
    >
      {isMine && <OrderSteps status={r.status} className="mb-4 border-b border-primary/10 pb-4" />}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="min-w-0 text-lg font-semibold">{r.service_type}</h3>
        {isMine && (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[r.status] ?? 'bg-primary/10'}`}>
            {statusLabel(r.status)}
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-primary/80">
        <span className="flex items-center gap-1.5">
          <MapPin className="h-4 w-4 shrink-0" /> {place(r)}
        </span>
        {r.area_sqm ? (
          <span className="flex items-center gap-1.5">
            <Ruler className="h-4 w-4 shrink-0" /> {r.area_sqm} m²
          </span>
        ) : null}
        {r.rooms ? (
          <span className="flex items-center gap-1.5">
            <DoorOpen className="h-4 w-4 shrink-0" /> {r.rooms} {t('Zimmer', 'غرف', 'rooms')}
          </span>
        ) : null}
        {r.photos.length > 0 ? (
          <span className="flex items-center gap-1.5">
            <Camera className="h-4 w-4 shrink-0" /> {r.photos.length}
          </span>
        ) : null}
        {when(r) && (
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 shrink-0" /> {when(r)}
          </span>
        )}
      </div>
      {isMine && r.offer && <p className="mt-2 text-sm font-semibold text-primary">{formatPrice(r.offer.price)}</p>}
      {/* The whole card is the button (opens the offer form / details), so these are styled spans, not nested buttons. */}
      {!isMine ? (
        <span className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-card">
          <Send className="h-4 w-4" /> {t('Angebot senden', 'إرسال العرض', 'Send offer')}
        </span>
      ) : r.status === 'offer_pending' ? (
        <span className="mt-4 inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary/70">
          <Clock className="h-4 w-4" /> {t('Warten auf Admin', 'بانتظار الإدارة', 'Waiting for admin')}
        </span>
      ) : r.status === 'offer_sent' ? (
        <span className="mt-4 inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary/70">
          <Clock className="h-4 w-4" /> {t('Warten auf Kunde', 'بانتظار العميل', 'Waiting for customer')}
        </span>
      ) : (
        <p className="mt-3 text-sm font-medium text-primary">{t('Details anzeigen →', 'عرض التفاصيل ←', 'View details →')}</p>
      )}
    </button>
  )

  const revealed = selected?.customer ?? null
  const regionText = region ? [region.postcode, region.city].filter(Boolean).join(' ') : ''

  return (
    <div className="space-y-8">
      {notice && <p className="rounded-lg bg-primary/5 p-3 text-sm text-primary">{notice}</p>}

      {mine.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">{t('Meine Aufträge', 'طلباتي', 'My jobs')}</h2>
          <div className="grid gap-4 sm:grid-cols-2">{mine.map((r) => card(r, true))}</div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold">
          {t('Neue Anfragen', 'طلبات جديدة', 'New requests')}
          {regionText && <span className="ms-2 text-sm font-normal text-primary/60">· {regionText}</span>}
        </h2>
        {open.length === 0 ? (
          <p className="rounded-xl bg-card p-8 text-center text-primary/70 shadow-sm">
            {regionText
              ? t(
                  `Keine neuen Anfragen in deiner Region (${regionText}).`,
                  `لا توجد طلبات جديدة في منطقتك (${regionText}).`,
                  `No new requests in your region (${regionText}).`,
                )
              : t(
                  'Keine neuen Anfragen. Bitte hinterlegen Sie PLZ und Ort in Ihrem Profil, damit wir Ihnen Anfragen aus Ihrer Region zeigen können.',
                  'لا توجد طلبات جديدة. يرجى إضافة الرمز البريدي والمدينة إلى ملفك لنعرض لك طلبات منطقتك.',
                  'No new requests. Please add your postcode and city to your profile so we can show requests from your region.',
                )}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">{open.map((r) => card(r, false))}</div>
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
                <p className="text-sm text-primary/70">{new Date(selected.created_at).toLocaleString(locale)}</p>
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
              <Field label={t('PLZ / Ort', 'الرمز البريدي / المدينة', 'Postcode / city')} value={place(selected)} />
              <Field label={t('Fläche', 'المساحة', 'Area')} value={selected.area_sqm ? `${selected.area_sqm} m²` : '–'} />
              <Field label={t('Zimmer', 'الغرف', 'Rooms')} value={selected.rooms ?? '–'} />
              <Field label={t('Wunschtermin', 'الموعد المطلوب', 'Preferred date')} value={formatDate(selected.preferred_date) ?? '–'} />
              <Field
                label={t('Uhrzeit', 'الوقت', 'Time')}
                value={selected.is_flexible ? t('flexibel', 'مرن', 'flexible') : (selected.preferred_time ?? '–')}
              />
              <Field label={t('Kunde', 'العميل', 'Customer')} value={revealed?.name ?? hidden} locked={!revealed} wide />
              <Field label={t('Adresse', 'العنوان', 'Address')} value={revealed?.address ?? hidden} locked={!revealed} wide />
              {revealed && (
                <>
                  <Field label={t('E-Mail', 'البريد الإلكتروني', 'Email')} value={revealed.email} />
                  <Field label={t('Telefon', 'الهاتف', 'Phone')} value={revealed.phone ?? '–'} />
                </>
              )}
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

            {selected.offer && (
              <div className="mt-5 rounded-xl bg-primary/5 p-4 text-sm">
                <p className="font-semibold">
                  {t('Ihr Angebot', 'عرضك', 'Your offer')}: {formatPrice(selected.offer.price)}
                </p>
                {selected.offer.message && <p className="mt-1 whitespace-pre-line text-primary/80">{selected.offer.message}</p>}
                {selected.status === 'offer_pending' && (
                  <p className="mt-2 flex items-center gap-1.5 text-primary/70">
                    <Clock className="h-4 w-4" />
                    {t('Warten auf Admin. KlarFix prüft Ihr Angebot und leitet es an den Kunden weiter.', 'بانتظار الإدارة. تراجع KlarFix عرضك وترسله إلى العميل.', 'Waiting for admin. KlarFix reviews your offer and forwards it to the customer.')}
                  </p>
                )}
                {selected.status === 'offer_sent' && (
                  <p className="mt-2 flex items-center gap-1.5 text-primary/70">
                    <Clock className="h-4 w-4" />
                    {t('Warten auf Antwort des Kunden.', 'بانتظار رد العميل.', 'Waiting for the customer’s answer.')}
                  </p>
                )}
              </div>
            )}

            {formError && (
              <p role="alert" className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                {formError}
              </p>
            )}

            {(selected.status === 'new' || selected.status === 'offer_rejected') && !selected.offer && (
              <form onSubmit={sendOffer} className="mt-5 space-y-3 border-t border-primary/10 pt-5">
                <label className="block text-sm font-medium">
                  {t('Preis in €', 'السعر باليورو', 'Price in €')} *
                  <input
                    type="number"
                    inputMode="decimal"
                    min="1"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="120"
                    className="mt-1 min-h-[44px] w-full rounded-lg border border-primary/20 bg-[#FFFFFF] px-3 py-2"
                  />
                </label>
                <label className="block text-sm font-medium">
                  {t('Nachricht an Kunde (optional)', 'رسالة إلى العميل (اختياري)', 'Message to customer (optional)')}
                  <textarea
                    value={offerText}
                    onChange={(e) => setOfferText(e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder={t('z.B. 2 Stunden, inkl. Reinigungsmittel, 2 Personen', 'مثال: ساعتان، شامل مواد التنظيف، شخصان', 'e.g. 2 hours, incl. cleaning supplies, 2 people')}
                    className="mt-1 w-full rounded-lg border border-primary/20 bg-[#FFFFFF] px-3 py-2"
                  />
                </label>
                <p className="flex items-start gap-1.5 text-xs text-primary/70">
                  <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {t(
                    'Name, Kontaktdaten und Adresse des Kunden sehen Sie, sobald der Kunde Ihr Angebot annimmt.',
                    'ستظهر لك بيانات العميل وعنوانه بعد أن يقبل عرضك.',
                    'You will see the customer’s name, contact details and address once they accept your offer.',
                  )}
                </p>
                <button
                  type="submit"
                  disabled={busy}
                  className="min-h-[44px] w-full rounded-lg bg-primary px-5 py-2 font-medium text-card hover:bg-primary-hover disabled:opacity-50"
                >
                  {busy ? t('Wird gesendet…', 'جارٍ الإرسال…', 'Sending…') : t('Angebot senden', 'إرسال العرض', 'Send offer')}
                </button>
              </form>
            )}

            {revealed && selected.status !== 'done' && (
              <div className="mt-5 flex flex-wrap gap-3 border-t border-primary/10 pt-5">
                <a
                  href={revealed.phone ? `tel:${revealed.phone.replace(/[^\d+]/g, '')}` : `mailto:${revealed.email}`}
                  className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 font-medium text-card hover:bg-primary-hover"
                >
                  {revealed.phone ? <Phone className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                  {t('Kunden kontaktieren', 'التواصل مع العميل', 'Contact customer')}
                </a>
                {revealed.phone && (
                  <a
                    href={`mailto:${revealed.email}`}
                    className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-primary/30 px-4 font-medium text-primary hover:bg-primary/5"
                  >
                    <Mail className="h-4 w-4" /> E-Mail
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => markDone(selected)}
                  disabled={busy}
                  className="min-h-[44px] w-full rounded-lg border border-primary/30 px-4 font-medium text-primary hover:bg-primary/5 disabled:opacity-50"
                >
                  {t('Als erledigt markieren', 'تعليم كمنجز', 'Mark as done')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, locked, wide }: { label: string; value: string; locked?: boolean; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <dt className="text-primary/70">{label}</dt>
      <dd className={`whitespace-pre-line break-words font-medium ${locked ? 'flex items-center gap-1.5 text-primary/50' : ''}`}>
        {locked && <Lock className="h-3.5 w-3.5 shrink-0" />}
        {value}
      </dd>
    </div>
  )
}
