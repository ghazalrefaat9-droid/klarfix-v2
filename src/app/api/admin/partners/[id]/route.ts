import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseServer'
import { jsonError, loadPartnerState, readJson, updatePartner } from '@/lib/partnerAdmin'
import { requireAdmin } from '@/lib/session'

type EditBody = {
  company_name: unknown
  city: unknown
  phone: unknown
  hourly_rate: unknown
  services: unknown
  legal_form: unknown
  verified: unknown
}

const text = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

// Edit partner fields (only the fields sent are changed).
export async function PUT(request: Request, ctx: RouteContext<'/api/admin/partners/[id]'>) {
  const denied = await requireAdmin()
  if (denied) return denied
  const { id } = await ctx.params
  if (!(await loadPartnerState(id))) return jsonError('Partner nicht gefunden.', 404)

  const body = await readJson<EditBody>(request)
  const values: Record<string, unknown> = {}

  if ('company_name' in body) {
    const name = text(body.company_name)
    if (!name) return jsonError('Firmenname darf nicht leer sein.', 400)
    values.company_name = name
  }
  if ('city' in body) values.city = text(body.city) || null
  if ('phone' in body) values.phone = text(body.phone, 50) || null
  if ('legal_form' in body) values.legal_form = text(body.legal_form, 100) || null
  if ('hourly_rate' in body) {
    if (body.hourly_rate === null || body.hourly_rate === '') {
      values.hourly_rate = null
    } else {
      const rate = Number(body.hourly_rate)
      if (!Number.isFinite(rate) || rate < 0 || rate > 999) return jsonError('Ungültiger Preis (0–999 €).', 400)
      values.hourly_rate = Math.round(rate * 100) / 100
    }
  }
  if ('services' in body) {
    if (!Array.isArray(body.services)) return jsonError('Ungültige Leistungen.', 400)
    values.services = body.services.filter((s): s is string => typeof s === 'string' && !!s.trim()).map((s) => s.trim())
  }
  if ('verified' in body) {
    if (typeof body.verified !== 'boolean') return jsonError('Ungültiger Status.', 400)
    values.verified = body.verified
  }

  if (Object.keys(values).length === 0) return jsonError('Keine Änderungen.', 400)
  if (!(await updatePartner(id, values))) return jsonError('Speichern fehlgeschlagen.', 500)
  return NextResponse.json({ ok: true })
}

// Permanent delete – only allowed for partners that are already in the trash.
export async function DELETE(_request: Request, ctx: RouteContext<'/api/admin/partners/[id]'>) {
  const denied = await requireAdmin()
  if (denied) return denied
  const { id } = await ctx.params
  const partner = await loadPartnerState(id)
  if (!partner) return jsonError('Partner nicht gefunden.', 404)
  if (!partner.deleted_at) return jsonError('Nur Partner im Papierkorb können endgültig gelöscht werden.', 409)

  // Open assignments go back to "new" so another partner can take them.
  const { error: unassignError } = await supabase
    .from('requests')
    .update({ partner_id: null, status: 'new' })
    .eq('partner_id', id)
  if (unassignError) {
    console.error('Unassign before delete failed:', unassignError.message)
    return jsonError('Zugewiesene Anfragen konnten nicht gelöst werden.', 500)
  }

  const { data, error } = await supabase.from('partners').delete().eq('id', id).select('id')
  if (error || !data?.length) {
    console.error('Partner delete failed:', error?.message ?? 'no rows deleted')
    return jsonError('Endgültiges Löschen fehlgeschlagen.', 500)
  }
  return NextResponse.json({ ok: true })
}
