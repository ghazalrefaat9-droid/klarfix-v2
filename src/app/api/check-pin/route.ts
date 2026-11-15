import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/session'
import { hasExportSession, isSameOrigin, setExportSession, verifyPin } from '@/lib/exportPin'
import { EXPORT_SESSION_SECONDS, PIN_REGEX } from '@/lib/exportConstants'

const noStore = { 'Cache-Control': 'no-store' }

// POST { pin } → { ok: true } and a 15-minute httpOnly export cookie, or { ok: false, attemptsLeft | locked }.
export async function POST(request: Request) {
  const denied = await requireAdmin()
  if (denied) return denied
  if (!isSameOrigin(request)) return NextResponse.json({ ok: false, error: 'Ungültige Herkunft.' }, { status: 403, headers: noStore })

  const body = (await request.json().catch(() => null)) as { pin?: unknown } | null
  const pin = body?.pin
  if (typeof pin !== 'string' || !PIN_REGEX.test(pin)) {
    return NextResponse.json({ ok: false, error: 'PIN muss 4 Ziffern haben.' }, { status: 400, headers: noStore })
  }

  try {
    const result = await verifyPin(pin)
    // 403/429 instead of 401 so the client does not mistake a wrong PIN for an expired admin login.
    if (!result.ok) return NextResponse.json(result, { status: result.locked ? 429 : 403, headers: noStore })
    await setExportSession()
    return NextResponse.json({ ok: true, expiresIn: EXPORT_SESSION_SECONDS }, { headers: noStore })
  } catch (err) {
    console.error('check-pin failed:', err)
    return NextResponse.json({ ok: false, error: 'Server-Fehler.' }, { status: 500, headers: noStore })
  }
}

// GET → { ok } tells the PIN gate whether the server-side export session is still valid.
export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied
  return NextResponse.json({ ok: await hasExportSession() }, { headers: noStore })
}
