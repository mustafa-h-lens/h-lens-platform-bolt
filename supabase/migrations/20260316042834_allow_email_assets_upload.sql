/*
  # Allow uploads to email-assets storage bucket

  - Adds INSERT policy for service_role on email-assets bucket
  - Adds SELECT policy for public on email-assets bucket (read access)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Service role can upload email assets'
  ) THEN
    DROP POLICY IF EXISTS "Service role can upload email assets" ON storage.objects;
CREATE POLICY "Service role can upload email assets" ON storage.objects
      FOR INSERT
      TO service_role
      WITH CHECK (bucket_id = 'email-assets');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public can read email assets'
  ) THEN
    DROP POLICY IF EXISTS "Public can read email assets" ON storage.objects;
CREATE POLICY "Public can read email assets" ON storage.objects
      FOR SELECT
      TO public
      USING (bucket_id = 'email-assets');
  END IF;
END $$;
