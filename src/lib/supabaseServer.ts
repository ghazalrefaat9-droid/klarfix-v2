import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Server-only Supabase client with the service-role key. It bypasses RLS, so it must never be
// imported from a 'use client' file (the key has no NEXT_PUBLIC_ prefix and would be undefined there anyway).
let client: SupabaseClient | null = null

function getClient() {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY oder NEXT_PUBLIC_SUPABASE_URL fehlt.')
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  }
  return client
}

// Created lazily so `next build` works without the key; the first real request fails loudly if it's missing.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const c = getClient()
    const value = Reflect.get(c, prop)
    return typeof value === 'function' ? value.bind(c) : value
  },
})
