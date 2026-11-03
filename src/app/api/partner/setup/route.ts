import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { hashPassword } from '@/lib/adminAuth'
import { serviceLabel, type ApplicationService } from '@/lib/applications'
import {
  checkDocument,
  DOCUMENTS_BUCKET,
  MIN_PASSWORD_LENGTH,
  setupFolder,
  type DocumentKind,
} from '@/lib/partnerDocuments'
import { hashSetupToken, isWellFormedToken } from '@/lib/partnerSetup'

type SetupApplication = {
  id: string
  full_name: string
  vorname: string | null
  nachname: string | null
  email: string
  phone_fixed: string
  city: string | null
  company_address: string | null
  plz: string | null
  street: string | null
  house_number: string | null
  services: ApplicationService[] | null
  languages: string[] | null
  team_size: number | null
  employee_count: number | null
}

const COLUMNS =
  'id, full_name, vorname, nachname, email, phone_fixed, city, company_address, plz, street, house_number, services, languages, team_size, employee_count'

const INVALID_LINK = 'Dieser Link ist ungültig oder wurde bereits verwendet.'

async function findApplication(token: string) {
  if (!isWellFormedToken(token)) return null
  const { data } = await supabase
    .from('partner_applications')
    .select(COLUMNS)
    .eq('setup_token_hash', hashSetupToken(token))
    .eq('status', 'accepted')
    .is('setup_completed_at', null)
    .maybeSingle()
  return (data as SetupApplication | null) ?? null
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') ?? ''
  const app = await findApplication(token)
  if (!app) return NextResponse.json({ error: INVALID_LINK }, { status: 404 })
  return NextResponse.json({ fullName: app.full_name, email: app.email, folder: setupFolder(app.id) })
}

// Files are uploaded by the browser straight to Supabase Storage (Vercel caps request bodies at 4.5 MB),
// so here we only verify that each path belongs to this application and points to a valid file.
async function verifyUpload(path: unknown, folder: string, kind: DocumentKind): Promise<string | null> {
  if (typeof path !== 'string') return null
  const pattern = new RegExp(`^${folder}/${kind}-[0-9a-f-]{36}\\.(pdf|jpg|png|webp)$`)
  if (!pattern.test(path)) return null

  const url = supabase.storage.from(DOCUMENTS_BUCKET).getPublicUrl(path).data.publicUrl
  const res = await fetch(url, { method: 'HEAD', cache: 'no-store' }).catch(() => null)
  if (!res?.ok) return null
  const type = (res.headers.get('content-type') ?? '').split(';')[0].trim()
  const size = Number(res.headers.get('content-length') ?? 0)
  return checkDocument({ type, size }, kind) ? null : url
}

type SetupBody = { token?: unknown; password?: unknown; files?: Partial<Record<DocumentKind, unknown>> }

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as SetupBody | null
  const token = typeof body?.token === 'string' ? body.token : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const files = body?.files ?? {}

  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: `Das Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.` }, { status: 400 })
  }

  const app = await findApplication(token)
  if (!app) return NextResponse.json({ error: INVALID_LINK }, { status: 404 })

  const folder = setupFolder(app.id)
  const [licenseUrl, insuranceUrl, logoUrl] = await Promise.all([
    verifyUpload(files.gewerbe, folder, 'gewerbe'),
    verifyUpload(files.haftpflicht, folder, 'haftpflicht'),
    files.logo ? verifyUpload(files.logo, folder, 'logo') : Promise.resolve(null),
  ])
  if (!licenseUrl || !insuranceUrl) {
    return NextResponse.json({ error: 'Bitte Gewerbenachweis und Haftpflichtversicherung hochladen (PDF oder JPG, max. 5 MB).' }, { status: 400 })
  }
  if (files.logo && !logoUrl) {
    return NextResponse.json({ error: 'Das Logo ist ungültig (JPG, PNG oder WebP, max. 5 MB).' }, { status: 400 })
  }

  const email = app.email.trim().toLowerCase()
  const { data: existing } = await supabase.from('partners').select('id').eq('email', email).maybeSingle()
  if (existing) {
    return NextResponse.json({ error: 'Für diese E-Mail existiert bereits ein Partnerkonto. Bitte melden Sie sich an.' }, { status: 409 })
  }

  const team = app.employee_count ?? app.team_size
  const { error: insertError } = await supabase.from('partners').insert({
    application_id: app.id,
    company_name: app.full_name,
    first_name: app.vorname,
    last_name: app.nachname,
    email,
    phone: app.phone_fixed,
    street: [app.street, app.house_number].filter(Boolean).join(' ') || app.company_address || null,
    city: app.city,
    postcode: app.plz || app.company_address?.match(/\b\d{5}\b/)?.[0] || null,
    services: (app.services ?? []).map((s) => serviceLabel(s.key)),
    languages: app.languages ?? [],
    employee_count: team ? String(team) : null,
    has_trade_license: true,
    has_liability_insurance: true,
    password_hash: hashPassword(password),
    license_url: licenseUrl,
    insurance_url: insuranceUrl,
    logo_url: logoUrl,
    verified: false,
  })
  if (insertError) {
    console.error('Partner setup insert failed:', insertError.message)
    if (insertError.code === '23505') {
      return NextResponse.json({ error: 'Dieses Partnerkonto wurde bereits eingerichtet. Bitte melden Sie sich an.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Konto konnte nicht angelegt werden. Bitte versuchen Sie es erneut.' }, { status: 500 })
  }

  const { error: doneError } = await supabase
    .from('partner_applications')
    .update({ setup_completed_at: new Date().toISOString(), setup_token_hash: null })
    .eq('id', app.id)
  if (doneError) console.error('Could not mark setup as completed:', doneError.message)

  return NextResponse.json({ ok: true })
}
