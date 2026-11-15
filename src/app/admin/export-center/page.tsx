'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BackToAdmin, btnPrimary, cardClass, fieldClass, pageClass } from '@/components/admin/exportUi'
import {
  EXPORT_CITIES,
  EXPORT_SERVICES,
  EXPORT_STATUSES,
  SS_EXPORT_UNTIL,
  type ExportFormat,
  type ExportType,
} from '@/lib/exportConstants'
import { formatCountdown, setSessionNumber, useAdminFlag, useNow, useSessionNumber } from '@/lib/exportSessionClient'

const TABS: { value: ExportType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'bookings', label: 'Bookings' },
  { value: 'customers', label: 'Customers' },
  { value: 'partners', label: 'Partners' },
]

const FORMATS: { value: ExportFormat; label: string; hint: string }[] = [
  { value: 'xlsx', label: 'Excel', hint: '.xlsx' },
  { value: 'csv', label: 'CSV', hint: '.csv' },
  { value: 'json', label: 'JSON', hint: '.json' },
]

type CountState = { status: 'idle' | 'loading' | 'ok' | 'error'; total?: number; error?: string }

export default function ExportCenterPage() {
  const router = useRouter()
  const isAdmin = useAdminFlag()
  const exportUntil = useSessionNumber(SS_EXPORT_UNTIL)
  const now = useNow()

  const [type, setType] = useState<ExportType>('all')
  const [city, setCity] = useState('all')
  const [service, setService] = useState('all')
  const [status, setStatus] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [format, setFormat] = useState<ExportFormat>('xlsx')
  const [count, setCount] = useState<CountState>({ status: 'idle' })
  const [downloading, setDownloading] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const hasSession = exportUntil > 0
  const ready = isAdmin === true && now > 0 && exportUntil > now
  const statusApplies = type === 'all' || type === 'bookings'
  const invalidRange = Boolean(from && to && from > to)

  // No admin login → login page. PIN session (sessionStorage, 15 min) missing or expired → PIN gate.
  useEffect(() => {
    if (isAdmin === false) {
      router.replace('/admin/login')
      return
    }
    if (isAdmin === null || exportUntil === -1 || now === 0) return
    if (exportUntil === 0 || exportUntil <= now) {
      setSessionNumber(SS_EXPORT_UNTIL, null)
      router.replace('/admin/export')
    }
  }, [isAdmin, exportUntil, now, router])

  const query = useMemo(
    () => new URLSearchParams({ type, city, service, status: statusApplies ? status : 'all', from, to, format }).toString(),
    [type, city, service, status, statusApplies, from, to, format],
  )

  // Handles 401 (admin session gone) and 403 needPin (export session gone). Returns true if handled.
  function handleAuthError(res: Response, data: { needPin?: boolean }) {
    if (res.status === 401) {
      localStorage.removeItem('admin')
      router.replace('/admin/login')
      return true
    }
    if (res.status === 403 && data.needPin) {
      setSessionNumber(SS_EXPORT_UNTIL, null)
      return true
    }
    return false
  }

  useEffect(() => {
    if (!hasSession || invalidRange) return
    const ctrl = new AbortController()
    const timer = setTimeout(async () => {
      setCount({ status: 'loading' })
      try {
        const res = await fetch(`/api/backup?${query}&count=1`, { signal: ctrl.signal, cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        if (handleAuthError(res, data)) return
        if (!res.ok) throw new Error(data.error ?? 'Fehler')
        setCount({ status: 'ok', total: data.total })
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setCount({ status: 'error', error: (err as Error).message })
      }
    }, 300)
    return () => {
      ctrl.abort()
      clearTimeout(timer)
    }
    // handleAuthError only uses stable router/setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, invalidRange, hasSession])

  async function download() {
    setDownloading(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/backup?${query}`, { cache: 'no-store' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (handleAuthError(res, data)) return
        throw new Error(data.error ?? 'Download fehlgeschlagen.')
      }
      const blob = await res.blob()
      const filename =
        /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? `klarfix-${type}.${format}`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setMessage({ kind: 'ok', text: `✅ ${filename} heruntergeladen` })
    } catch (err) {
      setMessage({ kind: 'error', text: (err as Error).message })
    } finally {
      setDownloading(false)
    }
  }

  function resetFilters() {
    setCity('all')
    setService('all')
    setStatus('all')
    setFrom('')
    setTo('')
  }

  if (!ready) return <div className={`${pageClass} p-8 text-center text-[#4B5563]`}>Lade…</div>

  const labelClass = 'mb-1 block text-sm font-semibold text-[#1B4332]'

  return (
    <div className={pageClass}>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2A9DCC]">Backup & Export</p>
            <h1 className="text-2xl font-extrabold text-[#1B4332] sm:text-3xl">📥 Export Center</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#2A9DCC]/10 px-3 py-1 text-xs font-semibold text-[#2A9DCC]" title="PIN-Sitzung läuft ab in">
              🔓 {formatCountdown(exportUntil - now)}
            </span>
            <BackToAdmin />
          </div>
        </header>

        <nav role="tablist" aria-label="Datentyp" className={`${cardClass} flex gap-1 overflow-x-auto p-1.5`}>
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={type === t.value}
              onClick={() => setType(t.value)}
              className={`min-h-[44px] flex-1 whitespace-nowrap rounded-2xl px-4 text-sm font-bold transition ${
                type === t.value ? 'bg-[#1B4332] text-[#FFF9F5] shadow-md' : 'text-[#4B5563] hover:bg-[#FFF9F5]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <section className={`${cardClass} mt-4 p-5 sm:p-6`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-[#1B4332]">Filter</h2>
            <button type="button" onClick={resetFilters} className="text-sm font-semibold text-[#E86A33] hover:underline">
              Zurücksetzen
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>City</span>
              <select className={fieldClass} value={city} onChange={(e) => setCity(e.target.value)}>
                <option value="all">All</option>
                {EXPORT_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelClass}>Service</span>
              <select className={fieldClass} value={service} onChange={(e) => setService(e.target.value)}>
                <option value="all">All</option>
                {Object.keys(EXPORT_SERVICES).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <span className={labelClass}>Date</span>
              <div className="flex items-center gap-2">
                <input type="date" aria-label="From Date" className={fieldClass} value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
                <span className="text-[#4B5563]">–</span>
                <input type="date" aria-label="To Date" className={fieldClass} value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
              </div>
            </div>
            <label className="block">
              <span className={labelClass}>
                Status {!statusApplies && <em className="font-normal text-[#4B5563]">(nur Bookings)</em>}
              </span>
              <select className={fieldClass} value={status} onChange={(e) => setStatus(e.target.value)} disabled={!statusApplies}>
                <option value="all">All</option>
                {Object.keys(EXPORT_STATUSES).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {invalidRange && <p className="mt-3 text-sm font-semibold text-[#E85D5D]">Von-Datum liegt nach Bis-Datum.</p>}
        </section>

        <section className={`${cardClass} mt-4 p-5 sm:p-6`}>
          <h2 className="mb-3 font-bold text-[#1B4332]">Format</h2>
          <div role="radiogroup" className="grid grid-cols-3 gap-2 sm:gap-3">
            {FORMATS.map((f) => (
              <label
                key={f.value}
                className={`flex cursor-pointer flex-col items-center rounded-2xl border-2 px-3 py-3 text-center transition ${
                  format === f.value ? 'border-[#E86A33] bg-[#E86A33]/5' : 'border-[#F0E4DA] hover:border-[#E86A33]/40'
                }`}
              >
                <input
                  type="radio"
                  name="format"
                  value={f.value}
                  checked={format === f.value}
                  onChange={() => setFormat(f.value)}
                  className="accent-[#E86A33]"
                />
                <span className="mt-1 font-bold text-[#1B4332]">{f.label}</span>
                <span className="text-xs text-[#4B5563]">{f.hint}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="mt-6 text-center">
          <p className="mb-3 text-sm font-semibold text-[#4B5563]" dir="rtl" aria-live="polite">
            {invalidRange
              ? '—'
              : count.status === 'ok'
                ? `سيتم تحميل ${count.total} سجل`
                : count.status === 'error'
                  ? `⚠️ ${count.error}`
                  : '…'}
          </p>
          <button type="button" onClick={download} disabled={downloading || invalidRange} className={`${btnPrimary} w-full py-4 text-lg sm:w-auto sm:px-12`}>
            {downloading ? '⏳ …' : '📥 تحميل الآن'}
          </button>
          {message && (
            <p
              role="status"
              className={`mt-4 rounded-xl px-3 py-2 text-sm font-semibold ${
                message.kind === 'ok' ? 'bg-[#14A090]/10 text-[#14A090]' : 'bg-[#E85D5D]/10 text-[#E85D5D]'
              }`}
            >
              {message.text}
            </p>
          )}
        </section>
      </main>
    </div>
  )
}
