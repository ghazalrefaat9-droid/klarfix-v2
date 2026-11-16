'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { callApi } from '@/lib/apiClient'
import MediaPreview from '@/components/MediaPreview'
import {
  MAX_MEDIA_BYTES,
  MAX_PHOTOS,
  MAX_VIDEOS,
  MAX_VIDEO_SECONDS,
  PHOTO_TYPES,
  VIDEO_TYPES,
  type MediaItem,
  type MediaKind,
} from '@/lib/mediaRules'

const STATUS_STYLE = {
  pending: { label: 'Ausstehend / Wartet auf Freigabe', className: 'bg-[#FEF3C7] text-[#92400E]' },
  approved: { label: 'Freigegeben', className: 'bg-[#DCFCE7] text-[#166534]' },
  rejected: { label: 'Abgelehnt', className: 'bg-[#FEE2E2] text-[#991B1B]' },
} as const

function videoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve(video.duration)
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('unreadable'))
    }
    video.src = url
  })
}

export default function PartnerMedia() {
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const videoInput = useRef<HTMLInputElement>(null)
  const photoInput = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const res = await callApi<{ media: MediaItem[] }>('partner', '/api/partner/media')
    if (res.ok) setItems(res.data?.media ?? [])
    else setError(res.data?.error ?? 'Medien konnten nicht geladen werden.')
    setLoading(false)
  }, [])

  useEffect(() => {
    const id = setTimeout(() => void load(), 0)
    return () => clearTimeout(id)
  }, [load])

  const used = (kind: MediaKind) => items.filter((i) => i.kind === kind && i.status !== 'rejected').length

  async function upload(file: File, kind: MediaKind) {
    setError('')
    if (!(kind === 'video' ? VIDEO_TYPES : PHOTO_TYPES).includes(file.type)) {
      setError(kind === 'video' ? 'Nur MP4-, MOV- oder WebM-Videos erlaubt.' : 'Nur JPG-, PNG- oder WebP-Fotos erlaubt.')
      return
    }
    if (file.size > MAX_MEDIA_BYTES) {
      setError('Datei ist größer als 20 MB.')
      return
    }
    setBusy(true)
    try {
      let duration: number | null = null
      if (kind === 'video') {
        duration = await videoDuration(file).catch(() => NaN)
        if (!Number.isFinite(duration) || duration > MAX_VIDEO_SECONDS) {
          setError(`Video darf maximal ${MAX_VIDEO_SECONDS} Sekunden lang sein.`)
          return
        }
      }
      const slot = await callApi<{ id: string; url: string }>('partner', '/api/partner/media', 'POST', {
        kind,
        mime: file.type,
        size: file.size,
        duration,
      })
      if (!slot.ok || !slot.data) {
        setError(slot.data?.error ?? 'Upload gerade nicht möglich.')
        return
      }
      const put = await fetch(slot.data.url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type, 'x-upsert': 'false' },
        body: file,
      }).catch(() => null)
      if (!put?.ok) {
        await callApi('partner', `/api/partner/media?id=${slot.data.id}`, 'DELETE')
        setError('Upload fehlgeschlagen. Bitte erneut versuchen.')
        return
      }
      await load()
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Dieses Medium wirklich löschen?')) return
    const res = await callApi('partner', `/api/partner/media?id=${id}`, 'DELETE')
    if (!res.ok) setError(res.data?.error ?? 'Löschen fehlgeschlagen.')
    else setItems((prev) => prev.filter((i) => i.id !== id))
  }

  function pick(e: React.ChangeEvent<HTMLInputElement>, kind: MediaKind) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) void upload(file, kind)
  }

  const canVideo = confirmed && !busy && used('video') < MAX_VIDEOS
  const canPhoto = confirmed && !busy && used('photo') < MAX_PHOTOS
  const buttonClass = 'min-h-[44px] rounded-lg bg-primary px-4 text-sm font-semibold text-card hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <section className="space-y-5">
      <h2 className="text-lg font-bold">Video & Fotos hochladen</h2>

      <div className="rounded-xl bg-card p-5 shadow-sm">
        <ul className="list-disc space-y-1 ps-5 text-sm text-primary/80">
          <li>
            Bis zu {MAX_VIDEOS} Videos (max. {MAX_VIDEO_SECONDS} Sekunden, max. 20 MB) und {MAX_PHOTOS} Fotos (Vorher/Nachher).
          </li>
          <li>Kein Logo, kein Firmenname, keine Telefonnummer und kein Social-Media-Link im Bild oder Ton.</li>
          <li>Jedes Medium wird von KlarFix geprüft. Erst nach Freigabe ist es für Kunden sichtbar.</li>
        </ul>

        <label className="mt-4 flex items-start gap-2 text-sm">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1 h-4 w-4 shrink-0" />
          <span>Ich bestätige: Es sind kein Logo, Firmenname, keine Telefonnummer und kein Social-Link zu sehen.</span>
        </label>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button type="button" disabled={!canVideo} onClick={() => videoInput.current?.click()} className={buttonClass}>
            🎥 Video hochladen ({used('video')}/{MAX_VIDEOS})
          </button>
          <button type="button" disabled={!canPhoto} onClick={() => photoInput.current?.click()} className={buttonClass}>
            📷 Foto hochladen ({used('photo')}/{MAX_PHOTOS})
          </button>
        </div>
        <input ref={videoInput} type="file" accept={VIDEO_TYPES.join(',')} className="hidden" onChange={(e) => pick(e, 'video')} />
        <input ref={photoInput} type="file" accept={PHOTO_TYPES.join(',')} className="hidden" onChange={(e) => pick(e, 'photo')} />
        {busy && <p className="mt-3 text-sm text-primary/70">Wird hochgeladen…</p>}
        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
      </div>

      {loading ? (
        <p className="text-primary/70">Lade…</p>
      ) : items.length === 0 ? (
        <p className="rounded-xl bg-card p-8 text-center text-primary/70 shadow-sm">Noch keine Medien hochgeladen.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => {
            const status = STATUS_STYLE[item.status]
            return (
              <article key={item.id} className="min-w-0 rounded-xl bg-card p-3 shadow-sm">
                <MediaPreview kind={item.kind} url={item.url} />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span>
                  <button type="button" onClick={() => remove(item.id)} className="min-h-[36px] text-sm text-danger underline">
                    Löschen
                  </button>
                </div>
                <p className="mt-1 text-xs text-primary/60">
                  {item.kind === 'video' ? 'Video' : 'Foto'} · {new Date(item.created_at).toLocaleDateString('de-DE')}
                </p>
                {item.status === 'rejected' && item.rejection_reason && (
                  <p className="mt-2 break-words rounded-lg bg-[#FEE2E2] px-3 py-2 text-sm text-[#991B1B]">Grund: {item.rejection_reason}</p>
                )}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
