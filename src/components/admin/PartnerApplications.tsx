'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { serviceLabel, type ApplicationRow } from '@/lib/applications'

const STATUS_LABEL: Record<string, string> = {
  pending_review: 'Offen',
  accepted: 'Angenommen',
  rejected: 'Abgelehnt',
}

const STATUS_STYLE: Record<string, string> = {
  pending_review: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
}

const COLUMNS =
  'id, full_name, email, phone_fixed, phone_whatsapp, city, company_address, services, team_size, languages, work_radius, has_gewerbe, has_haftpflicht, status, created_at'

export default function PartnerApplications() {
  const [rows, setRows] = useState<ApplicationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [instructionsFor, setInstructionsFor] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('partner_applications')
      .select(COLUMNS)
      .order('created_at', { ascending: false })
    if (error) {
      setMessage('Anträge konnten nicht geladen werden. Wurde die Tabelle partner_applications angelegt?')
      setRows([])
    } else {
      setRows((data as ApplicationRow[]) ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const init = async () => {
      await load()
    }
    init()
  }, [load])

  async function setStatus(id: string, status: 'accepted' | 'rejected') {
    setMessage('')
    const { error } = await supabase.from('partner_applications').update({ status }).eq('id', id)
    if (error) {
      setMessage('Status konnte nicht geändert werden.')
      return
    }
    setInstructionsFor(status === 'accepted' ? id : null)
    await load()
  }

  if (loading) return <p className="text-gray-500">Lade…</p>

  return (
    <div className="space-y-4">
      {message && <p className="rounded-lg bg-blue-50 p-3 text-sm text-[#0F60C6]">{message}</p>}
      {rows.length === 0 && !message && <p className="text-gray-500">Keine Anträge vorhanden.</p>}

      {rows.map((a) => (
        <article key={a.id} className="rounded-2xl bg-white p-5 shadow">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{a.full_name}</h2>
              <p className="text-sm text-gray-500">{new Date(a.created_at).toLocaleString('de-DE')}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[a.status] ?? 'bg-gray-100 text-gray-700'}`}>
              {STATUS_LABEL[a.status] ?? a.status}
            </span>
          </div>

          <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            <div><dt className="inline text-gray-500">E-Mail: </dt><dd className="inline">{a.email}</dd></div>
            <div><dt className="inline text-gray-500">Festnetz: </dt><dd className="inline">{a.phone_fixed}</dd></div>
            <div><dt className="inline text-gray-500">WhatsApp: </dt><dd className="inline">{a.phone_whatsapp || '–'}</dd></div>
            <div><dt className="inline text-gray-500">Adresse: </dt><dd className="inline">{a.company_address}, {a.city}</dd></div>
            <div><dt className="inline text-gray-500">Team: </dt><dd className="inline">{a.team_size}</dd></div>
            <div><dt className="inline text-gray-500">Radius: </dt><dd className="inline">{a.work_radius} km</dd></div>
            <div><dt className="inline text-gray-500">Sprachen: </dt><dd className="inline">{a.languages?.join(', ') || '–'}</dd></div>
            <div>
              <dt className="inline text-gray-500">Gewerbe / Haftpflicht: </dt>
              <dd className="inline">{a.has_gewerbe ? 'Ja' : 'Nein'} / {a.has_haftpflicht ? 'Ja' : 'Nein'}</dd>
            </div>
          </dl>

          <ul className="mt-3 flex flex-wrap gap-2">
            {a.services.map((s) => (
              <li key={s.key} className="rounded-full bg-[#14B8A6]/15 px-3 py-1 text-xs font-medium text-[#0f8f80]">
                {serviceLabel(s.key)} · {s.price} €
              </li>
            ))}
          </ul>

          {a.status === 'pending_review' && (
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setStatus(a.id, 'accepted')}
                className="rounded-xl bg-[#14B8A6] px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Annehmen
              </button>
              <button
                type="button"
                onClick={() => setStatus(a.id, 'rejected')}
                className="rounded-xl border border-red-300 px-5 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
              >
                Ablehnen
              </button>
            </div>
          )}

          {instructionsFor === a.id && (
            <p className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-900">
              Jetzt Dokumente anfordern: Gewerbe + Haftpflicht per WhatsApp/Email (
              {a.phone_whatsapp ? `WhatsApp: ${a.phone_whatsapp}, ` : ''}E-Mail: {a.email}).
            </p>
          )}
        </article>
      ))}
    </div>
  )
}
