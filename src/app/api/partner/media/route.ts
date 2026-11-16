import { NextResponse } from 'next/server'
import { requirePartner } from '@/lib/session'
import { readJson } from '@/lib/partnerAdmin'
import { createUploadSlot, deleteMedia, listPartnerMedia, type UploadInput } from '@/lib/mediaServer'

async function mediaPartner() {
  const session = await requirePartner()
  if ('response' in session) return session
  if (!session.partner.verified || session.partner.is_blocked) {
    return { response: NextResponse.json({ error: 'Kein Zugriff.' }, { status: 403 }) }
  }
  return session
}

export async function GET() {
  const session = await mediaPartner()
  if ('response' in session) return session.response
  try {
    return NextResponse.json({ media: await listPartnerMedia(session.partner.id) })
  } catch (err) {
    console.error('Partner media load failed', err)
    return NextResponse.json({ error: 'Medien konnten nicht geladen werden.' }, { status: 500 })
  }
}

// Reserves a slot for one file. The row is always created as "pending"; only the admin can approve it.
export async function POST(request: Request) {
  const session = await mediaPartner()
  if ('response' in session) return session.response
  try {
    const result = await createUploadSlot(session.partner.id, await readJson<UploadInput>(request))
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json(result)
  } catch (err) {
    console.error('Partner media slot failed', err)
    return NextResponse.json({ error: 'Upload gerade nicht möglich.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const session = await mediaPartner()
  if ('response' in session) return session.response
  const id = new URL(request.url).searchParams.get('id') ?? ''
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Ungültige ID.' }, { status: 400 })
  try {
    const ok = await deleteMedia(id, session.partner.id)
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Nicht gefunden.' }, { status: 404 })
  } catch (err) {
    console.error('Partner media delete failed', err)
    return NextResponse.json({ error: 'Löschen fehlgeschlagen.' }, { status: 500 })
  }
}
