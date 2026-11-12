import { NextResponse } from 'next/server'
import { MAX_LEAD_PHOTOS } from '@/lib/leadPhotos'
import { createPhotoUploadSlots } from '@/lib/leadPhotosServer'

// Best-effort per-instance limit so the public form can't be used as free file storage.
const SLOT_LIMIT = MAX_LEAD_PHOTOS * 3
const WINDOW_MS = 10 * 60 * 1000
const issued = new Map<string, number[]>()

function allow(ip: string, count: number) {
  const now = Date.now()
  const recent = (issued.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  if (recent.length + count > SLOT_LIMIT) return false
  issued.set(ip, [...recent, ...Array<number>(count).fill(now)])
  if (issued.size > 5000) issued.clear()
  return true
}

// Returns one-time signed upload URLs for the private lead-photos bucket.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { count?: unknown } | null
  const count = Math.floor(Number(body?.count))
  if (!Number.isFinite(count) || count < 1 || count > MAX_LEAD_PHOTOS) {
    return NextResponse.json({ error: 'Ungültige Anzahl.' }, { status: 400 })
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!allow(ip, count)) {
    return NextResponse.json({ error: 'Zu viele Fotos. Bitte später erneut versuchen.' }, { status: 429 })
  }

  try {
    return NextResponse.json({ slots: await createPhotoUploadSlots(count) })
  } catch (err) {
    console.error('Lead photo upload slots failed', err)
    return NextResponse.json({ error: 'Upload nicht möglich.' }, { status: 500 })
  }
}
