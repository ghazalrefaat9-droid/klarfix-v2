import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseServer'
import { requireAdmin } from '@/lib/session'

// Requests in the trash (/admin/trash).
export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied

  const { data, error } = await supabase
    .from('requests')
    .select('id, customer_name, customer_email, postcode, service_type, created_at, deleted_at, deleted_by')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })
  if (error) {
    console.error('Trash load failed:', error.message)
    return NextResponse.json({ error: 'Daten konnten nicht geladen werden.' }, { status: 500 })
  }
  return NextResponse.json({ items: data ?? [] })
}
