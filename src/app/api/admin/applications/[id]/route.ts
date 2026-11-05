import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { jsonError } from '@/lib/partnerAdmin'

// Permanently deletes an application. A partner account created from it is deleted too,
// so the same person can apply again and set up a fresh account.
export async function DELETE(_request: Request, ctx: RouteContext<'/api/admin/applications/[id]'>) {
  const { id } = await ctx.params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError('Antrag nicht gefunden.', 404)

  const { data: app } = await supabase.from('partner_applications').select('id').eq('id', id).maybeSingle()
  if (!app) return jsonError('Antrag nicht gefunden.', 404)

  const { data: partners, error: partnerReadError } = await supabase
    .from('partners')
    .select('id')
    .eq('application_id', id)
  if (partnerReadError) {
    console.error('Linked partner lookup failed:', partnerReadError.message)
    return jsonError('Verknüpftes Partnerkonto konnte nicht geprüft werden.', 500)
  }

  for (const partner of partners ?? []) {
    // Open assignments go back to "new" so another partner can take them.
    const { error: unassignError } = await supabase
      .from('requests')
      .update({ partner_id: null, status: 'new' })
      .eq('partner_id', partner.id)
    if (unassignError) {
      console.error('Unassign before delete failed:', unassignError.message)
      return jsonError('Zugewiesene Anfragen konnten nicht gelöst werden.', 500)
    }
    const { data: deleted, error } = await supabase.from('partners').delete().eq('id', partner.id).select('id')
    if (error || !deleted?.length) {
      console.error('Linked partner delete failed:', error?.message ?? 'no rows deleted')
      return jsonError('Verknüpftes Partnerkonto konnte nicht gelöscht werden.', 500)
    }
  }

  // .select() turns a delete blocked by RLS into "0 rows" instead of a silent success.
  const { data, error } = await supabase.from('partner_applications').delete().eq('id', id).select('id')
  if (error || !data?.length) {
    console.error('Application delete failed:', error?.message ?? 'no rows deleted')
    return jsonError('Löschen fehlgeschlagen. Wurde die Migration delete_partner_applications.sql ausgeführt?', 500)
  }
  return NextResponse.json({ ok: true })
}
