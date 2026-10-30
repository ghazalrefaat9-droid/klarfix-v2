import { NextResponse } from 'next/server'
import { verifyPasswordHash } from '@/lib/adminAuth'
import { supabase } from '@/lib/supabaseClient'

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: unknown; password?: unknown } | null
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!email || !password) {
    return NextResponse.json({ error: 'E-Mail und Passwort sind erforderlich.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('partners')
    .select('id, company_name, email, password_hash')
    .eq('email', email)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: 'Server-Fehler.' }, { status: 500 })
  }

  const passwordOk = !!data?.password_hash && verifyPasswordHash(password, data.password_hash)
  if (!data || !passwordOk) {
    return NextResponse.json({ error: 'E-Mail oder Passwort ist falsch.' }, { status: 401 })
  }

  return NextResponse.json({ id: data.id, company_name: data.company_name, email: data.email })
}
