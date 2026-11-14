import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseServer'
import { requireAdmin } from '@/lib/session'

const COLUMNS =
  'id, full_name, email, phone_fixed, phone_whatsapp, city, company_address, plz, services, team_size, languages, work_radius, has_gewerbe, has_haftpflicht, status, created_at, setup_completed_at'

// Open partner applications for /admin/partner-applications, newest first.
// Only applications that still need admin action are listed: "pending_review", plus accepted ones whose partner
// has not set up the account yet (setup link may need to be re-sent). Rejected applications and accepted ones with a
// completed setup (the partner is then managed under "Partner verwalten") are hidden; no data is deleted.
export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied

  const { data, error } = await supabase
    .from('partner_applications')
    .select(COLUMNS)
    .or('status.eq.pending_review,and(status.eq.accepted,setup_completed_at.is.null)')
    .order('created_at', { ascending: false })
  if (error) {
    console.error('Applications load failed:', error.message)
    return NextResponse.json({ error: 'Anträge konnten nicht geladen werden.' }, { status: 500 })
  }
  return NextResponse.json({ applications: data ?? [] })
}
