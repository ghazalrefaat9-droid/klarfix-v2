import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export type PartnerState = { id: string; is_blocked: boolean; deleted_at: string | null }

export const jsonError = (error: string, status: number) => NextResponse.json({ error }, { status })

export async function readJson<T>(request: Request): Promise<Partial<T>> {
  return ((await request.json().catch(() => null)) as Partial<T> | null) ?? {}
}

export function cleanReason(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 500) : null
}

export async function loadPartnerState(id: string): Promise<PartnerState | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const { data } = await supabase.from('partners').select('id, is_blocked, deleted_at').eq('id', id).maybeSingle()
  return (data as PartnerState | null) ?? null
}

// .select() makes a write blocked by RLS show up as "0 rows" instead of a silent success.
export async function updatePartner(id: string, values: Record<string, unknown>) {
  const { data, error } = await supabase.from('partners').update(values).eq('id', id).select('id')
  if (error) console.error('Partner update failed:', error.message)
  return !error && !!data?.length
}
