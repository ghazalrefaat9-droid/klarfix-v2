'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, ShieldCheck, Star, XCircle } from 'lucide-react'
import { useLang } from '@/components/LanguageProvider'

type Offer = {
  status: string
  service_type: string
  area_sqm: number | null
  postcode: string
  city: string | null
  preferred_date: string | null
  preferred_time: string | null
  price: number
  message: string | null
  partner: {
    verified: boolean
    experience_years: number | null
    team_size: string | null
    member_since: string | null
    rating: number | null
    review_count: number
    company_name: string | null
  }
}

export default function OfferView() {
  const { token } = useParams<{ token: string }>()
  const { t, lang } = useLang()
  const locale = lang === 'en' ? 'en-GB' : lang === 'ar' ? 'ar-DE' : 'de-DE'
  const [offer, setOffer] = useState<Offer | null>(null)
  const [loading, setLoading] = useState(true)
  const [invalid, setInvalid] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<'accepted' | 'rejected' | null>(null)
  const [confirmReject, setConfirmReject] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/offers/${encodeURIComponent(token)}`, { cache: 'no-store' }).catch(() => null)
    if (!res?.ok) {
      setInvalid(true)
    } else {
      setOffer((await res.json()) as Offer)
    }
    setLoading(false)
  }, [token])

  useEffect(() => {
    const init = async () => {
      await load()
    }
    init()
  }, [load])

  async function decide(action: 'accept' | 'reject') {
    setBusy(true)
    setError('')
    const res = await fetch(`/api/offers/${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    }).catch(() => null)
    const data = (await res?.json().catch(() => null)) as { company_name?: string | null } | null
    setBusy(false)
    if (!res?.ok) {
      setError(
        res?.status === 409
          ? t('Über dieses Angebot wurde bereits entschieden.', 'تم اتخاذ قرار بشأن هذا العرض مسبقاً.', 'This offer has already been decided.')
          : t('Das hat leider nicht geklappt. Bitte erneut versuchen.', 'حدث خطأ. يرجى المحاولة مرة أخرى.', 'Something went wrong. Please try again.'),
      )
      return
    }
    setResult(action === 'accept' ? 'accepted' : 'rejected')
    if (action === 'accept' && offer) setOffer({ ...offer, status: 'offer_accepted', partner: { ...offer.partner, company_name: data?.company_name ?? null } })
  }

  const formatPrice = (v: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(v)
  const formatDate = (d: string | null) => {
    if (!d) return null
    const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T12:00:00` : d)
    return Number.isNaN(date.getTime()) ? d : date.toLocaleDateString(locale, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  }

  if (loading) return <main className="p-8 text-center text-primary/70">{t('Lade…', 'جارٍ التحميل…', 'Loading…')}</main>

  if (invalid || !offer) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <XCircle className="mx-auto h-12 w-12 text-primary/40" />
        <h1 className="mt-4 text-2xl font-bold">{t('Angebot nicht mehr gültig', 'العرض لم يعد صالحاً', 'Offer no longer valid')}</h1>
        <p className="mt-2 text-primary/75">
          {t(
            'Dieser Link ist abgelaufen oder das Angebot wurde bereits beantwortet.',
            'انتهت صلاحية هذا الرابط أو تم الرد على العرض مسبقاً.',
            'This link has expired or the offer has already been answered.',
          )}
        </p>
        <Link href="/" className="mt-6 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-card hover:bg-primary-hover">
          {t('Zur Startseite', 'إلى الصفحة الرئيسية', 'Go to homepage')}
        </Link>
      </main>
    )
  }

  const accepted = offer.status === 'offer_accepted' || offer.status === 'done'
  const p = offer.partner

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <p className="text-sm font-medium uppercase tracking-wide text-primary/60">{t('Ihr Angebot', 'عرضك', 'Your offer')}</p>
      <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{offer.service_type}</h1>

      <section className="mt-6 rounded-2xl bg-card p-6 shadow-sm">
        <p className="text-sm text-primary/70">{t('Preis', 'السعر', 'Price')}</p>
        <p className="text-4xl font-bold">{formatPrice(offer.price)}</p>
        {offer.message && <p className="mt-3 whitespace-pre-line text-primary/85">{offer.message}</p>}

        <dl className="mt-5 grid gap-3 border-t border-primary/10 pt-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-primary/70">{t('Ort', 'المكان', 'Location')}</dt>
            <dd className="font-medium">{[offer.postcode, offer.city].filter(Boolean).join(' ')}</dd>
          </div>
          {offer.area_sqm ? (
            <div>
              <dt className="text-primary/70">{t('Fläche', 'المساحة', 'Area')}</dt>
              <dd className="font-medium">{offer.area_sqm} m²</dd>
            </div>
          ) : null}
          {offer.preferred_date && (
            <div>
              <dt className="text-primary/70">{t('Wunschtermin', 'الموعد المطلوب', 'Preferred date')}</dt>
              <dd className="font-medium">
                {formatDate(offer.preferred_date)}
                {offer.preferred_time ? `, ${offer.preferred_time}` : ''}
              </dd>
            </div>
          )}
        </dl>
      </section>

      <section className="mt-4 rounded-2xl bg-card p-5 text-sm shadow-sm">
        <h2 className="font-semibold">{accepted && p.company_name ? p.company_name : t('Ihr KlarFix-Partner', 'شريك KlarFix الخاص بك', 'Your KlarFix partner')}</h2>
        <ul className="mt-2 space-y-1.5 text-primary/80">
          {p.verified && (
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#166534]" />
              {t('Geprüfter Partner (Gewerbe & Haftpflicht)', 'شريك موثَّق (رخصة تجارية وتأمين مسؤولية)', 'Verified partner (business licence & liability insurance)')}
            </li>
          )}
          <li className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            {p.rating !== null
              ? `${p.rating.toFixed(1)} / 5 (${p.review_count})`
              : t('Noch keine Bewertungen', 'لا توجد تقييمات بعد', 'No reviews yet')}
          </li>
          {p.experience_years ? (
            <li>
              {t('Erfahrung', 'الخبرة', 'Experience')}: {p.experience_years} {t('Jahre', 'سنوات', 'years')}
            </li>
          ) : null}
          {p.team_size ? (
            <li>
              {t('Team', 'الفريق', 'Team')}: {p.team_size}
            </li>
          ) : null}
        </ul>
      </section>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {accepted ? (
        <div className="mt-6 rounded-2xl bg-[#DCFCE7] p-5 text-[#166534]">
          <p className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-5 w-5" /> {t('Angebot angenommen', 'تم قبول العرض', 'Offer accepted')}
          </p>
          <p className="mt-1 text-sm">
            {t(
              'Vielen Dank! Der Partner meldet sich in Kürze bei Ihnen, um den Termin abzustimmen.',
              'شكراً لك! سيتواصل معك الشريك قريباً لتنسيق الموعد.',
              'Thank you! The partner will contact you shortly to arrange the appointment.',
            )}
          </p>
        </div>
      ) : result === 'rejected' ? (
        <div className="mt-6 rounded-2xl bg-card p-5 shadow-sm">
          <p className="font-semibold">{t('Angebot abgelehnt', 'تم رفض العرض', 'Offer declined')}</p>
          <p className="mt-1 text-sm text-primary/80">
            {t(
              'Ihre Anfrage bleibt offen. Sie erhalten eine E-Mail, sobald ein anderer Partner ein Angebot schickt.',
              'يبقى طلبك مفتوحاً. ستصلك رسالة عندما يرسل شريك آخر عرضاً.',
              'Your request stays open. You will get an email as soon as another partner sends an offer.',
            )}
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={() => decide('accept')}
            disabled={busy}
            className="min-h-[52px] w-full rounded-full bg-primary px-6 text-lg font-semibold text-card hover:bg-primary-hover disabled:opacity-50"
          >
            {t('Angebot annehmen', 'قبول العرض', 'Accept offer')}
          </button>
          {confirmReject ? (
            <div className="rounded-2xl border border-primary/20 p-4 text-sm">
              <p>{t('Angebot wirklich ablehnen?', 'هل تريد فعلاً رفض العرض؟', 'Really decline this offer?')}</p>
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmReject(false)}
                  className="min-h-[44px] flex-1 rounded-full border border-primary/30 font-medium hover:bg-primary/5"
                >
                  {t('Zurück', 'رجوع', 'Back')}
                </button>
                <button
                  type="button"
                  onClick={() => decide('reject')}
                  disabled={busy}
                  className="min-h-[44px] flex-1 rounded-full bg-danger font-medium text-[#FFFFFF] disabled:opacity-50"
                >
                  {t('Ja, ablehnen', 'نعم، ارفض', 'Yes, decline')}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReject(true)}
              disabled={busy}
              className="min-h-[52px] w-full rounded-full border border-primary/30 bg-card px-6 font-semibold text-primary hover:bg-primary/5 disabled:opacity-50"
            >
              {t('Angebot ablehnen', 'رفض العرض', 'Decline offer')}
            </button>
          )}
        </div>
      )}
    </main>
  )
}
