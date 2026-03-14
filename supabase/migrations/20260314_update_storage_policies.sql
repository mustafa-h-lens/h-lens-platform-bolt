/*
  # Update Storage Policies for Vendor Portal

  ## Changes
  1. Allow anon users to upload to vendor-images (vendor portal uses custom auth, not Supabase Auth)
  2. Add PDF to allowed mime types for document uploads
  3. Allow anon users to delete from vendor-images
*/

-- Update bucket to allow PDF mime type
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
WHERE id = 'vendor-images';

-- Drop existing upload policy and recreate for both authenticated and anon
DROP POLICY IF EXISTS "Authenticated users can upload vendor images" ON storage.objects;
CREATE POLICY "Anyone can upload vendor images"
ON storage.objects FOR INSERT
TO authenticated, anon
WITH CHECK (bucket_id = 'vendor-images');

-- Drop existing update policy and recreate for both
DROP POLICY IF EXISTS "Authenticated users can update vendor images" ON storage.objects;
CREATE POLICY "Anyone can update vendor images"
ON storage.objects FOR UPDATE
TO authenticated, anon
USING (bucket_id = 'vendor-images')
WITH CHECK (bucket_id = 'vendor-images');

-- Drop existing delete policy and recreate for both
DROP POLICY IF EXISTS "Authenticated users can delete vendor images" ON storage.objects;
CREATE POLICY "Anyone can delete vendor images"
ON storage.objects FOR DELETE
TO authenticated, anon
USING (bucket_id = 'vendor-images');
