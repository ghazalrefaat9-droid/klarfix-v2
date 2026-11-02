-- Add all columns used by /api/leads (/buchen form). Safe to re-run.
alter table public.leads add column if not exists postcode text;
alter table public.leads add column if not exists status text not null default 'new';
alter table public.leads add column if not exists address text;
alter table public.leads add column if not exists preferred_date date;
alter table public.leads add column if not exists preferred_time text;
alter table public.leads add column if not exists is_flexible boolean default false;
alter table public.leads add column if not exists area_sqm integer;
alter table public.leads add column if not exists service_label text;
alter table public.leads add column if not exists anrede text;
alter table public.leads add column if not exists vorname text;
alter table public.leads add column if not exists nachname text;
alter table public.leads add column if not exists firma text;
alter table public.leads add column if not exists phone text;
alter table public.leads add column if not exists email text;

-- RLS: public may only INSERT; only authenticated users may read.
alter table public.leads enable row level security;

drop policy if exists "Allow public insert leads" on public.leads;
create policy "Allow public insert leads" on public.leads for insert with check (true);

drop policy if exists "Allow admin read leads" on public.leads;
create policy "Allow admin read leads" on public.leads for select using (auth.role() = 'authenticated');

-- Make the API see the new columns immediately (fixes "schema cache" errors).
notify pgrst, 'reload schema';
