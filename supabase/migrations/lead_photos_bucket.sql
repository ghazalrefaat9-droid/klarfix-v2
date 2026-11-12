-- Private bucket for optional customer photos from /buchen (safe to re-run).
-- Files are stored per day (YYYY-MM-DD/...) and deleted after 30 days by /api/cron/lead-photos.
-- The API also creates the bucket automatically on the first upload if it is missing.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lead-photos',
  'lead-photos',
  false,
  10485760, -- 10 MB
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif', 'image/gif']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
