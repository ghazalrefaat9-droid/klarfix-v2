import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseServer'
import { requireAdmin } from '@/lib/session'
import { jsonError, readJson } from '@/lib/partnerAdmin'

const isUuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v)

type Body = { action: unknown; partnerId: unknown }

// action "trash" (soft delete), "restore" (from trash) or "assign" (partnerId, empty = unassign).
export async function PATCH(request: Request, ctx: RouteContext<'/api/admin/requests/[id]'>) {
  const denied = await requireAdmin()
  if (denied) return denied
  const { id } = await ctx.params
  if (!isUuid(id)) return jsonError('Anfrage nicht gefunden.', 404)

  const body = await readJson<Body>(request)
  let values: Record<string, unknown>
  if (body.action === 'trash') {
    values = { deleted_at: new Date().toISOString(), deleted_by: 'admin' }
  } else if (body.action === 'restore') {
    values = { deleted_at: null, deleted_by: null }
  } else if (body.action === 'assign') {
    const partnerId = body.partnerId === '' || body.partnerId == null ? null : body.partnerId
    if (partnerId !== null && !isUuid(partnerId)) return jsonError('Ungültiger Partner.', 400)
    values = { partner_id: partnerId, status: partnerId ? 'assigned' : 'new' }
  } else {
    return jsonError('Ungültige Aktion.', 400)
  }

  const { data, error } = await supabase.from('requests').update(values).eq('id', id).select('id')
  if (error || !data?.length) {
    console.error('Request update failed:', error?.message ?? 'no rows updated')
    return jsonError('Speichern fehlgeschlagen.', 500)
  }
  return NextResponse.json({ ok: true })
}

// Permanent delete – only for requests that are already in the trash.
export async function DELETE(_request: Request, ctx: RouteContext<'/api/admin/requests/[id]'>) {
  const denied = await requireAdmin()
  if (denied) return denied
  const { id } = await ctx.params
  if (!isUuid(id)) return jsonError('Anfrage nicht gefunden.', 404)

  const { data, error } = await supabase.from('requests').delete().eq('id', id).not('deleted_at', 'is', null).select('id')
  if (error || !data?.length) {
    console.error('Request delete failed:', error?.message ?? 'no rows deleted')
    return jsonError('Endgültiges Löschen fehlgeschlagen.', 500)
  }
  return NextResponse.json({ ok: true })
}
