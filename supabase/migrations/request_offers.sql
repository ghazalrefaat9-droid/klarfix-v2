-- Angebots-Flow für Kundenanfragen (Datenschutz: Kundendaten erst nach Zusage).
-- Status-Flow: new -> offer_sent -> offer_accepted -> done
--                         \-> offer_rejected (wieder offen für andere Partner)
-- Vor dem Deployment im Supabase SQL Editor ausführen. Löscht keine Daten. Kann gefahrlos mehrfach ausgeführt werden.

-- 1) Angebot des Partners
alter table public.requests add column if not exists partner_price numeric(10, 2);
alter table public.requests add column if not exists partner_message text;
alter table public.requests add column if not exists offer_token_hash text;
alter table public.requests add column if not exists offer_sent_at timestamptz;
alter table public.requests add column if not exists offer_responded_at timestamptz;
-- Partner, deren Angebot abgelehnt wurde, sehen die Anfrage nicht erneut.
alter table public.requests add column if not exists rejected_partner_ids uuid[] not null default '{}';

-- 2) Strukturierte Auftragsdaten (bisher nur im Freitext "message")
alter table public.requests add column if not exists customer_address text;
alter table public.requests add column if not exists city text;
alter table public.requests add column if not exists preferred_date date;
alter table public.requests add column if not exists preferred_time text;
alter table public.requests add column if not exists is_flexible boolean;

-- Nur der SHA-256-Hash des Kunden-Links wird gespeichert.
create unique index if not exists requests_offer_token_hash_idx
  on public.requests (offer_token_hash) where offer_token_hash is not null;

-- Eine evtl. vorhandene Status-Prüfung kennt die neuen Werte nicht.
alter table public.requests drop constraint if exists requests_status_check;

notify pgrst, 'reload schema';
