-- ============================================================================
-- SECURITY LOCKDOWN — PART C (private storage buckets)
-- ============================================================================
-- Closes the CRITICAL "national IDs / passports / financial + client docs are
-- downloadable by anyone on the internet" leak. Buckets vendor-images,
-- project-files and client-documents are currently PUBLIC, so their objects are
-- served over the unauthenticated CDN path /storage/v1/object/public/... with
-- no RLS. This migration makes them PRIVATE and allows reads only to
-- authenticated callers via short-lived signed URLs.
--
-- *** NO FILES ARE DELETED *** — this only flips the bucket `public` flag and
-- adjusts storage.objects SELECT policies. Existing objects are untouched.
--
-- DEPLOY ORDER: apply AFTER the frontend that uses signed URLs (src/lib/storage
-- + <SignedImage>) is deployed, otherwise images render blank until then.
--
-- Buckets left PUBLIC on purpose: user-avatars, email-assets, and the
-- equipment-catalog image bucket (non-sensitive, shown during anon registration).
--
-- RESIDUAL (tracked follow-up): the SELECT policy below allows ANY authenticated
-- caller (admin or any portal JWT) to sign objects in these buckets. This is
-- acceptable because object paths are not discoverable — Part B already removed
-- the anon/cross-tenant reads of the tables (vendors, vendor_documents, ...)
-- that store those URLs, so a vendor cannot learn another vendor's object path.
-- A later hardening can scope storage reads per-vendor via path prefixes.
-- ============================================================================

-- 1. Make the sensitive buckets private (objects no longer served publicly).
UPDATE storage.buckets
SET public = false
WHERE id IN ('vendor-images', 'project-files', 'client-documents');

-- 2. Remove any anon/public SELECT grant on these buckets so an unauthenticated
--    caller cannot mint signed URLs either. (Drops SELECT policies on
--    storage.objects whose definition references one of the private buckets.)
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND cmd = 'SELECT'
      AND ( qual LIKE '%vendor-images%'
         OR qual LIKE '%project-files%'
         OR qual LIKE '%client-documents%' )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- 3. Authenticated-only read on the private buckets (admins via gotrue session,
--    vendors/clients via their portal JWT). Enables createSignedUrl().
DROP POLICY IF EXISTS "private_buckets_authenticated_read" ON storage.objects;
CREATE POLICY "private_buckets_authenticated_read" ON storage.objects
  FOR SELECT TO authenticated
  USING ( bucket_id IN ('vendor-images', 'project-files', 'client-documents') );

-- NOTE: INSERT/UPDATE/DELETE policies are intentionally left as-is so the
-- existing upload flows (including anon uploads during vendor registration)
-- keep working. Anon can still WRITE its registration images but can no longer
-- READ them over the public path — the registration UI previews the freshly
-- picked file locally instead.

-- ----------------------------------------------------------------------------
-- POST-APPLY VERIFICATION
--   SELECT id, public FROM storage.buckets
--   WHERE id IN ('vendor-images','project-files','client-documents');  -- all false
--   -- Public CDN URL of an id_image should now return 403/400.
--   -- Admin + vendor portal should still see images (via signed URLs).
-- ----------------------------------------------------------------------------
