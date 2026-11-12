'use client'

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { Camera, Loader2, X } from 'lucide-react'
import { useLang } from '@/components/LanguageProvider'
import { LEAD_PHOTO_MAX_DIMENSION, MAX_LEAD_PHOTOS, MAX_LEAD_PHOTO_BYTES } from '@/lib/leadPhotos'

export type LeadPhoto = { id: string; blob: Blob; preview: string }

type Props = {
  photos: LeadPhoto[]
  setPhotos: Dispatch<SetStateAction<LeadPhoto[]>>
  onBusyChange?: (busy: boolean) => void
}

async function decode(file: File): Promise<CanvasImageSource & { width: number; height: number }> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.src = url
      await img.decode()
      return img
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}

// Downscales to max 1600px and re-encodes as JPEG, lowering quality until it fits the size limit.
async function compressImage(file: File): Promise<Blob> {
  const image = await decode(file)
  const scale = Math.min(1, LEAD_PHOTO_MAX_DIMENSION / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(image.width * scale)
  canvas.height = Math.round(image.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
  if ('close' in image && typeof image.close === 'function') image.close()

  let blob: Blob | null = null
  for (const quality of [0.8, 0.7, 0.6, 0.5, 0.4]) {
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (blob && blob.size <= MAX_LEAD_PHOTO_BYTES) return blob
  }
  throw new Error('Image too large')
}

export default function PhotoUpload({ photos, setPhotos, onBusyChange }: Props) {
  const { t } = useLang()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const photosRef = useRef(photos)

  useEffect(() => {
    photosRef.current = photos
  }, [photos])

  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.preview)), [])

  const remaining = MAX_LEAD_PHOTOS - photos.length

  async function handleFiles(list: FileList | null) {
    const files = Array.from(list ?? []).filter((f) => f.type.startsWith('image/') || f.type === '')
    if (inputRef.current) inputRef.current.value = ''
    if (files.length === 0) return

    setError('')
    if (files.length > remaining) {
      setError(t(`Maximal ${MAX_LEAD_PHOTOS} Fotos möglich.`, `الحد الأقصى ${MAX_LEAD_PHOTOS} صور.`, `Maximum ${MAX_LEAD_PHOTOS} photos.`))
    }

    setBusy(true)
    onBusyChange?.(true)
    let failed = false
    for (const file of files.slice(0, Math.max(remaining, 0))) {
      try {
        const blob = await compressImage(file)
        const photo = { id: crypto.randomUUID(), blob, preview: URL.createObjectURL(blob) }
        setPhotos((prev) => {
          if (prev.length >= MAX_LEAD_PHOTOS) {
            URL.revokeObjectURL(photo.preview)
            return prev
          }
          return [...prev, photo]
        })
      } catch {
        failed = true
      }
    }
    if (failed) {
      setError(
        t(
          'Ein Foto konnte nicht verarbeitet werden. Bitte JPG oder PNG verwenden.',
          'تعذرت معالجة صورة. يرجى استخدام JPG أو PNG.',
          'A photo could not be processed. Please use JPG or PNG.',
        ),
      )
    }
    setBusy(false)
    onBusyChange?.(false)
  }

  function remove(id: string) {
    setError('')
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === id)
      if (photo) URL.revokeObjectURL(photo.preview)
      return prev.filter((p) => p.id !== id)
    })
  }

  return (
    <div className="rounded-xl border-2 border-dashed border-primary/25 bg-background/40 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <Camera aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-primary/70" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary">
            {t('Fotos hinzufügen - optional', 'إضافة صور - اختياري', 'Add photos - optional')}
          </p>
          <p className="mt-1 text-xs text-primary/60">
            {t(
              '1-3 Fotos für genaueren Festpreis. Ihre Fotos sind privat, werden nicht veröffentlicht und nach 30 Tagen automatisch gelöscht.',
              '1-3 صور لسعر ثابت أدق. صورك خاصة، لن تُنشر وتُحذف تلقائياً بعد 30 يوماً.',
              '1-3 photos for a more accurate fixed price. Your photos are private, never published and automatically deleted after 30 days.',
            )}
          </p>
        </div>
      </div>

      {(photos.length > 0 || busy) && (
        <ul className="mt-4 grid grid-cols-3 gap-3">
          {photos.map((p, i) => (
            <li key={p.id} className="relative aspect-square overflow-hidden rounded-lg bg-card ring-1 ring-primary/10">
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
              <img src={p.preview} alt={t(`Foto ${i + 1}`, `صورة ${i + 1}`, `Photo ${i + 1}`)} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => remove(p.id)}
                aria-label={t(`Foto ${i + 1} entfernen`, `حذف الصورة ${i + 1}`, `Remove photo ${i + 1}`)}
                className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary/80 text-card hover:bg-primary"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
          {busy && (
            <li className="flex aspect-square items-center justify-center rounded-lg bg-card ring-1 ring-primary/10">
              <Loader2 className="h-5 w-5 animate-spin text-primary" aria-label={t('Wird verarbeitet', 'جارٍ المعالجة', 'Processing')} />
            </li>
          )}
        </ul>
      )}

      {remaining > 0 && (
        <label
          className={`mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-primary/20 bg-card px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5 focus-within:ring-2 focus-within:ring-primary/20 ${
            busy ? 'pointer-events-none opacity-60' : ''
          }`}
        >
          <Camera className="h-4 w-4" aria-hidden="true" />
          {photos.length === 0
            ? t('Foto aufnehmen oder auswählen', 'التقاط صورة أو اختيارها', 'Take or choose a photo')
            : t(`Weiteres Foto hinzufügen (${photos.length}/${MAX_LEAD_PHOTOS})`, `إضافة صورة أخرى (${photos.length}/${MAX_LEAD_PHOTOS})`, `Add another photo (${photos.length}/${MAX_LEAD_PHOTOS})`)}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            disabled={busy}
            onChange={(e) => handleFiles(e.target.files)}
            className="sr-only"
          />
        </label>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
