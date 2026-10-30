'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

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
  const [partner, setPartner] = useState<Partner | null>(null)
  const [verified, setVerified] = useState(false)
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const loadRequests = useCallback(async () => {
    const { data, error } = await supabase
      .from('requests')
      .select('id, customer_name, customer_email, customer_phone, postcode, service_type, area_sqm, message, status, created_at')
      .eq('status', 'new')
      .order('created_at', { ascending: false })

    if (error) {
      setMessage('Anfragen konnten nicht geladen werden.')
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
      setMessage('Auftrag konnte nicht angenommen werden (evtl. bereits vergeben).')
      await loadRequests()
      return
    }
    setMessage('Auftrag angenommen!')
    await loadRequests()
  }

  function logout() {
    localStorage.removeItem('partner')
    router.push('/partner/login')
  }

  if (loading) {
    return <main className="p-8 text-center text-gray-500">Lade…</main>
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F60C6]">Partner-Dashboard</h1>
          <p className="text-sm text-gray-600">Angemeldet als {partner?.company_name}</p>
        </div>
        <button onClick={logout} className="text-sm text-gray-600 underline hover:text-gray-900">
          Abmelden
        </button>
      </div>

      {message && <p className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-[#0F60C6]">{message}</p>}

      {!verified ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Ihr Konto wird noch geprüft</h2>
          <p className="mt-2 text-gray-600">
            Aufträge und Kundendaten sind erst sichtbar, wenn Ihr Partner-Profil von uns freigeschaltet wurde.
          </p>
          <button
            onClick={() => partner && checkAccess(partner)}
            className="mt-6 rounded-lg border border-[#0F60C6] px-5 py-2 font-medium text-[#0F60C6] hover:bg-blue-50"
          >
            Status neu prüfen
          </button>
        </div>
      ) : requests.length === 0 ? (
        <p className="rounded-xl bg-white p-8 text-center text-gray-500 shadow-sm">Keine neuen Anfragen.</p>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => (
            <div key={r.id} className="rounded-xl bg-white p-6 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">{r.service_type}</h2>
                <span className="text-sm text-gray-500">{new Date(r.created_at).toLocaleDateString('de-DE')}</span>
              </div>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-gray-500">Kunde</dt>
                  <dd>{r.customer_name || '–'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">E-Mail</dt>
                  <dd>{r.customer_email}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Telefon</dt>
                  <dd>{r.customer_phone || '–'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">PLZ</dt>
                  <dd>{r.postcode}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Fläche</dt>
                  <dd>{r.area_sqm ? `${r.area_sqm} m²` : '–'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-gray-500">Nachricht</dt>
                  <dd>{r.message || '–'}</dd>
                </div>
              </dl>
              <button
                onClick={() => acceptRequest(r.id)}
                disabled={busyId === r.id}
                className="mt-4 rounded-lg bg-[#0F60C6] px-5 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {busyId === r.id ? 'Wird angenommen…' : 'Auftrag annehmen'}
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
