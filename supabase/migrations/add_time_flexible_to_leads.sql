-- Booking form (/buchen): date/time flexibility and service label on leads.
alter table public.leads add column if not exists preferred_date date;
alter table public.leads add column if not exists preferred_time text;
alter table public.leads add column if not exists is_flexible boolean default false;
alter table public.leads add column if not exists area_sqm integer;
alter table public.leads add column if not exists service_label text;
