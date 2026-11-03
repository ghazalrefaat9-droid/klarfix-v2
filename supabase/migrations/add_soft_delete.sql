-- Soft delete + trash bin for /admin (safe to re-run). Run in the Supabase SQL Editor BEFORE deploying.
-- The admin dashboard lists the "requests" table, so that is where soft delete is applied.
alter table public.requests add column if not exists deleted_at timestamptz;
alter table public.requests add column if not exists deleted_by text;
create index if not exists requests_deleted_at_idx on public.requests (deleted_at);

alter table public.leads add column if not exists deleted_at timestamptz;
alter table public.leads add column if not exists deleted_by text;

alter table public.partners add column if not exists deleted_at timestamptz;

-- The admin pages use the anon key: allow update (soft delete / restore) and delete (permanent delete from trash).
-- Policies only take effect if RLS is enabled on "requests"; they are harmless otherwise.
grant select, update, delete on public.requests to anon;

drop policy if exists "anon can update requests" on public.requests;
create policy "anon can update requests" on public.requests for update to anon using (true) with check (true);

drop policy if exists "anon can delete requests" on public.requests;
create policy "anon can delete requests" on public.requests for delete to anon using (true);

notify pgrst, 'reload schema';
