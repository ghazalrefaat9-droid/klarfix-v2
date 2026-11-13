-- Partner -> Admin -> Kunde: Partner geben Angebote ab, nur der Admin sieht sie und schickt EIN Angebot an den Kunden.
-- status: pending (wartet auf Admin) | sent (vom Admin an den Kunden geschickt) | rejected (vom Kunden abgelehnt)
-- Im Supabase SQL Editor ausführen. Löscht keine Daten, kann mehrfach ausgeführt werden.
create table if not exists public.partner_offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  partner_id uuid not null references public.partners (id) on delete cascade,
  price numeric(10, 2) not null check (price > 0),
  message text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (request_id, partner_id)
);

create index if not exists partner_offers_request_idx on public.partner_offers (request_id);
create index if not exists partner_offers_partner_idx on public.partner_offers (partner_id);

-- Nur der Server (Service-Role) darf lesen/schreiben: RLS an, keine Policies.
alter table public.partner_offers enable row level security;
revoke all on public.partner_offers from anon, authenticated;

notify pgrst, 'reload schema';
