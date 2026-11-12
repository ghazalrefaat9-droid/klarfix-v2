-- Booking form (/buchen): street + house number in one field, area, rooms and photo paths (safe to re-run).
-- fotos = storage paths in the private 'lead-photos' bucket (files are deleted after 30 days).
alter table public.leads add column if not exists strasse_hausnummer text;
alter table public.leads add column if not exists flaeche_m2 integer;
alter table public.leads add column if not exists zimmer_anzahl text;
alter table public.leads add column if not exists fotos text[] default '{}';

alter table public.requests add column if not exists strasse_hausnummer text;
alter table public.requests add column if not exists flaeche_m2 integer;
alter table public.requests add column if not exists zimmer_anzahl text;
alter table public.requests add column if not exists fotos text[] default '{}';

-- Makes the new columns visible to the API immediately.
notify pgrst, 'reload schema';
