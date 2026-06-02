-- ============================================================================
-- SECURITY LOCKDOWN — PART A (safe, deploy immediately)
-- ============================================================================
-- Closes three CRITICAL pre-launch leaks where the `anon` role (i.e. anyone
-- holding the public anon key shipped in the frontend bundle) could read:
--   1. otp_codes        → every live OTP  → universal account takeover
--   2. vendor_sessions  → every session token → vendor impersonation
--   3. client_sessions  → every session token → client impersonation
--
-- These tables are ONLY ever accessed by Edge Functions using the service-role
-- key (which bypasses RLS). The frontend never reads them. Therefore dropping
-- ALL anon/authenticated policies here cannot break the application — it simply
-- removes the public read holes. This migration is independent of the portal
-- JWT work in Part B and is safe to apply on its own, first.
-- ============================================================================

-- Drop every policy on these three tables; access is service-role-only.
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('otp_codes', 'vendor_sessions', 'client_sessions')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- Keep RLS enabled so that, with no policies, anon/authenticated get nothing.
-- (The service-role key bypasses RLS and continues to work in Edge Functions.)
ALTER TABLE public.otp_codes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_sessions  ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Verify after applying (each should return 0 rows / no anon access):
--   SELECT * FROM pg_policies
--   WHERE schemaname='public'
--     AND tablename IN ('otp_codes','vendor_sessions','client_sessions');
-- ----------------------------------------------------------------------------
