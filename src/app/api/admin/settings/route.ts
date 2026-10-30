import { NextResponse } from 'next/server'
import { checkPassword, hashPassword, loadAdmin, saveAdminSettings } from '@/lib/adminAuth'

export async function GET() {
  try {
    const admin = await loadAdmin()
    return NextResponse.json({
      email: admin.email,
      companyName: admin.companyName,
      contactEmail: admin.contactEmail,
    })
  } catch {
    return NextResponse.json({ error: 'Server-Fehler.' }, { status: 500 })
  }
}

type SettingsBody = {
  currentPassword?: unknown
  newEmail?: unknown
  newPassword?: unknown
  companyName?: unknown
  contactEmail?: unknown
}

function str(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as SettingsBody | null
  const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : ''
  const newEmail = str(body?.newEmail).toLowerCase()
  const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : ''
  const companyName = str(body?.companyName)
  const contactEmail = str(body?.contactEmail)

  if (newEmail && !newEmail.includes('@')) {
    return NextResponse.json({ error: 'Ungültige E-Mail-Adresse.' }, { status: 400 })
  }
  if (newPassword && newPassword.length < 8) {
    return NextResponse.json({ error: 'Das neue Passwort muss mindestens 8 Zeichen haben.' }, { status: 400 })
  }

  try {
    const admin = await loadAdmin()
    if (!checkPassword(currentPassword, admin.passwordHash)) {
      return NextResponse.json({ error: 'Das aktuelle Passwort ist falsch.' }, { status: 401 })
    }

    const values: Record<string, string> = {
      admin_email: newEmail || admin.email,
      admin_password_hash: hashPassword(newPassword || currentPassword),
    }
    if (typeof body?.companyName === 'string') values.company_name = companyName
    if (typeof body?.contactEmail === 'string') values.contact_email = contactEmail

    await saveAdminSettings(values)

    return NextResponse.json({ ok: true, email: newEmail || admin.email })
  } catch {
    return NextResponse.json({ error: 'Speichern fehlgeschlagen.' }, { status: 500 })
  }
}
