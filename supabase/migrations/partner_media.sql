-- Medien-Freigabe: Partner-Videos/-Fotos, die erst nach Admin-Freigabe für Kunden sichtbar sind.
-- Im Supabase SQL Editor ausführen. Kann gefahrlos mehrfach ausgeführt werden.
-- Zugriff nur über die API-Routen (Service-Role-Key); der öffentliche anon-Key hat keinen Zugriff.

create table if not exists public.partner_media (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  kind text not null check (kind in ('video', 'photo')),
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  duration_sec numeric,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists partner_media_partner_idx on public.partner_media (partner_id, created_at desc);
create index if not exists partner_media_status_idx on public.partner_media (status, created_at);

alter table public.partner_media enable row level security;
revoke all on public.partner_media from anon, authenticated;

-- Privater Bucket: Dateien sind nur über kurzlebige signierte Links erreichbar.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'partner-media',
  'partner-media',
  false,
  20971520, -- 20 MB
  array['video/mp4', 'video/quicktime', 'video/webm', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

notify pgrst, 'reload schema';
