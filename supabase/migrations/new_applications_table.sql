-- New table for the 3-step partner application flow (/partner/bewerben).
-- Does NOT touch the live "partners" table. Run manually in the Supabase SQL editor.

create table if not exists partner_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  vorname text,
  nachname text,
  anrede text,
  email text not null,
  phone_fixed text not null,
  phone_whatsapp text null,
  city text not null default 'Stuttgart',
  company_address text not null,
  services jsonb not null,
  employee_count int default 1,
  cleaning_prices jsonb,
  cleaning_types text[],
  team_size int default 1,
  languages text[],
  work_radius int default 20,
  has_gewerbe boolean,
  has_haftpflicht boolean,
  status text default 'pending_review',
  created_at timestamp default now()
);

alter table partner_applications add column if not exists employee_count int;
alter table partner_applications add column if not exists cleaning_prices jsonb;
alter table partner_applications add column if not exists cleaning_types text[];
alter table partner_applications add column if not exists vorname text;
alter table partner_applications add column if not exists nachname text;
alter table partner_applications add column if not exists anrede text;

alter table partner_applications enable row level security;

-- The app uses the anon key everywhere (same as the existing admin dashboard),
-- so the policies are written for the anon role.
drop policy if exists "partner_applications_insert_anon" on partner_applications;
create policy "partner_applications_insert_anon"
  on partner_applications for insert
  to anon
  with check (status = 'pending_review');

drop policy if exists "partner_applications_select_anon" on partner_applications;
create policy "partner_applications_select_anon"
  on partner_applications for select
  to anon
  using (status in ('pending_review', 'accepted', 'rejected'));

drop policy if exists "partner_applications_update_anon" on partner_applications;
create policy "partner_applications_update_anon"
  on partner_applications for update
  to anon
  using (status in ('pending_review', 'accepted', 'rejected'))
  with check (status in ('pending_review', 'accepted', 'rejected'));

-- Anon may only change the status column; no deletes.
revoke update on partner_applications from anon;
grant update (status) on partner_applications to anon;
revoke delete on partner_applications from anon;

-- Migration: final name fields
ALTER TABLE public.partner_applications
ADD COLUMN IF NOT EXISTS anrede TEXT CHECK (anrede IN ('Herr', 'Frau', 'Divers', 'Dr.', 'Firma')),
ADD COLUMN IF NOT EXISTS vorname TEXT,
ADD COLUMN IF NOT EXISTS nachname TEXT,
ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.partner_applications DROP COLUMN IF EXISTS titel;

-- ADD COLUMN IF NOT EXISTS does not constrain an existing anrede column.
ALTER TABLE public.partner_applications DROP CONSTRAINT IF EXISTS partner_applications_anrede_check;
ALTER TABLE public.partner_applications
ADD CONSTRAINT partner_applications_anrede_check
CHECK (anrede IN ('Herr', 'Frau', 'Divers', 'Dr.', 'Firma'));
