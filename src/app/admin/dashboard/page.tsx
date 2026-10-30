'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, X } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import SettingsPanel from '@/components/admin/SettingsPanel'

type Partner = {
  id: string
  company_name: string
  first_name: string | null
  last_name: string | null
  email: string
  phone: string | null
  street: string | null
  city: string | null
  postcode: string | null
  legal_form: string | null
  employee_count: string | null
  has_liability_insurance: boolean | null
  has_trade_license: boolean | null
  experience_years: number | null
  services: string[] | null
  description: string | null
  website: string | null
  languages: string[] | null
  availability: string | null
  terms_accepted_at: string | null
  logo_url: string | null
  license_url: string | null
  verified: boolean
  created_at: string
}

const yesNo = (v: boolean | null) => (v === null || v === undefined ? null : v ? 'Ja' : 'Nein')
const listText = (v: string[] | null) => (v && v.length > 0 ? v.join(', ') : null)

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
          <div className="min-w-0">
            <h2 className="break-words text-xl font-bold text-[#0F60C6]">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="shrink-0 rounded-lg p-1 text-gray-500 hover:bg-gray-100"
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
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</h3>
      <dl className="grid gap-3 rounded-xl bg-gray-50 p-4 text-sm sm:grid-cols-2">{children}</dl>
    </section>
  )
}

function DetailField({
  label,
  value,
  wide,
}: {
  label: string
  value?: string | null
  wide?: boolean
}) {
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <dt className="text-gray-500">{label}</dt>
      <dd className="break-words whitespace-pre-line font-medium text-gray-900">{value || '–'}</dd>
    </div>
  )
}

type Tab = 'requests' | 'partners' | 'stats'

const TABS: { key: Tab; label: string }[] = [
  { key: 'requests', label: 'Alle Anfragen' },
  { key: 'partners', label: 'Partner' },
  { key: 'stats', label: 'Stats' },
]

export default function AdminDashboardPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('requests')
  const [requests, setRequests] = useState<Request[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [detail, setDetail] = useState<{ kind: 'request' | 'partner'; id: string } | null>(null)

  const loadData = useCallback(async () => {
    const [reqRes, partnerRes] = await Promise.all([
      supabase
        .from('requests')
        .select('id, customer_name, customer_email, customer_phone, postcode, service_type, area_sqm, message, status, partner_id, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('partners')
        .select(
          'id, company_name, first_name, last_name, email, phone, street, city, postcode, legal_form, employee_count, has_liability_insurance, has_trade_license, experience_years, services, description, website, languages, availability, terms_accepted_at, logo_url, license_url, verified, created_at'
        )
        .order('created_at', { ascending: false }),
    ])

    if (reqRes.error || partnerRes.error) {
      setMessage('Daten konnten nicht geladen werden.')
    }
    setRequests((reqRes.data as Request[]) ?? [])
    setPartners((partnerRes.data as Partner[]) ?? [])
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

  async function assignPartner(requestId: string, partnerId: string) {
    setMessage('')
    const { error } = await supabase
      .from('requests')
      .update({
        partner_id: partnerId || null,
        status: partnerId ? 'assigned' : 'new',
      })
      .eq('id', requestId)

    if (error) {
      setMessage('Zuweisung fehlgeschlagen.')
      return
    }
    setMessage('Zuweisung gespeichert.')
    await loadData()
  }

  async function verifyPartner(partnerId: string) {
    setMessage('')
    const { error } = await supabase.from('partners').update({ verified: true }).eq('id', partnerId)
    if (error) {
      setMessage('Verifizierung fehlgeschlagen.')
      return
    }
    setMessage('Partner verifiziert.')
    await loadData()
  }

  function logout() {
    localStorage.removeItem('admin')
    router.push('/admin/login')
  }

  if (loading) {
    return <main className="p-8 text-center text-gray-500">Lade…</main>
  }

  const selectedRequest = detail?.kind === 'request' ? requests.find((r) => r.id === detail.id) ?? null : null
  const selectedPartner = detail?.kind === 'partner' ? partners.find((p) => p.id === detail.id) ?? null : null
  const formatDate = (iso: string | null) => (iso ? new Date(iso).toLocaleString('de-DE') : null)

  const stats = {
    totalRequests: requests.length,
    newRequests: requests.filter((r) => r.status === 'new').length,
    assignedRequests: requests.filter((r) => r.status === 'assigned').length,
    totalPartners: partners.length,
    verifiedPartners: partners.filter((p) => p.verified).length,
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#0F60C6]">Admin-Dashboard</h1>
        <button onClick={logout} className="text-sm text-gray-600 underline hover:text-gray-900">
          Abmelden
        </button>
      </div>

      <nav className="mb-6 flex gap-2 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              tab === t.key ? 'border-[#0F60C6] text-[#0F60C6]' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {message && <p className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-[#0F60C6]">{message}</p>}

      {tab === 'requests' && (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-100 text-gray-600">
              <tr>
                <th className="px-4 py-3">Datum</th>
                <th className="px-4 py-3">Kunde</th>
                <th className="px-4 py-3">Kontakt</th>
                <th className="px-4 py-3">PLZ</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">m²</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Partner zuweisen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.map((r) => (
                <tr key={r.id} onClick={() => setDetail({ kind: 'request', id: r.id })} className="align-top cursor-pointer hover:bg-blue-50">
                  <td className="px-4 py-3">{new Date(r.created_at).toLocaleDateString('de-DE')}</td>
                  <td className="px-4 py-3">{r.customer_name || '–'}</td>
                  <td className="px-4 py-3">
                    <div>{r.customer_email}</div>
                    <div className="text-gray-500">{r.customer_phone || ''}</div>
                  </td>
                  <td className="px-4 py-3">{r.postcode}</td>
                  <td className="px-4 py-3">{r.service_type}</td>
                  <td className="px-4 py-3">{r.area_sqm ?? '–'}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{r.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={r.partner_id ?? ''}
                      onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => assignPartner(r.id, e.target.value)}
                      className="rounded-lg border border-gray-300 px-2 py-1"
                    >
                      <option value="">– kein Partner –</option>
                      {partners.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.company_name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-gray-500">
                    Keine Anfragen vorhanden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'partners' && (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-100 text-gray-600">
              <tr>
                <th className="px-4 py-3">Firma</th>
                <th className="px-4 py-3">E-Mail</th>
                <th className="px-4 py-3">Telefon</th>
                <th className="px-4 py-3">Stadt / PLZ</th>
                <th className="px-4 py-3">Services</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aktion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {partners.map((p) => (
                <tr key={p.id} onClick={() => setDetail({ kind: 'partner', id: p.id })} className="cursor-pointer hover:bg-blue-50">
                  <td className="px-4 py-3 font-medium">{p.company_name}</td>
                  <td className="px-4 py-3">{p.email}</td>
                  <td className="px-4 py-3">{p.phone || '–'}</td>
                  <td className="px-4 py-3">
                    {[p.city, p.postcode].filter(Boolean).join(' ') || '–'}
                  </td>
                  <td className="px-4 py-3">{p.services?.join(', ') || '–'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        p.verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {p.verified ? 'Verifiziert' : 'Ausstehend'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => {
                                              e.stopPropagation()
                                              verifyPartner(p.id)
                                            }}
                      disabled={p.verified}
                      className="w-28 rounded-lg bg-[#0F60C6] px-3 py-1 text-white hover:opacity-90 disabled:bg-gray-300 disabled:text-gray-600"
                    >
                      {p.verified ? 'Verifiziert' : 'Verify'}
                    </button>
                  </td>
                </tr>
              ))}
              {partners.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                    Keine Partner registriert.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'stats' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: 'Anfragen gesamt', value: stats.totalRequests },
            { label: 'Neue Anfragen', value: stats.newRequests },
            { label: 'Zugewiesene Anfragen', value: stats.assignedRequests },
            { label: 'Partner gesamt', value: stats.totalPartners },
            { label: 'Verifizierte Partner', value: stats.verifiedPartners },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className="mt-2 text-3xl font-bold text-[#0F60C6]">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setSettingsOpen(true)}
        aria-label="Einstellungen"
        title="Einstellungen"
        className="fixed bottom-6 end-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#0F60C6] shadow-md ring-1 ring-blue-100 transition hover:-translate-y-0.5 hover:bg-blue-50 hover:shadow-lg"
      >
        <Settings className="h-5 w-5" />
      </button>

      {selectedRequest && (
        <DetailModal
          title={selectedRequest.service_type}
          subtitle={`Eingegangen am ${formatDate(selectedRequest.created_at)}`}
          onClose={() => setDetail(null)}
        >
          <div className="space-y-5">
            <DetailSection title="Kunde">
              <DetailField label="Name" value={selectedRequest.customer_name} />
              <DetailField label="E-Mail" value={selectedRequest.customer_email} />
              <DetailField label="Telefon" value={selectedRequest.customer_phone} />
            </DetailSection>
            <DetailSection title="Auftrag">
              <DetailField label="Leistung" value={selectedRequest.service_type} />
              <DetailField label="PLZ" value={selectedRequest.postcode} />
              <DetailField label="Fläche" value={selectedRequest.area_sqm ? `${selectedRequest.area_sqm} m²` : null} />
              <DetailField label="Status" value={selectedRequest.status} />
              <DetailField
                label="Zugewiesener Partner"
                value={partners.find((p) => p.id === selectedRequest.partner_id)?.company_name ?? null}
              />
              <DetailField label="Anfrage-ID" value={selectedRequest.id} />
            </DetailSection>
            <DetailSection title="Nachricht">
              <DetailField label="Nachricht" value={selectedRequest.message} wide />
            </DetailSection>
          </div>
        </DetailModal>
      )}

      {selectedPartner && (
        <DetailModal
          title={selectedPartner.company_name}
          subtitle={selectedPartner.verified ? 'Verifiziert' : 'Ausstehend'}
          onClose={() => setDetail(null)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
              >
                Schließen
              </button>
              <button
                type="button"
                onClick={() => verifyPartner(selectedPartner.id)}
                disabled={selectedPartner.verified}
                className="rounded-lg bg-[#0F60C6] px-5 py-2 font-medium text-white hover:opacity-90 disabled:bg-gray-300 disabled:text-gray-600"
              >
                {selectedPartner.verified ? 'Verifiziert' : 'Verify'}
              </button>
            </>
          }
        >
          <div className="space-y-5">
            <DetailSection title="Person">
              <DetailField label="Vorname" value={selectedPartner.first_name} />
              <DetailField label="Nachname" value={selectedPartner.last_name} />
            </DetailSection>
            <DetailSection title="Firma">
              <DetailField label="Firmenname" value={selectedPartner.company_name} />
              <DetailField label="Rechtsform" value={selectedPartner.legal_form} />
              <DetailField label="Mitarbeiterzahl" value={selectedPartner.employee_count} />
              <DetailField label="Haftpflichtversicherung" value={yesNo(selectedPartner.has_liability_insurance)} />
              <DetailField label="Gewerbeanmeldung" value={yesNo(selectedPartner.has_trade_license)} />
              <DetailField label="Status" value={selectedPartner.verified ? 'Verifiziert' : 'Ausstehend'} />
              <DetailField label="Registriert am" value={formatDate(selectedPartner.created_at)} />
              <DetailField label="AGB akzeptiert am" value={formatDate(selectedPartner.terms_accepted_at)} />
            </DetailSection>
            <DetailSection title="Kontakt">
              <DetailField label="E-Mail" value={selectedPartner.email} />
              <DetailField label="Telefon" value={selectedPartner.phone} />
              <DetailField label="Website" value={selectedPartner.website} />
            </DetailSection>
            <DetailSection title="Standort">
              <DetailField label="Straße" value={selectedPartner.street} />
              <DetailField label="PLZ" value={selectedPartner.postcode} />
              <DetailField label="Stadt" value={selectedPartner.city} />
            </DetailSection>
            <DetailSection title="Leistungen & Erfahrung">
              <DetailField label="Reinigungsarten" value={listText(selectedPartner.services)} wide />
              <DetailField
                label="Erfahrung"
                value={selectedPartner.experience_years !== null ? `${selectedPartner.experience_years} Jahre` : null}
              />
              <DetailField label="Sprachen" value={listText(selectedPartner.languages)} />
              <DetailField label="Verfügbarkeit" value={selectedPartner.availability} wide />
              <DetailField label="Beschreibung" value={selectedPartner.description} wide />
            </DetailSection>
            <DetailSection title="Dokumente">
              <div className="sm:col-span-2 flex flex-wrap gap-3">
                {selectedPartner.logo_url ? (
                  <a href={selectedPartner.logo_url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-[#0F60C6] px-4 py-2 text-sm font-medium text-[#0F60C6] hover:bg-blue-50">
                    Logo öffnen
                  </a>
                ) : (
                  <span className="text-sm text-gray-500">Kein Logo hochgeladen</span>
                )}
                {selectedPartner.license_url ? (
                  <a href={selectedPartner.license_url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-[#0F60C6] px-4 py-2 text-sm font-medium text-[#0F60C6] hover:bg-blue-50">
                    Gewerbenachweis öffnen
                  </a>
                ) : (
                  <span className="text-sm text-gray-500">Kein Gewerbenachweis hochgeladen</span>
                )}
              </div>
            </DetailSection>
          </div>
        </DetailModal>
      )}

      {settingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#0F60C6]">Einstellungen</h2>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                aria-label="Schließen"
                className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <SettingsPanel onMessage={setMessage} />
          </div>
        </div>
      )}
    </main>
  )
}
