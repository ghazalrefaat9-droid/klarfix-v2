'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import SettingsPanel from '@/components/admin/SettingsPanel'

type Partner = {
  id: string
  company_name: string
  email: string
  phone: string | null
  city: string | null
  postcode: string | null
  services: string[] | null
  verified: boolean
  created_at: string
}

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

type Tab = 'requests' | 'partners' | 'stats' | 'settings'

const TABS: { key: Tab; label: string }[] = [
  { key: 'requests', label: 'Alle Anfragen' },
  { key: 'partners', label: 'Partner' },
  { key: 'stats', label: 'Stats' },
  { key: 'settings', label: 'Einstellungen' },
]

export default function AdminDashboardPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('requests')
  const [requests, setRequests] = useState<Request[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const loadData = useCallback(async () => {
    const [reqRes, partnerRes] = await Promise.all([
      supabase
        .from('requests')
        .select('id, customer_name, customer_email, customer_phone, postcode, service_type, area_sqm, message, status, partner_id, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('partners')
        .select('id, company_name, email, phone, city, postcode, services, verified, created_at')
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
                <tr key={r.id} className="align-top">
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
                <th className="px-4 py-3">Aktion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {partners.map((p) => (
                <tr key={p.id}>
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
                  <td className="px-4 py-3">
                    {!p.verified && (
                      <button
                        onClick={() => verifyPartner(p.id)}
                        className="rounded-lg bg-[#0F60C6] px-3 py-1 text-white hover:opacity-90"
                      >
                        Verify
                      </button>
                    )}
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

      {tab === 'settings' && <SettingsPanel onMessage={setMessage} />}
    </main>
  )
}
