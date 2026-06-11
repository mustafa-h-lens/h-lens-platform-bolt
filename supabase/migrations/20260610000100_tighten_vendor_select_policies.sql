-- ============================================================================
-- TIGHTEN vendors + vendor_financial_data SELECT POLICIES
-- ============================================================================
-- Under native Supabase Auth, every portal vendor AND client now holds an
-- `authenticated` session. Three legacy SELECT policies were written with
-- USING (true) for the `authenticated` role (intended for the old admin-only
-- "users" model). Because permissive RLS policies are OR-ed, these `true`
-- policies overrode the correctly-scoped portal_* policies — letting ANY
-- logged-in vendor/client read EVERY vendor's PII and EVERY vendor's financial
-- data (IBAN/bank/account) via a direct PostgREST query.
--
-- Fix: drop the over-broad / legacy SELECT policies. The remaining
-- portal_vendor_read_own_* policies already provide correct access:
--   • portal vendor  -> own row only        (id/vendor_id = jwt.app_metadata.vendor_id)
--   • admin/internal -> all rows            (OR is_admin())
--   • client / anon  -> none
--
-- No new policies are required (admin access rides on the kept policies'
-- `OR is_admin()` branch; vendor writes keep "Admins can manage all vendors").
-- No table/data change. RLS stays enabled. Anon policies untouched.
-- Scope: vendors + vendor_financial_data ONLY (sibling vendor_* tables handled
-- separately).
-- ============================================================================

-- vendors: remove the broad + legacy SELECT grants; keep portal_vendor_read_own_profile
DROP POLICY IF EXISTS "Users can view all vendors"   ON public.vendors;
DROP POLICY IF EXISTS "Vendors can view own profile" ON public.vendors;

-- vendor_financial_data: remove the two USING(true) grants; keep portal_vendor_read_own_vendor_financial_data
DROP POLICY IF EXISTS "Authenticated can read vendor_financial_data" ON public.vendor_financial_data;
DROP POLICY IF EXISTS "Users can view vendor financial data"         ON public.vendor_financial_data;

-- ----------------------------------------------------------------------------
-- POST-APPLY VERIFICATION
--   SELECT policyname FROM pg_policies
--    WHERE schemaname='public' AND tablename IN ('vendors','vendor_financial_data') AND cmd='SELECT';
--   -- expect ONLY: portal_vendor_read_own_profile, portal_vendor_read_own_vendor_financial_data
-- ----------------------------------------------------------------------------
