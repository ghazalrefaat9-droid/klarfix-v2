-- Secure leads: public (anon) may only INSERT; reading is blocked.
alter table public.leads enable row level security;

-- Remove the temporary read grant from create_leads_table.sql
revoke select, update, delete on public.leads from anon;
grant insert on public.leads to anon;
grant select, insert on public.leads to authenticated;

drop policy if exists "anon can insert leads" on public.leads;
create policy "anon can insert leads"
  on public.leads
  for insert
  to anon
  with check (true);

drop policy if exists "authenticated can read leads" on public.leads;
create policy "authenticated can read leads"
  on public.leads
  for select
  to authenticated
  using (true);
