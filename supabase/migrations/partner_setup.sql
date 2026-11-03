-- Partner setup flow (/partner/setup). Run in the Supabase SQL Editor BEFORE deploying. Safe to re-run.
-- Accepted applicants get a one-time link, set a password and upload Gewerbenachweis + Haftpflicht (+ optional logo).

-- 1) Applications: one-time setup token (only its SHA-256 hash is stored).
alter table public.partner_applications add column if not exists setup_token_hash text;
alter table public.partner_applications add column if not exists setup_completed_at timestamptz;
create unique index if not exists partner_applications_setup_token_hash_idx
  on public.partner_applications (setup_token_hash) where setup_token_hash is not null;
grant update (setup_token_hash, setup_completed_at) on public.partner_applications to anon;

-- 2) Partners: Haftpflicht document + link back to the application (prevents double setup).
alter table public.partners add column if not exists insurance_url text;
alter table public.partners add column if not exists application_id uuid;
create unique index if not exists partners_application_id_idx
  on public.partners (application_id) where application_id is not null;

-- Fields the short application form does not collect.
alter table public.partners alter column legal_form drop not null;
alter table public.partners alter column experience_years drop not null;
alter table public.partners alter column description drop not null;
alter table public.partners alter column street drop not null;
alter table public.partners alter column postcode drop not null;
alter table public.partners alter column city drop not null;
alter table public.partners alter column first_name drop not null;
alter table public.partners alter column last_name drop not null;
alter table public.partners alter column employee_count drop not null;
alter table public.partners alter column terms_accepted_at drop not null;

-- 3) Storage bucket for partner documents (PDF/JPG/PNG/WebP, max 5 MB). Files get random UUID paths.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('partner-documents', 'partner-documents', true, 5242880,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "anon can upload partner documents" on storage.objects;
create policy "anon can upload partner documents"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'partner-documents');

notify pgrst, 'reload schema';
