import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/session'
import { clearExportSession, isSameOrigin, updatePin, verifyPin } from '@/lib/exportPin'
import { PIN_REGEX } from '@/lib/exportConstants'

const noStore = { 'Cache-Control': 'no-store' }

// POST { oldPin, newPin } → verifies the old PIN, stores a new bcrypt hash (exactly 4 digits).
export async function POST(request: Request) {
  const denied = await requireAdmin()
  if (denied) return denied
  if (!isSameOrigin(request)) return NextResponse.json({ ok: false, error: 'Ungültige Herkunft.' }, { status: 403, headers: noStore })

  const body = (await request.json().catch(() => null)) as { oldPin?: unknown; newPin?: unknown } | null
  const oldPin = body?.oldPin
  const newPin = body?.newPin
  if (typeof oldPin !== 'string' || !PIN_REGEX.test(oldPin)) {
    return NextResponse.json({ ok: false, error: 'Alter PIN muss 4 Ziffern haben.' }, { status: 400, headers: noStore })
  }
  if (typeof newPin !== 'string' || !PIN_REGEX.test(newPin)) {
    return NextResponse.json({ ok: false, error: 'Neuer PIN muss genau 4 Ziffern haben.' }, { status: 400, headers: noStore })
  }
  if (oldPin === newPin) {
    return NextResponse.json({ ok: false, error: 'Neuer PIN muss sich vom alten unterscheiden.' }, { status: 400, headers: noStore })
  }

  try {
    // Wrong old PINs count towards the same 3-attempt / 5-minute lock as the export gate.
    const check = await verifyPin(oldPin)
    if (!check.ok) {
      const error = check.locked
        ? 'Zu viele Fehlversuche – 5 Minuten gesperrt.'
        : `Alter PIN ist falsch (noch ${check.attemptsLeft} Versuch(e)).`
      return NextResponse.json({ ...check, error }, { status: check.locked ? 429 : 403, headers: noStore })
    }
    await updatePin(newPin)
    await clearExportSession()
    return NextResponse.json({ ok: true }, { headers: noStore })
  } catch (err) {
    console.error('change-pin failed:', err)
    return NextResponse.json({ ok: false, error: 'Server-Fehler.' }, { status: 500, headers: noStore })
  }
}
