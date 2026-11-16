import { randomUUID } from 'crypto'
import { supabase } from '@/lib/supabaseServer'
import {
  MAX_MEDIA_BYTES,
  MAX_PHOTOS,
  MAX_VIDEOS,
  MAX_VIDEO_SECONDS,
  MEDIA_BUCKET,
  PHOTO_TYPES,
  VIDEO_TYPES,
  type MediaItem,
  type MediaKind,
  type MediaStatus,
} from '@/lib/mediaRules'

const SIGNED_URL_SECONDS = 60 * 60
const COLUMNS = 'id, partner_id, kind, storage_path, status, rejection_reason, created_at'

type Row = {
  id: string
  partner_id: string
  kind: MediaKind
  storage_path: string
  status: MediaStatus
  rejection_reason: string | null
  created_at: string
}

const bucket = () => supabase.storage.from(MEDIA_BUCKET)

async function ensureBucket() {
  const { error } = await supabase.storage.createBucket(MEDIA_BUCKET, {
    public: false,
    fileSizeLimit: MAX_MEDIA_BYTES,
    allowedMimeTypes: [...VIDEO_TYPES, ...PHOTO_TYPES],
  })
  if (error && !/already exists/i.test(error.message)) console.error('Partner media bucket:', error.message)
}

async function signRows(rows: Row[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>()
  if (rows.length === 0) return urls
  const { data, error } = await bucket().createSignedUrls(
    rows.map((r) => r.storage_path),
    SIGNED_URL_SECONDS,
  )
  if (error) {
    console.error('Partner media signed URLs failed:', error.message)
    return urls
  }
  for (const d of data ?? []) if (d.signedUrl && !d.error && d.path) urls.set(d.path, d.signedUrl)
  return urls
}

const toItem = (r: Row, urls: Map<string, string>): MediaItem => ({
  id: r.id,
  kind: r.kind,
  status: r.status,
  rejection_reason: r.rejection_reason,
  created_at: r.created_at,
  url: urls.get(r.storage_path) ?? null,
})

export async function listPartnerMedia(partnerId: string): Promise<MediaItem[]> {
  const { data, error } = await supabase
    .from('partner_media')
    .select(COLUMNS)
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as Row[]
  const urls = await signRows(rows)
  return rows.map((r) => toItem(r, urls))
}

// Only approved media is ever returned here; this is the single path to the customer view.
export async function listApprovedMedia(partnerId: string): Promise<{ id: string; kind: MediaKind; url: string }[]> {
  const { data, error } = await supabase
    .from('partner_media')
    .select(COLUMNS)
    .eq('partner_id', partnerId)
    .eq('status', 'approved')
    .order('reviewed_at', { ascending: false })
  if (error) {
    console.error('Approved media load failed:', error.message)
    return []
  }
  const rows = (data ?? []) as Row[]
  const urls = await signRows(rows)
  return rows.flatMap((r) => {
    const url = urls.get(r.storage_path)
    return url ? [{ id: r.id, kind: r.kind, url }] : []
  })
}

export async function listAdminMedia(status: MediaStatus) {
  const { data, error } = await supabase
    .from('partner_media')
    .select(`${COLUMNS}, partners(company_name)`)
    .eq('status', status)
    .order('created_at', { ascending: status === 'pending' })
    .limit(200)
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as unknown as (Row & { partners: { company_name: string } | { company_name: string }[] | null })[]
  const urls = await signRows(rows)
  return rows.map((r) => {
    const partner = Array.isArray(r.partners) ? r.partners[0] : r.partners
    return { ...toItem(r, urls), partner_id: r.partner_id, partner_name: partner?.company_name ?? '–' }
  })
}

export async function countPendingMedia() {
  const { count, error } = await supabase.from('partner_media').select('id', { count: 'exact', head: true }).eq('status', 'pending')
  if (error) throw new Error(error.message)
  return count ?? 0
}

export type UploadInput = Partial<{ kind: unknown; mime: unknown; size: unknown; duration: unknown }>

// Validates the file against the rules, reserves a pending row and returns a one-time upload URL.
export async function createUploadSlot(partnerId: string, input: UploadInput) {
  const { kind, mime, size, duration } = input
  if (kind !== 'video' && kind !== 'photo') return { error: 'Ungültiger Medientyp.' }
  if (typeof mime !== 'string' || !(kind === 'video' ? VIDEO_TYPES : PHOTO_TYPES).includes(mime)) {
    return { error: kind === 'video' ? 'Nur MP4-, MOV- oder WebM-Videos erlaubt.' : 'Nur JPG-, PNG- oder WebP-Fotos erlaubt.' }
  }
  if (typeof size !== 'number' || !Number.isFinite(size) || size <= 0 || size > MAX_MEDIA_BYTES) {
    return { error: 'Datei ist größer als 20 MB.' }
  }
  if (kind === 'video' && (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0 || duration > MAX_VIDEO_SECONDS + 0.5)) {
    return { error: `Video darf maximal ${MAX_VIDEO_SECONDS} Sekunden lang sein.` }
  }

  const { count, error: countError } = await supabase
    .from('partner_media')
    .select('id', { count: 'exact', head: true })
    .eq('partner_id', partnerId)
    .eq('kind', kind)
    .neq('status', 'rejected')
  if (countError) throw new Error(countError.message)
  const max = kind === 'video' ? MAX_VIDEOS : MAX_PHOTOS
  if ((count ?? 0) >= max) {
    return { error: kind === 'video' ? `Maximal ${MAX_VIDEOS} Videos erlaubt.` : `Maximal ${MAX_PHOTOS} Fotos erlaubt.` }
  }

  const path = `${partnerId}/${randomUUID()}`
  let { data: slot, error: slotError } = await bucket().createSignedUploadUrl(path)
  if (slotError && /not found/i.test(slotError.message)) {
    await ensureBucket()
    ;({ data: slot, error: slotError } = await bucket().createSignedUploadUrl(path))
  }
  if (slotError || !slot) throw new Error(slotError?.message ?? 'No upload URL')

  const { data: row, error } = await supabase
    .from('partner_media')
    .insert({
      partner_id: partnerId,
      kind,
      storage_path: path,
      mime_type: mime,
      size_bytes: size,
      duration_sec: kind === 'video' ? duration : null,
      status: 'pending',
    })
    .select('id')
    .single()
  if (error || !row) throw new Error(error?.message ?? 'insert failed')
  return { id: row.id as string, url: slot.signedUrl }
}

export async function deleteMedia(id: string, partnerId?: string) {
  let query = supabase.from('partner_media').select('id, storage_path').eq('id', id)
  if (partnerId) query = query.eq('partner_id', partnerId)
  const { data } = await query.maybeSingle()
  if (!data) return false
  await bucket().remove([data.storage_path as string])
  const { error } = await supabase.from('partner_media').delete().eq('id', id)
  if (error) throw new Error(error.message)
  return true
}

export async function reviewMedia(id: string, decision: { approve: true } | { approve: false; reason: string }) {
  const { data, error } = await supabase
    .from('partner_media')
    .update({
      status: decision.approve ? 'approved' : 'rejected',
      rejection_reason: decision.approve ? null : decision.reason,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('partner_id, kind')
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data as { partner_id: string; kind: MediaKind } | null
}
