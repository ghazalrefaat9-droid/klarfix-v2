-- Sicherheit: Der öffentliche anon-Key (steht im Browser) bekommt keinen Zugriff mehr auf sensible Tabellen.
-- Alle Zugriffe laufen jetzt über die API-Routen mit SUPABASE_SERVICE_ROLE_KEY (umgeht RLS, nur auf dem Server).
-- Reihenfolge: 1) SUPABASE_SERVICE_ROLE_KEY in Vercel + .env.local setzen, 2) deployen, 3) dieses Skript ausführen.
-- Löscht keine Daten. Kann gefahrlos mehrfach ausgeführt werden.

-- 1) RLS aktivieren: ohne Policy sieht anon/authenticated keine Zeilen mehr.
alter table public.admin_settings enable row level security;
alter table public.password_resets enable row level security;
alter table public.partners enable row level security;
alter table public.requests enable row level security;
alter table public.partner_applications enable row level security;
alter table public.leads enable row level security;

-- 2) Alte, offene Policies aus früheren Migrationen entfernen.
drop policy if exists "anon can update partners" on public.partners;
drop policy if exists "anon can delete partners" on public.partners;
drop policy if exists "anon can update requests" on public.requests;
drop policy if exists "anon can delete requests" on public.requests;
drop policy if exists "partner_applications_insert_anon" on public.partner_applications;
drop policy if exists "partner_applications_select_anon" on public.partner_applications;
drop policy if exists "partner_applications_update_anon" on public.partner_applications;
drop policy if exists "partner_applications_delete_anon" on public.partner_applications;
drop policy if exists "Allow public insert leads" on public.leads;
drop policy if exists "Allow admin read leads" on public.leads;
drop policy if exists "anon can insert leads" on public.leads;
drop policy if exists "authenticated can read leads" on public.leads;

-- 3) Tabellenrechte für den Browser-Key entziehen.
revoke all on public.admin_settings from anon, authenticated;
revoke all on public.password_resets from anon, authenticated;
revoke all on public.partners from anon, authenticated;
revoke all on public.requests from anon, authenticated;
revoke all on public.partner_applications from anon, authenticated;
revoke all on public.leads from anon, authenticated;

notify pgrst, 'reload schema';
