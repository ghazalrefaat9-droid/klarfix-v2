import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { id?: unknown } | null
  const id = typeof body?.id === 'string' ? body.id : ''
  if (!id) {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('partners')
    .select('verified, is_blocked, deleted_at')
    .eq('id', id)
    .maybeSingle()
  if (error) {
    return NextResponse.json({ error: 'Server-Fehler.' }, { status: 500 })
  }
  if (!data || data.deleted_at) {
    return NextResponse.json({ error: 'Partner nicht gefunden.' }, { status: 404 })
  }

  // Blocked partners keep their login session but see no orders.
  return NextResponse.json({ verified: data.verified === true && !data.is_blocked, blocked: data.is_blocked === true })
}
