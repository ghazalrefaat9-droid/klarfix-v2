import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseServer'
import { requireAdmin } from '@/lib/session'

type PartnerView = 'active' | 'blocked' | 'trash'

const COLUMNS =
  'id, company_name, first_name, last_name, email, phone, street, city, postcode, legal_form, employee_count, has_liability_insurance, has_trade_license, experience_years, services, description, website, languages, availability, terms_accepted_at, logo_url, license_url, insurance_url, hourly_rate, verified, is_blocked, blocked_at, blocked_reason, deleted_at, deleted_reason, created_at'

function listQuery(view: PartnerView) {
  const base = supabase.from('partners').select(COLUMNS)
  if (view === 'trash') return base.not('deleted_at', 'is', null).order('deleted_at', { ascending: false })
  return base
    .is('deleted_at', null)
    .eq('is_blocked', view === 'blocked')
    .order(view === 'blocked' ? 'blocked_at' : 'created_at', { ascending: false })
}

function countQuery(view: PartnerView) {
  const base = supabase.from('partners').select('id', { count: 'exact', head: true })
  if (view === 'trash') return base.not('deleted_at', 'is', null)
  return base.is('deleted_at', null).eq('is_blocked', view === 'blocked')
}

// Partner list for /admin/partners (?view=active|blocked|trash) plus the tab counters.
export async function GET(request: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  const param = new URL(request.url).searchParams.get('view')
  const view: PartnerView = param === 'blocked' || param === 'trash' ? param : 'active'
  const [list, active, blocked, trash] = await Promise.all([
    listQuery(view),
    countQuery('active'),
    countQuery('blocked'),
    countQuery('trash'),
  ])
  if (list.error) {
    console.error('Partner list failed:', list.error.message)
    return NextResponse.json({ error: 'Partner konnten nicht geladen werden.' }, { status: 500 })
  }
  return NextResponse.json({
    partners: list.data ?? [],
    counts: { active: active.count ?? 0, blocked: blocked.count ?? 0, trash: trash.count ?? 0 },
  })
}
