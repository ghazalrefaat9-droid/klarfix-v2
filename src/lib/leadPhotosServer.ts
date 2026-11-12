import { randomUUID } from 'crypto'
import { supabase } from '@/lib/supabaseServer'
import { LEAD_PHOTOS_BUCKET, LEAD_PHOTO_RETENTION_DAYS, MAX_LEAD_PHOTOS, MAX_LEAD_PHOTO_BYTES } from '@/lib/leadPhotos'

const DAY_MS = 24 * 60 * 60 * 1000
const RETENTION_SECONDS = LEAD_PHOTO_RETENTION_DAYS * 24 * 60 * 60

// Photos live in one folder per upload day (YYYY-MM-DD), so expired ones can be removed folder by folder.
const dayKey = (date: Date) => date.toISOString().slice(0, 10)

const isJpeg = (bytes: Uint8Array) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff

export function pickPhotoFiles(entries: FormDataEntryValue[]): File[] {
  return entries
    .filter((v): v is File => v instanceof File && v.size > 0 && v.size <= MAX_LEAD_PHOTO_BYTES * 2)
    .slice(0, MAX_LEAD_PHOTOS)
}

async function ensureBucket() {
  const { error } = await supabase.storage.createBucket(LEAD_PHOTOS_BUCKET, {
    public: false,
    allowedMimeTypes: ['image/jpeg'],
  })
  if (error && !/already exists/i.test(error.message)) console.error('Lead photo bucket:', error.message)
}

async function uploadOne(file: File, folder: string) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!isJpeg(bytes)) return null
  const path = `${folder}/${randomUUID()}.jpg`
  const upload = () =>
    supabase.storage.from(LEAD_PHOTOS_BUCKET).upload(path, bytes, { contentType: 'image/jpeg', upsert: false })

  let { error } = await upload()
  if (error && /not found/i.test(error.message)) {
    await ensureBucket()
    ;({ error } = await upload())
  }
  if (error) {
    console.error('Lead photo upload failed:', error.message)
    return null
  }
  return path
}

// Uploads to a private bucket and returns signed links that expire together with the photos.
// Failures are logged and skipped, the request itself is still saved.
export async function uploadLeadPhotos(files: File[]): Promise<string[]> {
  if (files.length === 0) return []
  const folder = dayKey(new Date())
  const paths = (await Promise.all(files.map((f) => uploadOne(f, folder).catch(() => null)))).filter(
    (p): p is string => !!p,
  )
  if (paths.length === 0) return []

  const { data, error } = await supabase.storage.from(LEAD_PHOTOS_BUCKET).createSignedUrls(paths, RETENTION_SECONDS)
  if (error) {
    console.error('Lead photo signed URLs failed:', error.message)
    return []
  }
  return (data ?? []).flatMap((d) => (d.signedUrl ? [d.signedUrl] : []))
}

export async function deleteExpiredLeadPhotos(): Promise<number> {
  const bucket = supabase.storage.from(LEAD_PHOTOS_BUCKET)
  const cutoff = dayKey(new Date(Date.now() - LEAD_PHOTO_RETENTION_DAYS * DAY_MS))

  const { data: folders, error } = await bucket.list('', { limit: 1000, sortBy: { column: 'name', order: 'asc' } })
  if (error) {
    if (!/not found/i.test(error.message)) console.error('Lead photo cleanup failed:', error.message)
    return 0
  }

  let deleted = 0
  for (const folder of folders ?? []) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(folder.name) || folder.name > cutoff) continue
    const { data: files } = await bucket.list(folder.name, { limit: 1000 })
    const paths = (files ?? []).map((f) => `${folder.name}/${f.name}`)
    if (paths.length === 0) continue
    const { error: removeError } = await bucket.remove(paths)
    if (removeError) console.error('Lead photo cleanup failed:', removeError.message)
    else deleted += paths.length
  }
  return deleted
}
