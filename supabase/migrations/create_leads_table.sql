-- Leads captured from the "Preis anfragen" form (/buchen).
create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  postcode text,
  service text not null,
  area_sqm integer,
  message text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);

-- RLS disabled for now (temporary). Anyone with the anon key can read/write this table.
alter table public.leads disable row level security;
grant select, insert on public.leads to anon, authenticated;
