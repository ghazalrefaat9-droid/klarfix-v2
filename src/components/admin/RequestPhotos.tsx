'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, ChevronLeft, ChevronRight, ExternalLink, X } from 'lucide-react'

// "Foto N: <signed url>" lines written by /api/leads into the request message.
const PHOTO_LINE = /^Foto \d+:\s*(https?:\/\/\S+)$/i

export function splitPhotos(message: string | null) {
  const photos: string[] = []
  const rest: string[] = []
  for (const line of (message ?? '').split('\n')) {
    const m = PHOTO_LINE.exec(line.trim())
    if (m) photos.push(m[1])
    else rest.push(line)
  }
  return { photos, text: rest.join('\n').trim() || null }
}

// Camera button with the photo count; opens a full-screen viewer that shows the photos one by one.
export default function RequestPhotos({ photos }: { photos: string[] }) {
  const [index, setIndex] = useState<number | null>(null)
  const touchX = useRef<number | null>(null)
  const count = photos.length
  const open = index !== null

  const go = (step: number) => setIndex((i) => (i === null ? i : (i + step + count) % count))

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setIndex(null)
      } else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- go only depends on count
  }, [open, count])

  if (count === 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-[#4B5563]">
        <Camera className="h-4 w-4" /> Keine Fotos
      </p>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIndex(0)}
        className="inline-flex items-center gap-2 rounded-full bg-[#1A4D2E] px-4 py-2 text-sm font-semibold text-[#FFFAF5] transition hover:bg-[#2D5A4C]"
      >
        <Camera className="h-4 w-4" />
        Fotos ansehen ({count})
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Foto ${index + 1} von ${count}`}
          className="fixed inset-0 z-[60] flex flex-col bg-[#0F2A1D]/95"
          onClick={(e) => {
            e.stopPropagation()
            setIndex(null)
          }}
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX.current === null) return
            const dx = e.changedTouches[0].clientX - touchX.current
            touchX.current = null
            if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
          }}
        >
          <div className="flex items-center justify-between gap-3 p-4 text-[#FFFAF5]" onClick={(e) => e.stopPropagation()}>
            <span className="text-sm font-semibold">
              Foto {index + 1} / {count}
            </span>
            <div className="flex items-center gap-1">
              <a
                href={photos[index]}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="In neuem Tab öffnen"
                className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10"
              >
                <ExternalLink className="h-5 w-5" />
              </a>
              <button
                type="button"
                onClick={() => setIndex(null)}
                aria-label="Schließen"
                className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6">
            {/* eslint-disable-next-line @next/next/no-img-element -- signed private storage URL */}
            <img
              key={photos[index]}
              src={photos[index]}
              alt={`Foto ${index + 1}`}
              onClick={(e) => e.stopPropagation()}
              className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
            />
            {count > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    go(-1)
                  }}
                  aria-label="Vorheriges Foto"
                  className="absolute left-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-[#FFFAF5] hover:bg-white/25 sm:left-4"
                >
                  <ChevronLeft className="h-7 w-7" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    go(1)
                  }}
                  aria-label="Nächstes Foto"
                  className="absolute right-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-[#FFFAF5] hover:bg-white/25 sm:right-4"
                >
                  <ChevronRight className="h-7 w-7" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
