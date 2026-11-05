-- Endgültiges Löschen von Partner-Anträgen über /admin/applications (API-Route /api/admin/applications/[id]).
-- Vor dem Deployment im Supabase SQL Editor ausführen. Kann gefahrlos mehrfach ausgeführt werden.
-- Nach dem Löschen kann die Person mit derselben E-Mail einen neuen Antrag stellen.
-- Hinweis: Dieses Skript löscht keine Daten, es erlaubt nur das Löschen.

-- 1) Row Level Security aktivieren (keine Wirkung, falls bereits aktiv).
alter table public.partner_applications enable row level security;

-- 2) Die Admin-API-Routen nutzen den anon-Key (wie bei "partners"): Löschen erlauben.
--    Hebt das "revoke delete" aus new_applications_table.sql wieder auf.
grant delete on public.partner_applications to anon;

drop policy if exists "partner_applications_delete_anon" on public.partner_applications;
create policy "partner_applications_delete_anon"
  on public.partner_applications for delete
  to anon
  using (true);

notify pgrst, 'reload schema';
