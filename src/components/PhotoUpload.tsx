'use client'

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { AlertCircle, Camera, Loader2, Plus, X } from 'lucide-react'
import { useLang } from '@/components/LanguageProvider'
import {
  LEAD_PHOTO_MAX_DIMENSION,
  LEAD_PHOTO_TARGET_BYTES,
  MAX_LEAD_PHOTOS,
  MAX_LEAD_PHOTO_BYTES,
} from '@/lib/leadPhotos'

export type LeadPhoto = {
  id: string
  preview: string | null
  status: 'uploading' | 'done' | 'error'
  path: string | null
}

type Props = {
  photos: LeadPhoto[]
  setPhotos: Dispatch<SetStateAction<LeadPhoto[]>>
}

const isImage = (f: File) => f.type.startsWith('image/') || /\.(heic|heif|avif)$/i.test(f.name)

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

// Downscales and re-encodes as JPEG, lowering quality until it fits the target size.
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
  for (const quality of [0.82, 0.72, 0.62, 0.5]) {
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (blob && blob.size <= LEAD_PHOTO_TARGET_BYTES) return blob
  }
  if (!blob) throw new Error('Encoding failed')
  return blob
}

// Falls back to the original file (e.g. HEIC in browsers that can't decode it), as long as it is within the limit.
async function prepare(file: File): Promise<Blob> {
  const blob = await compressImage(file).catch(() => file)
  if (blob.size > MAX_LEAD_PHOTO_BYTES) throw new Error('too-large')
  return blob
}

type UploadSlot = { path: string; url: string }

async function requestSlots(count: number) {
  const res = await fetch('/api/leads/photos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count }),
  })
  if (!res.ok) throw new Error(`slots ${res.status}`)
  const data = (await res.json()) as { slots: UploadSlot[] }
  return data.slots
}

// Plain PUT to the one-time signed URL; no Supabase client (and no auth session) needed in the browser.
async function uploadToSlot(slot: UploadSlot, blob: Blob) {
  const res = await fetch(slot.url, {
    method: 'PUT',
    headers: { 'Content-Type': blob.type || 'image/jpeg', 'x-upsert': 'false' },
    body: blob,
  })
  if (!res.ok) throw new Error(`upload ${res.status}`)
}

export default function PhotoUpload({ photos, setPhotos }: Props) {
  const { t } = useLang()
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const photosRef = useRef(photos)

  useEffect(() => {
    photosRef.current = photos
  }, [photos])

  useEffect(
    () => () => photosRef.current.forEach((p) => p.preview && URL.revokeObjectURL(p.preview)),
    [],
  )

  const limitReached = photos.length >= MAX_LEAD_PHOTOS
  const limitText = t('Max. 20 Fotos erreicht', 'تم الوصول إلى الحد الأقصى: 20 صورة', 'Max. 20 photos reached')

  const patch = (id: string, changes: Partial<LeadPhoto>) =>
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, ...changes } : p)))

  async function handleFiles(list: FileList | null) {
    const picked = Array.from(list ?? []).filter(isImage)
    if (inputRef.current) inputRef.current.value = ''
    if (picked.length === 0) return

    const room = MAX_LEAD_PHOTOS - photosRef.current.length
    const files = picked.slice(0, Math.max(room, 0))
    setError(picked.length > files.length ? limitText : '')
    if (files.length === 0) return

    const added: LeadPhoto[] = files.map(() => ({ id: crypto.randomUUID(), preview: null, status: 'uploading', path: null }))
    setPhotos((prev) => [...prev, ...added])

    let slots: UploadSlot[]
    try {
      slots = await requestSlots(files.length)
    } catch {
      added.forEach((p) => patch(p.id, { status: 'error' }))
      setError(t('Upload gerade nicht möglich. Bitte später erneut versuchen.', 'الرفع غير ممكن حالياً. حاول لاحقاً.', 'Upload not possible right now. Please try again later.'))
      return
    }

    let tooLarge = false
    let failed = false
    for (let i = 0; i < files.length; i++) {
      const photo = added[i]
      const slot = slots[i]
      try {
        if (!slot) throw new Error('no-slot')
        const blob = await prepare(files[i])
        const preview = URL.createObjectURL(blob)
        try {
          await uploadToSlot(slot, blob)
        } catch (uploadError) {
          URL.revokeObjectURL(preview)
          throw uploadError
        }
        setPhotos((prev) => {
          if (!prev.some((p) => p.id === photo.id)) URL.revokeObjectURL(preview)
          return prev.map((p) => (p.id === photo.id ? { ...p, preview, status: 'done', path: slot.path } : p))
        })
      } catch (err) {
        if (err instanceof Error && err.message === 'too-large') tooLarge = true
        else failed = true
        patch(photo.id, { status: 'error' })
      }
    }

    if (tooLarge) {
      setError(t('Ein Foto ist größer als 10 MB und wurde nicht hochgeladen.', 'صورة أكبر من 10 ميغابايت ولم يتم رفعها.', 'A photo is larger than 10 MB and was not uploaded.'))
    } else if (failed) {
      setError(t('Ein Foto konnte nicht hochgeladen werden. Bitte erneut versuchen.', 'تعذر رفع صورة. حاول مرة أخرى.', 'A photo could not be uploaded. Please try again.'))
    }
  }

  function remove(id: string) {
    setError('')
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === id)
      if (photo?.preview) URL.revokeObjectURL(photo.preview)
      return prev.filter((p) => p.id !== id)
    })
  }

  return (
    <div className="rounded-xl border-2 border-dashed border-primary/25 bg-background/40 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <Camera aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-primary/70" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary">
            {t(
              'Fotos hinzufügen - optional, so viele wie du möchtest',
              'إضافة صور - اختياري، بالعدد الذي تريده',
              'Add photos - optional, as many as you like',
            )}
          </p>
          <p className="mt-1 text-xs text-primary/60">
            {t(
              'Du entscheidest, wie viele Fotos du hochladen willst. 1 Foto reicht, mehr Fotos helfen für einen genaueren Festpreis.',
              'أنت تقرر عدد الصور التي تريد رفعها. صورة واحدة تكفي، والمزيد من الصور يساعد على سعر ثابت أدق.',
              'You decide how many photos to upload. 1 photo is enough, more photos help with a more accurate fixed price.',
            )}
          </p>
          <p className="mt-1 text-xs text-primary/50">
            {t(
              'Privat, nicht veröffentlicht, nach 30 Tagen automatisch gelöscht.',
              'خاصة، لا تُنشر، وتُحذف تلقائياً بعد 30 يوماً.',
              'Private, never published, automatically deleted after 30 days.',
            )}
          </p>
        </div>
      </div>

      {photos.length > 0 && (
        <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {photos.map((p, i) => (
            <li
              key={p.id}
              className={`relative aspect-square overflow-hidden rounded-lg bg-card ring-1 ${
                p.status === 'error' ? 'ring-danger' : 'ring-primary/10'
              }`}
            >
              {p.preview && (
                // eslint-disable-next-line @next/next/no-img-element -- local blob preview
                <img
                  src={p.preview}
                  alt={t(`Foto ${i + 1}`, `صورة ${i + 1}`, `Photo ${i + 1}`)}
                  className={`h-full w-full object-cover ${p.status === 'uploading' ? 'opacity-50' : ''}`}
                />
              )}
              {p.status === 'uploading' && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" aria-label={t('Wird hochgeladen', 'جارٍ الرفع', 'Uploading')} />
                </span>
              )}
              {p.status === 'error' && (
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-1 text-center text-[11px] font-medium text-danger">
                  <AlertCircle className="h-5 w-5" aria-hidden="true" />
                  {t('Fehler', 'خطأ', 'Error')}
                </span>
              )}
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
        </ul>
      )}

      {limitReached ? (
        <p className="mt-4 text-center text-sm font-medium text-primary/70">{limitText}</p>
      ) : (
        <label className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-primary/20 bg-card px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5 focus-within:ring-2 focus-within:ring-primary/20">
          <Plus className="h-4 w-4" aria-hidden="true" />
          {photos.length === 0
            ? t('Fotos hinzufügen', 'إضافة صور', 'Add photos')
            : t('Weitere Fotos hinzufügen', 'إضافة المزيد من الصور', 'Add more photos')}
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.heic,.heif"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            className="sr-only"
          />
        </label>
      )}

      {error && !(limitReached && error === limitText) && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
