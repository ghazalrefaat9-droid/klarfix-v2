import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { id?: unknown } | null
  const id = typeof body?.id === 'string' ? body.id : ''
  if (!id) {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 })
  }

  const { data, error } = await supabase.from('partners').select('verified').eq('id', id).maybeSingle()
  if (error) {
    return NextResponse.json({ error: 'Server-Fehler.' }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Partner nicht gefunden.' }, { status: 404 })
  }

  return NextResponse.json({ verified: data.verified === true })
}
