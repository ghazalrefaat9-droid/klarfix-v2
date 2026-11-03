import { NextResponse } from 'next/server'
import { cleanReason, jsonError, loadPartnerState, readJson, updatePartner } from '@/lib/partnerAdmin'

// Soft delete: moves the partner to the trash (/admin/partners/trash). Nothing is removed from the database.
export async function PUT(request: Request, ctx: RouteContext<'/api/admin/partners/[id]/trash'>) {
  const { id } = await ctx.params
  if (!(await loadPartnerState(id))) return jsonError('Partner nicht gefunden.', 404)

  const body = await readJson<{ reason: unknown }>(request)
  const ok = await updatePartner(id, { deleted_at: new Date().toISOString(), deleted_reason: cleanReason(body.reason) })
  if (!ok) return jsonError('In den Papierkorb verschieben fehlgeschlagen.', 500)
  return NextResponse.json({ ok: true })
}
