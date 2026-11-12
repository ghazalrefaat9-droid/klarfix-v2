import { randomUUID } from 'crypto'
import { supabase } from '@/lib/supabaseServer'
import {
  LEAD_PHOTOS_BUCKET,
  LEAD_PHOTO_RETENTION_DAYS,
  LEAD_PHOTO_TYPES,
  MAX_LEAD_PHOTOS,
  MAX_LEAD_PHOTO_BYTES,
} from '@/lib/leadPhotos'

const DAY_MS = 24 * 60 * 60 * 1000
const RETENTION_SECONDS = LEAD_PHOTO_RETENTION_DAYS * 24 * 60 * 60

// Photos live in one folder per upload day (YYYY-MM-DD/<uuid>), so expired ones can be removed folder by folder.
const dayKey = (date: Date) => date.toISOString().slice(0, 10)
const PHOTO_PATH = /^\d{4}-\d{2}-\d{2}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const bucket = () => supabase.storage.from(LEAD_PHOTOS_BUCKET)

async function ensureBucket() {
  const { error } = await supabase.storage.createBucket(LEAD_PHOTOS_BUCKET, {
    public: false,
    fileSizeLimit: MAX_LEAD_PHOTO_BYTES,
    allowedMimeTypes: LEAD_PHOTO_TYPES,
  })
  if (error && !/already exists/i.test(error.message)) console.error('Lead photo bucket:', error.message)
}

// One-time upload URLs; the browser uploads the files itself (see PhotoUpload.tsx).
export async function createPhotoUploadSlots(count: number) {
  const folder = dayKey(new Date())
  const slots: { path: string; url: string }[] = []
  let bucketChecked = false
  for (let i = 0; i < Math.min(count, MAX_LEAD_PHOTOS); i++) {
    const path = `${folder}/${randomUUID()}`
    let { data, error } = await bucket().createSignedUploadUrl(path)
    if (error && !bucketChecked && /not found/i.test(error.message)) {
      bucketChecked = true
      await ensureBucket()
      ;({ data, error } = await bucket().createSignedUploadUrl(path))
    }
    if (error || !data) throw new Error(error?.message ?? 'No upload URL')
    slots.push({ path: data.path, url: data.signedUrl })
  }
  return slots
}

export function cleanPhotoPaths(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const paths = value.filter((p): p is string => typeof p === 'string' && PHOTO_PATH.test(p))
  return [...new Set(paths)].slice(0, MAX_LEAD_PHOTOS)
}

// Signed links that expire together with the photos. Paths of files that were never uploaded are dropped.
export async function signLeadPhotos(paths: string[]): Promise<{ path: string; url: string }[]> {
  if (paths.length === 0) return []
  const { data, error } = await bucket().createSignedUrls(paths, RETENTION_SECONDS)
  if (error) {
    console.error('Lead photo signed URLs failed:', error.message)
    return []
  }
  return (data ?? []).flatMap((d) => (d.signedUrl && !d.error && d.path ? [{ path: d.path, url: d.signedUrl }] : []))
}

export async function deleteExpiredLeadPhotos(): Promise<number> {
  const cutoff = dayKey(new Date(Date.now() - LEAD_PHOTO_RETENTION_DAYS * DAY_MS))

  const { data: folders, error } = await bucket().list('', { limit: 1000, sortBy: { column: 'name', order: 'asc' } })
  if (error) {
    if (!/not found/i.test(error.message)) console.error('Lead photo cleanup failed:', error.message)
    return 0
  }

  let deleted = 0
  for (const folder of folders ?? []) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(folder.name) || folder.name > cutoff) continue
    const { data: files } = await bucket().list(folder.name, { limit: 1000 })
    const paths = (files ?? []).map((f) => `${folder.name}/${f.name}`)
    if (paths.length === 0) continue
    const { error: removeError } = await bucket().remove(paths)
    if (removeError) console.error('Lead photo cleanup failed:', removeError.message)
    else deleted += paths.length
  }
  return deleted
}
