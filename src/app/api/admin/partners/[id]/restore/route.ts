import { NextResponse } from 'next/server'
import { jsonError, loadPartnerState, updatePartner } from '@/lib/partnerAdmin'
import { requireAdmin } from '@/lib/session'

// Restore from trash: the partner becomes active again (and unblocked).
export async function PUT(_request: Request, ctx: RouteContext<'/api/admin/partners/[id]/restore'>) {
  const denied = await requireAdmin()
  if (denied) return denied
  const { id } = await ctx.params
  if (!(await loadPartnerState(id))) return jsonError('Partner nicht gefunden.', 404)

  const ok = await updatePartner(id, {
    deleted_at: null,
    deleted_reason: null,
    is_blocked: false,
    blocked_at: null,
    blocked_reason: null,
  })
  if (!ok) {
    return jsonError('Wiederherstellen fehlgeschlagen. Existiert bereits ein aktiver Partner mit dieser E-Mail?', 500)
  }
  return NextResponse.json({ ok: true })
}
