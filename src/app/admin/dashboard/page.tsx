'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  BarChart3,
  Bell,
  Calendar,
  CheckCircle,
  FileText,
  Inbox,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Ruler,
  Settings,
  ShieldCheck,
  Trash2,
  TrendingUp,
  User,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import SettingsPanel from '@/components/admin/SettingsPanel'
import { Modal, ModalButtons, PartnerList, type AdminPartner } from '@/components/admin/PartnersManager'

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
  partner_id: string | null
  created_at: string
}

type PartnerOption = { id: string; company_name: string }

type Tab = 'requests' | 'partners' | 'stats'

const TABS: { key: Tab; label: string; icon: LucideIcon }[] = [
  { key: 'requests', label: 'Alle Anfragen', icon: FileText },
  { key: 'partners', label: 'Partner', icon: Users },
  { key: 'stats', label: 'Stats', icon: BarChart3 },
]

const STATUS: Record<string, { label: string; className: string }> = {
  new: { label: 'Neu', className: 'bg-[#FEF3C7] text-[#92400E]' },
  assigned: { label: 'Zugewiesen', className: 'bg-[#DBEAFE] text-[#1E40AF]' },
}

const card = 'rounded-[20px] bg-[#FFFFFF] shadow-[0_2px_10px_rgba(0,0,0,0.05)]'
const yesNo = (v: boolean | null) => (v === null || v === undefined ? null : v ? 'Ja' : 'Nein')
const listText = (v: string[] | null) => (v && v.length > 0 ? v.join(', ') : null)
const formatDate = (iso: string | null) => (iso ? new Date(iso).toLocaleString('de-DE') : null)

function DetailModal({
  title,
  subtitle,
  onClose,
  footer,
  children,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  footer?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0F2A1D]/50 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[24px] bg-[#FFFAF5] p-6 shadow-2xl sm:rounded-[20px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-[#1A4D2E]/10 pb-4">
          <div className="min-w-0">
            <h2 className="break-words text-xl font-bold text-[#1A4D2E]">{title}</h2>
            {subtitle && <p className="text-sm text-[#4B5563]">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#1A4D2E]/70 hover:bg-[#1A4D2E]/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
        {footer && <div className="mt-6 flex flex-wrap justify-end gap-3">{footer}</div>}
      </div>
    </div>
  )
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#4B5563]">{title}</h3>
      <dl className="grid gap-3 rounded-[16px] bg-[#FFFFFF] p-4 text-sm sm:grid-cols-2">{children}</dl>
    </section>
  )
}

function DetailField({ label, value, wide }: { label: string; value?: string | null; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <dt className="text-[#4B5563]">{label}</dt>
      <dd className="break-words whitespace-pre-line font-medium text-[#1A4D2E]">{value || '–'}</dd>
    </div>
  )
}

function QuickAction({
  icon: Icon,
  label,
  badge,
  active,
  href,
  onClick,
}: {
  icon: LucideIcon
  label: string
  badge?: string | null
  active?: boolean
  href?: string
  onClick?: () => void
}) {
  const className = `relative flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-[18px] bg-[#FFFFFF] p-3 text-center shadow-[0_2px_10px_rgba(0,0,0,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(0,0,0,0.08)] ${
    active ? 'ring-2 ring-[#1A4D2E]' : ''
  }`
  const content = (
    <>
      {badge && (
        <span className="absolute right-2 top-2 rounded-full bg-[#1A4D2E] px-1.5 py-0.5 text-[10px] font-bold leading-none text-[#FFFFFF]">{badge}</span>
      )}
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E6F1E6] text-[#1A4D2E]">
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-[11px] font-semibold leading-tight text-[#1A4D2E]">{label}</span>
    </>
  )
  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className} aria-pressed={active}>
      {content}
    </button>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  iconClass,
}: {
  icon: LucideIcon
  label: string
  value: number
  iconClass: string
}) {
  return (
    <div className="flex items-center gap-4 rounded-[20px] bg-[#FFFAF5] p-5 shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${iconClass}`}>
        <Icon className="h-6 w-6" />
      </span>
      <div>
        <p className="text-3xl font-bold leading-none text-[#1A4D2E]">{value}</p>
        <span className="mt-2 inline-block rounded-full bg-[#E6F1E6] px-2.5 py-0.5 text-[11px] font-medium text-[#1A4D2E]">{label}</span>
      </div>
    </div>
  )
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className={`${card} flex flex-col items-center px-6 py-12 text-center`}>
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#A8D5A2]/50 text-[#1A4D2E]">
        <AlertCircle className="h-8 w-8" />
      </span>
      <p className="mt-4 font-semibold text-[#1A4D2E]">{title}</p>
      <p className="mt-1 max-w-xs text-[13px] text-[#4B5563]">{subtitle}</p>
    </div>
  )
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('requests')
  const [requests, setRequests] = useState<Request[]>([])
  const [partners, setPartners] = useState<PartnerOption[]>([])
  const [trashCount, setTrashCount] = useState(0)
  const [newApplications, setNewApplications] = useState(0)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [detailRequest, setDetailRequest] = useState<Request | null>(null)
  const [detailPartner, setDetailPartner] = useState<AdminPartner | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Request | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [partnerReloadKey, setPartnerReloadKey] = useState(0)

  const loadData = useCallback(async () => {
    const [reqRes, partnerRes, trashRes, appRes] = await Promise.all([
      supabase
        .from('requests')
        .select('id, customer_name, customer_email, customer_phone, postcode, service_type, area_sqm, message, status, partner_id, created_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
      supabase
        .from('partners')
        .select('id, company_name')
        .is('deleted_at', null)
        .eq('is_blocked', false)
        .order('company_name', { ascending: true }),
      supabase.from('requests').select('id', { count: 'exact', head: true }).not('deleted_at', 'is', null),
      supabase.from('partner_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
    ])

    if (reqRes.error || partnerRes.error) setMessage('Daten konnten nicht geladen werden.')
    setRequests((reqRes.data as Request[]) ?? [])
    setPartners((partnerRes.data as PartnerOption[]) ?? [])
    setTrashCount(trashRes.count ?? 0)
    setNewApplications(appRes.count ?? 0)
  }, [])

  useEffect(() => {
    const init = async () => {
      if (!localStorage.getItem('admin')) {
        router.replace('/admin/login')
        return
      }
      await loadData()
      setLoading(false)
    }
    init()
  }, [router, loadData])

  // Soft delete only: the request is moved to /admin/trash and can be restored there.
  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setMessage('')
    const { error } = await supabase
      .from('requests')
      .update({ deleted_at: new Date().toISOString(), deleted_by: 'admin' })
      .eq('id', deleteTarget.id)
    setDeleting(false)

    if (error) {
      setMessage('Löschen fehlgeschlagen.')
      return
    }
    setRequests((prev) => prev.filter((r) => r.id !== deleteTarget.id))
    setTrashCount((c) => c + 1)
    setDeleteTarget(null)
  }

  async function assignPartner(requestId: string, partnerId: string) {
    setMessage('')
    const { error } = await supabase
      .from('requests')
      .update({ partner_id: partnerId || null, status: partnerId ? 'assigned' : 'new' })
      .eq('id', requestId)
    if (error) {
      setMessage('Zuweisung fehlgeschlagen.')
      return
    }
    setMessage('Zuweisung gespeichert.')
    await loadData()
  }

  async function verifyPartner(partner: AdminPartner) {
    setMessage('')
    const res = await fetch('/api/admin/verify-partner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partnerId: partner.id }),
    })
    const data = (await res.json().catch(() => null)) as { error?: string; emailSent?: boolean; warning?: string } | null
    if (!res.ok) {
      setMessage(data?.error ?? 'Verifizierung fehlgeschlagen.')
      return
    }
    setMessage(data?.emailSent ? 'Partner verifiziert. Annahme-E-Mail wurde gesendet.' : (data?.warning ?? 'Partner verifiziert.'))
    setDetailPartner({ ...partner, verified: true })
    setPartnerReloadKey((k) => k + 1)
  }

  function logout() {
    localStorage.removeItem('admin')
    router.push('/admin/login')
  }

  if (loading) {
    return <div className="min-h-screen bg-[#E6F1E6] p-8 text-center text-[#4B5563]">Lade…</div>
  }

  const stats = {
    total: requests.length,
    new: requests.filter((r) => r.status === 'new').length,
    assigned: requests.filter((r) => r.status === 'assigned').length,
  }
  const partnerName = (id: string | null) => partners.find((p) => p.id === id)?.company_name ?? null

  return (
    <div className="min-h-screen bg-[#E6F1E6]">
      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
        <header className="mb-5">
          <p className="text-[13px] font-medium text-[#4B5563]">
            {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="text-2xl font-bold text-[#1A4D2E] sm:text-3xl">Admin-Dashboard</h1>
        </header>

        <nav aria-label="Schnellzugriff" className="grid grid-cols-4 gap-2 sm:gap-3">
          <QuickAction
            icon={Inbox}
            label="Partner-Anträge"
            href="/admin/partner-applications"
            badge={newApplications > 0 ? `${newApplications} neu` : null}
          />
          <QuickAction icon={Users} label="Partner verwalten" active={tab === 'partners'} onClick={() => setTab('partners')} />
          <QuickAction icon={Trash2} label={`Papierkorb (${trashCount})`} href="/admin/trash" />
          <QuickAction icon={LogOut} label="Abmelden" onClick={logout} />
        </nav>

        <div role="tablist" className="mt-5 flex gap-1 rounded-full bg-[#FFFFFF] p-1.5 shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
          {TABS.map((t) => {
            const Icon = t.icon
            const active = tab === t.key
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.key)}
                className={`flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-full px-2 text-[13px] font-semibold transition sm:text-sm ${
                  active ? 'bg-[#A8D5A2] text-[#0F2A1D]' : 'text-[#4B5563] hover:bg-[#F5F5F0]'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{t.label}</span>
              </button>
            )
          })}
        </div>

        {message && (
          <p className={`${card} mt-4 flex items-center gap-2 p-3 text-sm text-[#1A4D2E]`}>
            <CheckCircle className="h-4 w-4 shrink-0" /> {message}
          </p>
        )}

        <section className="mt-5">
          {tab === 'requests' &&
            (requests.length === 0 ? (
              <EmptyState
                title="Keine Anfragen vorhanden"
                subtitle="Sobald Kunden über /buchen eine Anfrage senden, erscheint sie hier."
              />
            ) : (
              <ul className="grid gap-3 lg:grid-cols-2">
                {requests.map((r) => {
                  const status = STATUS[r.status] ?? { label: r.status, className: 'bg-[#F5F5F0] text-[#4B5563]' }
                  return (
                    <li key={r.id} className={`${card} p-4`}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setDetailRequest(r)}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setDetailRequest(r))}
                        className="cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate font-bold text-[#1A4D2E]">{r.service_type}</h3>
                            <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[#4B5563]">
                              <Calendar className="h-3.5 w-3.5" /> {new Date(r.created_at).toLocaleDateString('de-DE')}
                            </p>
                          </div>
                          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${status.className}`}>
                            {status.label}
                          </span>
                        </div>
                        <div className="mt-3 grid gap-1 text-[13px] text-[#4B5563] sm:grid-cols-2">
                          <p className="flex min-w-0 items-center gap-2">
                            <User className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{r.customer_name || '–'}</span>
                          </p>
                          <p className="flex min-w-0 items-center gap-2">
                            <Mail className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{r.customer_email}</span>
                          </p>
                          {r.customer_phone && (
                            <p className="flex items-center gap-2">
                              <Phone className="h-3.5 w-3.5 shrink-0" /> {r.customer_phone}
                            </p>
                          )}
                          <p className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 shrink-0" /> {r.postcode}
                            {r.area_sqm ? (
                              <>
                                <Ruler className="ml-2 h-3.5 w-3.5 shrink-0" /> {r.area_sqm} m²
                              </>
                            ) : null}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <select
                          value={r.partner_id ?? ''}
                          onChange={(e) => assignPartner(r.id, e.target.value)}
                          aria-label="Partner zuweisen"
                          className="min-h-[44px] min-w-0 flex-1 rounded-xl bg-[#F5F5F0] px-3 text-[13px] text-[#1A4D2E] focus:outline-none focus:ring-2 focus:ring-[#1A4D2E]/20"
                        >
                          <option value="">Partner zuweisen…</option>
                          {partners.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.company_name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(r)}
                          aria-label="In den Papierkorb verschieben"
                          title="In den Papierkorb verschieben"
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F5F5F0] text-[#4B5563] hover:bg-danger/10 hover:text-danger"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ))}

          {tab === 'partners' && (
            <PartnerList reloadKey={partnerReloadKey} onOpenDetails={setDetailPartner} onChanged={loadData} />
          )}

          {tab === 'stats' && (
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard icon={TrendingUp} label="Anfragen gesamt" value={stats.total} iconClass="bg-[#A8D5A2]/50 text-[#1A4D2E]" />
              <StatCard icon={Bell} label="Neue Anfragen" value={stats.new} iconClass="bg-[#FEF3C7] text-[#B45309]" />
              <StatCard icon={CheckCircle} label="Zugewiesene Anfragen" value={stats.assigned} iconClass="bg-[#DBEAFE] text-[#1D4ED8]" />
            </div>
          )}
        </section>

        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="Einstellungen"
          title="Einstellungen"
          className="fixed bottom-6 end-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#1A4D2E] text-[#FFFFFF] shadow-[0_6px_16px_rgba(0,0,0,0.15)] transition hover:-translate-y-0.5"
        >
          <Settings className="h-5 w-5" />
        </button>

        {detailRequest && (
          <DetailModal
            title={detailRequest.service_type}
            subtitle={`Eingegangen am ${formatDate(detailRequest.created_at)}`}
            onClose={() => setDetailRequest(null)}
          >
            <div className="space-y-5">
              <DetailSection title="Kunde">
                <DetailField label="Name" value={detailRequest.customer_name} />
                <DetailField label="E-Mail" value={detailRequest.customer_email} />
                <DetailField label="Telefon" value={detailRequest.customer_phone} />
              </DetailSection>
              <DetailSection title="Auftrag">
                <DetailField label="Leistung" value={detailRequest.service_type} />
                <DetailField label="PLZ" value={detailRequest.postcode} />
                <DetailField label="Fläche" value={detailRequest.area_sqm ? `${detailRequest.area_sqm} m²` : null} />
                <DetailField label="Status" value={STATUS[detailRequest.status]?.label ?? detailRequest.status} />
                <DetailField label="Zugewiesener Partner" value={partnerName(detailRequest.partner_id)} />
                <DetailField label="Anfrage-ID" value={detailRequest.id} />
              </DetailSection>
              <DetailSection title="Nachricht">
                <DetailField label="Nachricht" value={detailRequest.message} wide />
              </DetailSection>
            </div>
          </DetailModal>
        )}

        {detailPartner && (
          <DetailModal
            title={detailPartner.company_name}
            subtitle={detailPartner.verified ? 'Verifiziert' : 'Ausstehend'}
            onClose={() => setDetailPartner(null)}
            footer={
              <>
                <button
                  type="button"
                  onClick={() => setDetailPartner(null)}
                  className="min-h-[44px] rounded-xl bg-[#F5F5F0] px-5 font-medium text-[#1A4D2E] hover:bg-[#ECECE4]"
                >
                  Schließen
                </button>
                {!detailPartner.verified && !detailPartner.deleted_at && (
                  <button
                    type="button"
                    onClick={() => verifyPartner(detailPartner)}
                    className="flex min-h-[44px] items-center gap-2 rounded-xl bg-[#1A4D2E] px-5 font-medium text-[#FFFFFF] hover:bg-[#143D24]"
                  >
                    <ShieldCheck className="h-4 w-4" /> Verifizieren
                  </button>
                )}
              </>
            }
          >
            <div className="space-y-5">
              <DetailSection title="Person">
                <DetailField label="Vorname" value={detailPartner.first_name} />
                <DetailField label="Nachname" value={detailPartner.last_name} />
              </DetailSection>
              <DetailSection title="Firma">
                <DetailField label="Firmenname" value={detailPartner.company_name} />
                <DetailField label="Rechtsform" value={detailPartner.legal_form} />
                <DetailField label="Mitarbeiterzahl" value={detailPartner.employee_count} />
                <DetailField label="Preis" value={detailPartner.hourly_rate !== null ? `${detailPartner.hourly_rate} €/Std.` : null} />
                <DetailField label="Haftpflichtversicherung" value={yesNo(detailPartner.has_liability_insurance)} />
                <DetailField label="Gewerbeanmeldung" value={yesNo(detailPartner.has_trade_license)} />
                <DetailField label="Status" value={detailPartner.verified ? 'Verifiziert' : 'Ausstehend'} />
                <DetailField label="Registriert am" value={formatDate(detailPartner.created_at)} />
                <DetailField label="AGB akzeptiert am" value={formatDate(detailPartner.terms_accepted_at)} />
              </DetailSection>
              <DetailSection title="Kontakt">
                <DetailField label="E-Mail" value={detailPartner.email} />
                <DetailField label="Telefon" value={detailPartner.phone} />
                <DetailField label="Website" value={detailPartner.website} />
              </DetailSection>
              <DetailSection title="Standort">
                <DetailField label="Straße" value={detailPartner.street} />
                <DetailField label="PLZ" value={detailPartner.postcode} />
                <DetailField label="Stadt" value={detailPartner.city} />
              </DetailSection>
              <DetailSection title="Leistungen & Erfahrung">
                <DetailField label="Reinigungsarten" value={listText(detailPartner.services)} wide />
                <DetailField
                  label="Erfahrung"
                  value={detailPartner.experience_years !== null ? `${detailPartner.experience_years} Jahre` : null}
                />
                <DetailField label="Sprachen" value={listText(detailPartner.languages)} />
                <DetailField label="Verfügbarkeit" value={detailPartner.availability} wide />
                <DetailField label="Beschreibung" value={detailPartner.description} wide />
              </DetailSection>
              <section>
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[#4B5563]">Dokumente</h3>
                  {detailPartner.license_url && detailPartner.insurance_url && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#DCFCE7] px-2.5 py-0.5 text-xs font-semibold text-[#166534]">
                      <CheckCircle className="h-3.5 w-3.5" /> Vollständig
                    </span>
                  )}
                </div>
                <ul className="divide-y divide-[#1A4D2E]/10 rounded-[16px] bg-[#FFFFFF] px-4 text-sm">
                  {[
                    { label: 'Gewerbe', url: detailPartner.license_url, missing: 'Kein Gewerbenachweis' },
                    { label: 'Haftpflicht', url: detailPartner.insurance_url, missing: 'Keine Haftpflichtversicherung' },
                    { label: 'Logo', url: detailPartner.logo_url, missing: 'Kein Logo (optional)' },
                  ].map((doc) => (
                    <li key={doc.label} className="flex min-h-[48px] items-center justify-between gap-3 py-2">
                      <span className="font-medium text-[#1A4D2E]">{doc.label}</span>
                      {doc.url ? (
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="font-medium text-[#1A4D2E] underline hover:opacity-80">
                          ✅ Öffnen
                        </a>
                      ) : (
                        <span className="text-[#4B5563]">❌ {doc.missing}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </DetailModal>
        )}

        {settingsOpen && (
          <DetailModal title="Einstellungen" onClose={() => setSettingsOpen(false)}>
            <SettingsPanel onMessage={setMessage} />
          </DetailModal>
        )}

        {deleteTarget && (
          <Modal title="In Papierkorb verschieben?" onClose={() => setDeleteTarget(null)}>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
              <Trash2 className="h-6 w-6" />
            </div>
            <p className="text-center text-sm text-[#4B5563]">Die Anfrage wird in den Papierkorb verschoben und kann dort wiederhergestellt werden.</p>
            <p className="mt-3 text-center text-xs text-[#4B5563]">
              {deleteTarget.customer_name || deleteTarget.customer_email} · {deleteTarget.postcode}
            </p>
            <ModalButtons onCancel={() => setDeleteTarget(null)} confirmLabel="Verschieben" danger busy={deleting} onConfirm={confirmDelete} />
          </Modal>
        )}
      </main>
    </div>
  )
}
