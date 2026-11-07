import { NextResponse } from 'next/server'
import { requirePartner } from '@/lib/session'
import { readJson } from '@/lib/partnerAdmin'
import { cleanMessage, postMessage, readConversation } from '@/lib/messages'

async function chatPartner() {
  const session = await requirePartner()
  if ('response' in session) return session
  const { partner } = session
  if (!partner.verified || partner.is_blocked) {
    return { response: NextResponse.json({ error: 'Kein Zugriff.' }, { status: 403 }) }
  }
  return session
}

// The partner's conversation with the admin (the partner id comes from the session cookie).
export async function GET() {
  const session = await chatPartner()
  if ('response' in session) return session.response
  try {
    return NextResponse.json({ messages: await readConversation(session.partner.id, 'partner') })
  } catch (err) {
    console.error('Partner chat load failed', err)
    return NextResponse.json({ error: 'Server-Fehler.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await chatPartner()
  if ('response' in session) return session.response

  const body = cleanMessage((await readJson<{ body: unknown }>(request)).body)
  if (!body) return NextResponse.json({ error: 'Nachricht ist leer oder zu lang.' }, { status: 400 })

  try {
    const message = await postMessage(session.partner, 'partner', body, new URL(request.url).origin)
    return NextResponse.json({ message })
  } catch (err) {
    console.error('Partner chat send failed', err)
    return NextResponse.json({ error: 'Server-Fehler.' }, { status: 500 })
  }
}
