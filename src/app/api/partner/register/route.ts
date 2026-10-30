import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { supabase } from '@/lib/supabaseClient'
import { hashPassword } from '@/lib/adminAuth'

type Body = {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  street?: string
  city?: string
  postcode?: string
  companyName?: string
  legalForm?: string
  employeeCount?: string
  hasLiabilityInsurance?: boolean
  hasTradeLicense?: boolean
  password?: string
  termsAccepted?: boolean
  experienceYears?: number | null
  services?: string[]
  description?: string
  website?: string
  languages?: string[]
  availability?: string
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const optional = (v: unknown) => (str(v) ? str(v) : null)
const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

const BUCKET = 'partner-documents'
const MAX_FILE_BYTES = 5 * 1024 * 1024

function validFile(file: File, kind: 'logo' | 'license'): boolean {
  if (kind === 'logo') return file.type.startsWith('image/')
  return file.type === 'application/pdf' || file.type.startsWith('image/')
}

async function uploadDocument(file: File, folder: string): Promise<string | null> {
  const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase().replace(/[^a-z0-9]/g, '') : 'bin'
  const path = `${folder}/${randomUUID()}.${ext || 'bin'}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false })
  if (error) return null
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

const toFile = (v: FormDataEntryValue | null): File | null => (v instanceof File && v.size > 0 ? v : null)

export async function POST(req: Request) {
  let body: Body | null = null
  let logoFile: File | null = null
  let licenseFile: File | null = null

  if ((req.headers.get('content-type') ?? '').includes('multipart/form-data')) {
    const form = await req.formData().catch(() => null)
    if (!form) return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 })
    try {
      body = JSON.parse(String(form.get('data') ?? '')) as Body
    } catch {
      body = null
    }
    logoFile = toFile(form.get('logo'))
    licenseFile = toFile(form.get('license'))
  } else {
    body = (await req.json().catch(() => null)) as Body | null
  }
  if (!body) return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 })

  const required = {
    firstName: str(body.firstName),
    lastName: str(body.lastName),
    email: str(body.email),
    phone: str(body.phone),
    street: str(body.street),
    postcode: str(body.postcode),
    companyName: str(body.companyName),
    legalForm: str(body.legalForm),
    employeeCount: str(body.employeeCount),
    password: typeof body.password === 'string' ? body.password : '',
  }
  const missing = Object.entries(required)
    .filter(([, v]) => !v)
    .map(([k]) => k)
  if (missing.length > 0 || typeof body.hasLiabilityInsurance !== 'boolean' || typeof body.hasTradeLicense !== 'boolean') {
    return NextResponse.json({ error: 'Bitte alle Pflichtfelder ausfüllen.' }, { status: 400 })
  }
  if (!required.email.includes('@')) {
    return NextResponse.json({ error: 'Ungültige E-Mail-Adresse.' }, { status: 400 })
  }
  if (required.password.length < 8) {
    return NextResponse.json({ error: 'Das Passwort muss mindestens 8 Zeichen lang sein.' }, { status: 400 })
  }
  if (body.termsAccepted !== true) {
    return NextResponse.json({ error: 'Bitte akzeptieren Sie die AGB.' }, { status: 400 })
  }

  if ((logoFile && !validFile(logoFile, 'logo')) || (licenseFile && !validFile(licenseFile, 'license'))) {
    return NextResponse.json({ error: 'Ungültiger Dateityp. Logo: Bild, Gewerbenachweis: PDF oder Bild.' }, { status: 400 })
  }
  if ((logoFile && logoFile.size > MAX_FILE_BYTES) || (licenseFile && licenseFile.size > MAX_FILE_BYTES)) {
    return NextResponse.json({ error: 'Die Datei ist zu groß (max. 5 MB).' }, { status: 400 })
  }

  const folder = randomUUID()
  let logoUrl: string | null = null
  let licenseUrl: string | null = null
  if (logoFile) {
    logoUrl = await uploadDocument(logoFile, folder)
    if (!logoUrl) return NextResponse.json({ error: 'Logo konnte nicht hochgeladen werden.' }, { status: 500 })
  }
  if (licenseFile) {
    licenseUrl = await uploadDocument(licenseFile, folder)
    if (!licenseUrl) return NextResponse.json({ error: 'Gewerbenachweis konnte nicht hochgeladen werden.' }, { status: 500 })
  }

  const { error } = await supabase.from('partners').insert({
    company_name: required.companyName,
    email: required.email.toLowerCase(),
    phone: required.phone,
    city: optional(body.city),
    postcode: required.postcode,
    street: required.street,
    services: list(body.services),
    first_name: required.firstName,
    last_name: required.lastName,
    legal_form: required.legalForm,
    employee_count: required.employeeCount,
    has_liability_insurance: body.hasLiabilityInsurance,
    has_trade_license: body.hasTradeLicense,
    experience_years: typeof body.experienceYears === 'number' ? body.experienceYears : null,
    description: optional(body.description),
    website: optional(body.website),
    languages: list(body.languages),
    availability: optional(body.availability),
    password_hash: hashPassword(required.password),
    terms_accepted_at: new Date().toISOString(),
    logo_url: logoUrl,
    license_url: licenseUrl,
  })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Diese E-Mail ist bereits registriert.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Fehler bei der Registrierung. Bitte versuchen Sie es erneut.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
