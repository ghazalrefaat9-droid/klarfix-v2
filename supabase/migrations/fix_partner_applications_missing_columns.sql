-- Auto-generated: missing columns for partner_applications
-- Run manually in the Supabase SQL Editor. Safe to re-run (IF NOT EXISTS); does not drop or change data.
--
-- Verified against the live table on 2026-11-01:
--   employee_count, cleaning_prices, cleaning_types -> sent by /api/partner/bewerben but missing (insert fails with PGRST204)
--   anrede, vorname, nachname                       -> already exist (kept so the file is self-contained)
--   plz, street, house_number, arbeitsradius        -> not sent by the app yet; added for future use
--     (note: the app stores the radius in the existing work_radius column)

ALTER TABLE public.partner_applications
  ADD COLUMN IF NOT EXISTS employee_count  INT,
  ADD COLUMN IF NOT EXISTS cleaning_prices JSONB,
  ADD COLUMN IF NOT EXISTS cleaning_types  TEXT[],
  ADD COLUMN IF NOT EXISTS anrede          TEXT,
  ADD COLUMN IF NOT EXISTS vorname         TEXT,
  ADD COLUMN IF NOT EXISTS nachname        TEXT,
  ADD COLUMN IF NOT EXISTS plz             TEXT,
  ADD COLUMN IF NOT EXISTS street          TEXT,
  ADD COLUMN IF NOT EXISTS house_number    TEXT,
  ADD COLUMN IF NOT EXISTS arbeitsradius   INT;

NOTIFY pgrst, 'reload schema';
