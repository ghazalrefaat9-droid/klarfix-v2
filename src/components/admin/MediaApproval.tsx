'use client'

import { useCallback, useEffect, useState } from 'react'
import { callApi } from '@/lib/apiClient'
import MediaPreview from '@/components/MediaPreview'
import { REJECT_PRESETS, type AdminMediaItem } from '@/lib/mediaRules'

// Pending media of all partners. Nothing here is public until "Freigeben" is clicked.
export default function MediaApproval({ onChanged }: { onChanged: () => void }) {
  const [items, setItems] = useState<AdminMediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await callApi<{ media: AdminMediaItem[] }>('admin', '/api/admin/media?status=pending')
    if (res.ok) setItems(res.data?.media ?? [])
    else setError(res.data?.error ?? 'Medien konnten nicht geladen werden.')
    setLoading(false)
  }, [])

  useEffect(() => {
    const id = setTimeout(() => void load(), 0)
    return () => clearTimeout(id)
  }, [load])

  async function run(id: string, request: () => ReturnType<typeof callApi>) {
    setBusyId(id)
    setError('')
    const res = await request()
    setBusyId(null)
    if (!res.ok) {
      setError(res.data?.error ?? 'Aktion fehlgeschlagen.')
      return
    }
    setItems((prev) => prev.filter((i) => i.id !== id))
    setRejecting(null)
    setReason('')
    onChanged()
  }

  const approve = (id: string) => run(id, () => callApi('admin', '/api/admin/media', 'PATCH', { id, action: 'approve' }))
  const reject = (id: string) => run(id, () => callApi('admin', '/api/admin/media', 'PATCH', { id, action: 'reject', reason }))
  const remove = (id: string) => {
    if (window.confirm('Dieses Medium endgültig löschen?')) void run(id, () => callApi('admin', `/api/admin/media?id=${id}`, 'DELETE'))
  }

  if (loading) return <p className="text-center text-[#4B5563]">Lade…</p>

  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="rounded-xl bg-[#FEE2E2] px-3 py-2 text-sm text-[#991B1B]">
          {error}
        </p>
      )}
      {items.length === 0 ? (
        <p className="rounded-[20px] bg-[#FFFFFF] px-6 py-12 text-center font-semibold text-[#1A4D2E] shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
          Keine Medien warten auf Freigabe.
        </p>
      ) : (
        items.map((item) => (
          <article key={item.id} className="min-w-0 rounded-[20px] bg-[#FFFFFF] p-4 shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <p className="min-w-0 break-words font-bold text-[#1B4332]">{item.partner_name}</p>
              <p className="text-xs text-[#4B5563]">
                {item.kind === 'video' ? 'Video' : 'Foto'} · {new Date(item.created_at).toLocaleString('de-DE')}
              </p>
            </div>
            <MediaPreview kind={item.kind} url={item.url} className="max-w-xl" />

            {rejecting === item.id ? (
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap gap-2">
                  {REJECT_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setReason(p)}
                      className="min-h-[36px] rounded-full border border-[#1B4332]/20 px-3 text-xs font-medium text-[#1B4332] hover:bg-[#F5F5F0]"
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={300}
                  placeholder="Grund der Ablehnung (Pflicht)"
                  className="w-full rounded-lg border border-[#1B4332]/20 px-3 py-2 text-sm"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!reason.trim() || busyId === item.id}
                    onClick={() => reject(item.id)}
                    className="min-h-[44px] rounded-lg bg-[#E85D5D] px-4 text-sm font-semibold text-[#FFFFFF] disabled:opacity-40"
                  >
                    Ablehnen bestätigen
                  </button>
                  <button type="button" onClick={() => setRejecting(null)} className="min-h-[44px] px-3 text-sm text-[#4B5563] underline">
                    Abbrechen
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() => approve(item.id)}
                  className="min-h-[44px] rounded-lg bg-[#1A4D2E] px-4 text-sm font-semibold text-[#FFFFFF] disabled:opacity-40"
                >
                  Freigeben
                </button>
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() => {
                    setRejecting(item.id)
                    setReason('')
                  }}
                  className="min-h-[44px] rounded-lg border border-[#E85D5D] px-4 text-sm font-semibold text-[#E85D5D] disabled:opacity-40"
                >
                  Ablehnen
                </button>
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() => remove(item.id)}
                  className="min-h-[44px] px-3 text-sm text-[#4B5563] underline disabled:opacity-40"
                >
                  Löschen
                </button>
              </div>
            )}
          </article>
        ))
      )}
    </div>
  )
}
