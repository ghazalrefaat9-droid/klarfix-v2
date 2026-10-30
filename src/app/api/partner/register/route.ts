import { NextResponse } from 'next/server'
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

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null
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
  })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Diese E-Mail ist bereits registriert.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Fehler bei der Registrierung. Bitte versuchen Sie es erneut.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
