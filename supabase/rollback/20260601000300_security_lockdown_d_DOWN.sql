-- ============================================================================
-- ROLLBACK (DOWN) for Migration D — 20260601000300_security_lockdown_d_drafts_and_otp
-- ============================================================================
-- ⚠️  FAIL-CLOSED teardown, NOT a service-restoring rollback.
--
-- Migration D dropped the legacy permissive policies on vendor_registration_drafts
-- and replaced direct table access with session-id-keyed SECURITY DEFINER RPCs,
-- plus an atomic OTP failed-attempt counter. This DOWN removes the four functions
-- D created and LEAVES vendor_registration_drafts LOCKED (RLS on, no policies).
-- Result: the draft RPCs disappear (the native registration UI's draft load/save
-- degrades) and verify-otp falls back to its non-atomic counter — but NO anon
-- access to drafts is reopened (fail closed, no PII leak).
--
-- It intentionally does NOT recreate the old `USING(... OR true)` draft policies,
-- because that would re-expose in-progress registration PII. To restore service,
-- fix forward (re-apply D) or PITR (see NATIVE_AUTH_CUTOVER_PLAN_REVISED.md §6).
--
-- NOTE: vendor_registration_check() is created by Migration B, not D — it is NOT
-- touched here (see the B down-script).
--
-- No data is deleted. Idempotent. NOT APPLIED — apply manually only on rollback.
-- ============================================================================

-- Drop the four functions D created (exact signatures).
DROP FUNCTION IF EXISTS public.get_vendor_draft(text);
DROP FUNCTION IF EXISTS public.save_vendor_draft(text, jsonb, int, text);
DROP FUNCTION IF EXISTS public.delete_vendor_draft(text);
DROP FUNCTION IF EXISTS public.increment_otp_failed_attempts(uuid);

-- vendor_registration_drafts is left with RLS enabled and no policies (locked).
-- We do NOT restore the prior permissive anon policies (that was the leak).

-- ----------------------------------------------------------------------------
-- POST-ROLLBACK VERIFICATION
--   SELECT proname FROM pg_proc
--   WHERE proname IN ('get_vendor_draft','save_vendor_draft',
--                     'delete_vendor_draft','increment_otp_failed_attempts'); -- 0 rows
--   SELECT * FROM pg_policies WHERE tablename='vendor_registration_drafts';     -- still 0
-- ----------------------------------------------------------------------------
