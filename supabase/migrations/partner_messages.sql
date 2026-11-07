-- Interner Chat zwischen Admin und Partnern (/admin/partners ↔ /partner/dashboard).
-- Vor dem Deployment im Supabase SQL Editor ausführen. Kann gefahrlos mehrfach ausgeführt werden.
-- Zugriff nur über die API-Routen (Service-Role-Key); der öffentliche anon-Key hat keinen Zugriff.

create table if not exists public.partner_messages (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  sender text not null check (sender in ('admin', 'partner')),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists partner_messages_partner_created_idx
  on public.partner_messages (partner_id, created_at desc);
create index if not exists partner_messages_unread_idx
  on public.partner_messages (partner_id, sender) where read_at is null;

alter table public.partner_messages enable row level security;
revoke all on public.partner_messages from anon, authenticated;

notify pgrst, 'reload schema';
