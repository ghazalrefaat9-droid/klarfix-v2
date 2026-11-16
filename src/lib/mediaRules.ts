// Shared (browser + server) limits for partner media.
export const MEDIA_BUCKET = 'partner-media'
export const MAX_VIDEOS = 3
export const MAX_PHOTOS = 5
export const MAX_VIDEO_SECONDS = 30
export const MAX_MEDIA_BYTES = 20 * 1024 * 1024

export const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm']
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export type MediaKind = 'video' | 'photo'
export type MediaStatus = 'pending' | 'approved' | 'rejected'

export type MediaItem = {
  id: string
  kind: MediaKind
  status: MediaStatus
  rejection_reason: string | null
  created_at: string
  url: string | null
}

export type AdminMediaItem = MediaItem & { partner_id: string; partner_name: string }

export const REJECT_PRESETS = ['Logo sichtbar', 'Telefonnummer sichtbar', 'Firmenname sichtbar', 'Social-Link sichtbar', 'Qualität zu niedrig']
