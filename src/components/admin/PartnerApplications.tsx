'use client'

import { useCallback, useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { callApi } from '@/lib/apiClient'
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

type Row = ApplicationRow & { setup_completed_at: string | null }
type SetupLink = { id: string; url: string; emailSent: boolean }

const whatsappLink = (phone: string, text: string) =>
  `https://wa.me/${phone.replace(/\D/g, '').replace(/^0/, '49')}?text=${encodeURIComponent(text)}`

export default function PartnerApplications() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [setupLink, setSetupLink] = useState<SetupLink | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await callApi<{ applications: Row[] }>('admin', '/api/admin/applications')
    if (!res.ok) {
      setMessage(res.data?.error ?? 'Anträge konnten nicht geladen werden.')
      setRows([])
    } else {
      setRows(res.data?.applications ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const init = async () => {
      await load()
    }
    init()
  }, [load])

  async function reject(id: string) {
    setMessage('')
    const res = await callApi('admin', `/api/admin/applications/${id}`, 'PATCH', { status: 'rejected' })
    if (!res.ok) {
      setMessage(res.data?.error ?? 'Status konnte nicht geändert werden.')
      return
    }
    await load()
  }

  // Accepting (or re-sending) creates a new one-time /partner/setup link; older links stop working.
  async function accept(id: string) {
    setMessage('')
    setBusyId(id)
    const { ok, data } = await callApi<{ setupUrl?: string; emailSent?: boolean }>('admin', '/api/admin/accept-application', 'POST', {
      applicationId: id,
    })
    setBusyId(null)
    if (!ok || !data?.setupUrl) {
      setMessage(data?.error ?? 'Antrag konnte nicht angenommen werden.')
      return
    }
    setSetupLink({ id, url: data.setupUrl, emailSent: !!data.emailSent })
    await load()
  }

  async function remove(a: Row) {
    const warning = a.setup_completed_at
      ? `Antrag von ${a.full_name} endgültig löschen?\n\nAchtung: Das zugehörige Partnerkonto wird ebenfalls gelöscht. Die Person kann danach einen neuen Antrag stellen.`
      : `Antrag von ${a.full_name} endgültig löschen?\n\nDie Person kann danach einen neuen Antrag stellen.`
    if (!window.confirm(warning)) return
    setMessage('')
    setBusyId(a.id)
    const res = await callApi('admin', `/api/admin/applications/${a.id}`, 'DELETE')
    setBusyId(null)
    if (!res.ok) {
      setMessage(res.data?.error ?? 'Antrag konnte nicht gelöscht werden.')
      return
    }
    if (setupLink?.id === a.id) setSetupLink(null)
    setRows((prev) => prev.filter((r) => r.id !== a.id))
    setMessage(`Antrag von ${a.full_name} wurde gelöscht.`)
  }

  async function copyLink(url: string) {
    await navigator.clipboard.writeText(url).catch(() => null)
    setMessage('Setup-Link kopiert.')
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
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[a.status] ?? 'bg-primary/5 text-primary'}`}>
                {STATUS_LABEL[a.status] ?? a.status}
              </span>
              <button
                type="button"
                onClick={() => remove(a)}
                disabled={busyId === a.id}
                aria-label={`Antrag von ${a.full_name} löschen`}
                title="Endgültig löschen"
                className="flex h-8 w-8 items-center justify-center rounded-full text-red-600 ring-1 ring-red-600/30 hover:bg-red-50 disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
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
                onClick={() => accept(a.id)}
                disabled={busyId === a.id}
                className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-card hover:bg-primary-hover disabled:opacity-60"
              >
                Annehmen
              </button>
              <button
                type="button"
                onClick={() => reject(a.id)}
                className="rounded-xl border border-primary/40 px-5 py-2 text-sm font-semibold text-primary hover:bg-primary/5"
              >
                Ablehnen
              </button>
            </div>
          )}

          {a.status === 'accepted' && a.setup_completed_at && (
            <p className="mt-4 text-sm font-medium text-primary">
              ✅ Konto eingerichtet am {new Date(a.setup_completed_at).toLocaleString('de-DE')} – Dokumente im Dashboard unter „Partner“ prüfen.
            </p>
          )}

          {a.status === 'accepted' && !a.setup_completed_at && setupLink?.id !== a.id && (
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-primary/75">
              <span>Wartet auf Konto-Einrichtung.</span>
              <button
                type="button"
                onClick={() => accept(a.id)}
                disabled={busyId === a.id}
                className="rounded-xl border border-primary/40 px-4 py-1.5 font-semibold text-primary hover:bg-primary/5 disabled:opacity-60"
              >
                Setup-Link erneut senden
              </button>
            </div>
          )}

          {setupLink?.id === a.id && (
            <div className="mt-4 space-y-3 rounded-xl border border-primary/20 bg-primary/10 p-3 text-sm text-primary">
              <p>
                {setupLink.emailSent
                  ? `Setup-Link wurde per E-Mail an ${a.email} gesendet.`
                  : 'E-Mail konnte nicht gesendet werden – bitte den Link manuell schicken.'}{' '}
                Der Partner lädt dort Passwort, Gewerbenachweis und Haftpflicht hoch.
              </p>
              <p className="break-all rounded-lg bg-card px-3 py-2 font-mono text-xs">{setupLink.url}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => copyLink(setupLink.url)}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-card hover:bg-primary-hover"
                >
                  Link kopieren
                </button>
                {a.phone_whatsapp && (
                  <a
                    href={whatsappLink(
                      a.phone_whatsapp,
                      `Hallo ${a.full_name}, Ihr Partnerantrag wurde angenommen! Bitte richten Sie Ihr Konto hier ein: ${setupLink.url}`,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary hover:bg-card"
                  >
                    Per WhatsApp senden
                  </a>
                )}
              </div>
            </div>
          )}
        </article>
      ))}
    </div>
  )
}
