import { NextResponse } from 'next/server'
import { cleanReason, jsonError, loadPartnerState, readJson, updatePartner } from '@/lib/partnerAdmin'
import { requireAdmin } from '@/lib/session'

// Block / unblock. Body: { blocked?: boolean, reason?: string } – without "blocked" the current state is toggled.
export async function PUT(request: Request, ctx: RouteContext<'/api/admin/partners/[id]/block'>) {
  const denied = await requireAdmin()
  if (denied) return denied
  const { id } = await ctx.params
  const partner = await loadPartnerState(id)
  if (!partner) return jsonError('Partner nicht gefunden.', 404)

  const body = await readJson<{ blocked: unknown; reason: unknown }>(request)
  const blocked = typeof body.blocked === 'boolean' ? body.blocked : !partner.is_blocked

  const values = blocked
    ? { is_blocked: true, blocked_at: new Date().toISOString(), blocked_reason: cleanReason(body.reason) }
    : { is_blocked: false, blocked_at: null, blocked_reason: null }

  if (!(await updatePartner(id, values))) return jsonError('Status konnte nicht geändert werden.', 500)
  return NextResponse.json({ ok: true, is_blocked: blocked })
}
