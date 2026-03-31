-- Run in Supabase: SQL Editor → New query → paste → Run
-- Creates the public bucket used for logos, product/style/colour photos, sales team photos.
-- Safe to re-run (policies are dropped first if present).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contractor-assets',
  'contractor-assets',
  true,
  20971520,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS: replace policies so re-runs don’t error on "already exists"
DROP POLICY IF EXISTS "Contractors can upload their assets" ON storage.objects;
DROP POLICY IF EXISTS "Public read contractor assets" ON storage.objects;
DROP POLICY IF EXISTS "Contractors can update their assets" ON storage.objects;
DROP POLICY IF EXISTS "Contractors can delete their assets" ON storage.objects;

CREATE POLICY "Contractors can upload their assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'contractor-assets');

CREATE POLICY "Public read contractor assets"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'contractor-assets');

CREATE POLICY "Contractors can update their assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'contractor-assets');

CREATE POLICY "Contractors can delete their assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'contractor-assets');
