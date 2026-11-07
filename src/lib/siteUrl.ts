// Public base URL for links in emails that carry secrets (e.g. offer tokens).
// Never derive these from the incoming request: Host/X-Forwarded-Host can be set by the caller.
export function siteUrl() {
  const configured = process.env.SITE_URL?.trim()
  if (configured) return configured.replace(/\/+$/, '')
  // Set automatically by Vercel (production domain of the project, without protocol).
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  if (vercel) return `https://${vercel}`
  return process.env.NODE_ENV === 'production' ? 'https://klarfix-v2.vercel.app' : 'http://localhost:3000'
}
