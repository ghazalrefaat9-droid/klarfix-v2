import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseServer'
import { requirePartner } from '@/lib/session'

// Accept an open request. Only succeeds if it is still "new", so two partners can't take the same job.
export async function POST(_request: Request, ctx: RouteContext<'/api/partner/requests/[id]'>) {
  const session = await requirePartner()
  if ('response' in session) return session.response
  const { partner } = session
  if (!partner.verified || partner.is_blocked) {
    return NextResponse.json({ error: 'Kein Zugriff.' }, { status: 403 })
  }

  const { id } = await ctx.params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Anfrage nicht gefunden.' }, { status: 404 })

  const { data, error } = await supabase
    .from('requests')
    .update({ partner_id: partner.id, status: 'assigned' })
    .eq('id', id)
    .eq('status', 'new')
    .is('deleted_at', null)
    .select('id')
  if (error || !data?.length) {
    return NextResponse.json({ error: 'Auftrag konnte nicht angenommen werden.' }, { status: 409 })
  }
  return NextResponse.json({ ok: true })
}
