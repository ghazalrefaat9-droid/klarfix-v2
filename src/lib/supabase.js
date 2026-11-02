// Shared Supabase client (NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY).
// Re-exported so the app keeps a single client instance.
export { supabase } from './supabaseClient'

export const LEADS_TABLE = 'leads'
