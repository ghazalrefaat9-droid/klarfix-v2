// Shared by the /buchen photo upload (client) and the API (server).
// Photos are uploaded straight from the browser to the private bucket via one-time signed upload URLs,
// because many photos would exceed Vercel's request body limit.
export const LEAD_PHOTOS_BUCKET = 'lead-photos'
export const MAX_LEAD_PHOTOS = 20
export const MAX_LEAD_PHOTO_BYTES = 10 * 1024 * 1024
// Browser-side compression target; the original is only uploaded if it can't be compressed (e.g. HEIC outside Safari).
export const LEAD_PHOTO_TARGET_BYTES = 1.5 * 1024 * 1024
export const LEAD_PHOTO_MAX_DIMENSION = 2000
export const LEAD_PHOTO_RETENTION_DAYS = 30
export const LEAD_PHOTO_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/avif',
  'image/gif',
]
