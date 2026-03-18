-- Run in Supabase SQL editor to create storage bucket for contractor logos & product images
-- Bucket: contractor-assets (public read for logos/images). Images only (JPG, PNG, WebP, GIF) — no PDF.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contractor-assets',
  'contractor-assets',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload (uploads go via API with service role, but this allows client uploads if needed)
CREATE POLICY "Contractors can upload their assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'contractor-assets');

-- Allow public read (bucket is public)
CREATE POLICY "Public read contractor assets"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'contractor-assets');

-- Allow authenticated users to update/delete their uploads (path contains contractor_id - we use API for safety)
CREATE POLICY "Contractors can update their assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'contractor-assets');

CREATE POLICY "Contractors can delete their assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'contractor-assets');
