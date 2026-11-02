-- Booking form (/buchen): Anrede + split name. "name" stays as the combined full name for backward compatibility.
alter table public.leads add column if not exists anrede text;
alter table public.leads add column if not exists vorname text;
alter table public.leads add column if not exists nachname text;
alter table public.leads add column if not exists firma text;
