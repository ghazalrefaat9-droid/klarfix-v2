// Shared by /partner/setup (client-side checks) and /api/partner/setup (server-side checks).
export const DOCUMENTS_BUCKET = 'partner-documents'
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024
export const MIN_PASSWORD_LENGTH = 8

export type DocumentKind = 'gewerbe' | 'haftpflicht' | 'logo'

export const setupFolder = (applicationId: string) => `applications/${applicationId}`

export function fileExtension(type: string) {
  return { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[type] ?? 'bin'
}

const PDF_OR_JPG = ['application/pdf', 'image/jpeg']
const LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export const DOCUMENT_RULES: Record<DocumentKind, { types: string[]; accept: string; required: boolean }> = {
  gewerbe: { types: PDF_OR_JPG, accept: '.pdf,.jpg,.jpeg,application/pdf,image/jpeg', required: true },
  haftpflicht: { types: PDF_OR_JPG, accept: '.pdf,.jpg,.jpeg,application/pdf,image/jpeg', required: true },
  logo: { types: LOGO_TYPES, accept: '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp', required: false },
}

export type DocumentError = 'type' | 'size'

export function checkDocument(file: { type: string; size: number }, kind: DocumentKind): DocumentError | null {
  if (!DOCUMENT_RULES[kind].types.includes(file.type)) return 'type'
  if (file.size > MAX_DOCUMENT_BYTES) return 'size'
  return null
}
