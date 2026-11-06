import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseServer'
import { requirePartner } from '@/lib/session'

// Open requests for the partner dashboard. Only verified, unblocked partners see them.
export async function GET() {
  const session = await requirePartner()
  if ('response' in session) return session.response
  const { partner } = session
  if (!partner.verified || partner.is_blocked) {
    return NextResponse.json({ error: 'Kein Zugriff.' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('requests')
    .select('id, customer_name, customer_email, customer_phone, postcode, service_type, area_sqm, message, status, created_at')
    .eq('status', 'new')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) {
    console.error('Partner requests load failed:', error.message)
    return NextResponse.json({ error: 'Server-Fehler.' }, { status: 500 })
  }
  return NextResponse.json({ requests: data ?? [] })
}
