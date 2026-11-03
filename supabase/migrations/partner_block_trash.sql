-- Partner actions in /admin/partners: edit, block/unblock, trash, restore, permanent delete.
-- Run in the Supabase SQL Editor BEFORE deploying. Safe to re-run.

-- 1) Block + soft-delete fields
alter table public.partners add column if not exists is_blocked boolean not null default false;
alter table public.partners add column if not exists blocked_at timestamptz;
alter table public.partners add column if not exists blocked_reason text;
alter table public.partners add column if not exists deleted_at timestamptz;
alter table public.partners add column if not exists deleted_reason text;

-- Editable price in the admin edit dialog (EUR per hour)
alter table public.partners add column if not exists hourly_rate numeric(6,2);

create index if not exists partners_is_blocked_idx on public.partners (is_blocked) where is_blocked = true;
create index if not exists partners_deleted_at_idx on public.partners (deleted_at) where deleted_at is not null;

-- 2) Email only has to be unique among partners that are NOT in the trash.
--    "partners_email_key" is usually a UNIQUE constraint (drop constraint), otherwise a plain index (drop index).
alter table public.partners drop constraint if exists partners_email_key;
drop index if exists public.partners_email_key;
create unique index if not exists partners_email_active_unique
  on public.partners (lower(email)) where deleted_at is null;

-- 3) The admin API routes use the anon key: allow update and permanent delete.
--    Policies only take effect if RLS is enabled on "partners"; they are harmless otherwise.
grant update, delete on public.partners to anon;

drop policy if exists "anon can update partners" on public.partners;
create policy "anon can update partners" on public.partners for update to anon using (true) with check (true);

drop policy if exists "anon can delete partners" on public.partners;
create policy "anon can delete partners" on public.partners for delete to anon using (true);

notify pgrst, 'reload schema';
