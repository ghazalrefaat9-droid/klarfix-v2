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
  pending_review: 'bg-background text-primary ring-1 ring-primary/30',
  accepted: 'bg-primary text-card',
  rejected: 'bg-card text-primary/60 ring-1 ring-primary/15',
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

  if (loading) return <p className="text-primary/70">Lade…</p>

  return (
    <div className="space-y-4">
      {message && <p className="rounded-lg bg-primary/5 p-3 text-sm text-primary">{message}</p>}
      {rows.length === 0 && !message && <p className="text-primary/70">Keine Anträge vorhanden.</p>}

      {rows.map((a) => (
        <article key={a.id} className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-primary/10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-primary">{a.full_name}</h2>
              <p className="text-sm text-primary/70">{new Date(a.created_at).toLocaleString('de-DE')}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[a.status] ?? 'bg-primary/5 text-primary'}`}>
              {STATUS_LABEL[a.status] ?? a.status}
            </span>
          </div>

          <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            <div><dt className="inline text-primary/70">E-Mail: </dt><dd className="inline">{a.email}</dd></div>
            <div><dt className="inline text-primary/70">Festnetz: </dt><dd className="inline">{a.phone_fixed}</dd></div>
            <div><dt className="inline text-primary/70">WhatsApp: </dt><dd className="inline">{a.phone_whatsapp || '–'}</dd></div>
            <div><dt className="inline text-primary/70">Adresse: </dt><dd className="inline">{a.company_address}, {a.city}</dd></div>
            <div><dt className="inline text-primary/70">Team: </dt><dd className="inline">{a.team_size}</dd></div>
            <div><dt className="inline text-primary/70">Radius: </dt><dd className="inline">{a.work_radius} km</dd></div>
            <div><dt className="inline text-primary/70">Sprachen: </dt><dd className="inline">{a.languages?.join(', ') || '–'}</dd></div>
            <div>
              <dt className="inline text-primary/70">Gewerbe / Haftpflicht: </dt>
              <dd className="inline">{a.has_gewerbe ? 'Ja' : 'Nein'} / {a.has_haftpflicht ? 'Ja' : 'Nein'}</dd>
            </div>
          </dl>

          <ul className="mt-3 flex flex-wrap gap-2">
            {a.services.map((s) => (
              <li key={s.key} className="rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
                {serviceLabel(s.key)} · {s.price} €
              </li>
            ))}
          </ul>

          {a.status === 'pending_review' && (
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setStatus(a.id, 'accepted')}
                className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-card hover:bg-primary-hover"
              >
                Annehmen
              </button>
              <button
                type="button"
                onClick={() => setStatus(a.id, 'rejected')}
                className="rounded-xl border border-primary/40 px-5 py-2 text-sm font-semibold text-primary hover:bg-primary/5"
              >
                Ablehnen
              </button>
            </div>
          )}

          {instructionsFor === a.id && (
            <p className="mt-4 rounded-xl border border-primary/20 bg-primary/10 p-3 text-sm text-primary">
              Jetzt Dokumente anfordern: Gewerbe + Haftpflicht per WhatsApp/Email (
              {a.phone_whatsapp ? `WhatsApp: ${a.phone_whatsapp}, ` : ''}E-Mail: {a.email}).
            </p>
          )}
        </article>
      ))}
    </div>
  )
}
