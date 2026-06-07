-- ============================================================================
-- ROLLBACK (DOWN) for Migration C — 20260601000200_security_lockdown_c_private_buckets
-- ============================================================================
-- ⚠️  FAIL-CLOSED teardown, NOT a service-restoring rollback.
--
-- Migration C made vendor-images / project-files / client-documents PRIVATE and
-- added one authenticated SELECT policy so signed URLs work. This DOWN removes
-- that authenticated read policy and LEAVES THE BUCKETS PRIVATE. Result: nobody
-- reads those objects via RLS (fail closed) — images/documents will not load, but
-- NO public exposure is reopened.
--
-- It intentionally does NOT set the buckets back to public, because that would
-- re-expose national IDs / passports / financial + client documents over the
-- public CDN (the exact leak C closed). To restore service, either fix forward
-- (re-apply C with the signed-URL frontend live) or PITR
-- (see NATIVE_AUTH_CUTOVER_PLAN_REVISED.md §6).
--
-- NO FILES ARE DELETED. Idempotent. NOT APPLIED — apply manually only on rollback.
-- ============================================================================

-- Remove the authenticated read policy added by C. Buckets stay private.
DROP POLICY IF EXISTS "private_buckets_authenticated_read" ON storage.objects;

-- ----------------------------------------------------------------------------
-- ⛔ EMERGENCY REOPEN (REVERTS THE SECURITY FIX — re-exposes documents publicly).
--    Only run this, consciously, if you must restore public image serving and
--    accept the exposure. Prefer fix-forward or PITR instead.
--
--   UPDATE storage.buckets SET public = true
--     WHERE id IN ('vendor-images','project-files','client-documents');
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- POST-ROLLBACK VERIFICATION
--   SELECT id, public FROM storage.buckets
--   WHERE id IN ('vendor-images','project-files','client-documents');  -- still false
--   SELECT policyname FROM pg_policies
--   WHERE schemaname='storage' AND tablename='objects'
--     AND policyname='private_buckets_authenticated_read';             -- 0 rows
-- ----------------------------------------------------------------------------
