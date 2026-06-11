-- ============================================================================
-- TIGHTEN sibling vendor_* table SELECT POLICIES (HIGH set)
-- ============================================================================
-- Follow-up to 20260610000100 (vendors + vendor_financial_data). Same flaw:
-- legacy `authenticated USING (true)` SELECT policies override the correctly
-- scoped portal_* policies, so under native auth ANY logged-in vendor/client
-- could read EVERY vendor's documents, equipment, fields, travel docs, approval
-- log, invoices, and suggestions.
--
-- Fix: drop only the over-broad USING(true) SELECT policies. Each table retains
-- its portal_vendor_read_own_* policy =
--   (vendor_id = jwt.app_metadata.vendor_id) OR is_admin()
-- which already provides: portal vendor -> own rows, admin -> all rows,
-- client/anon -> none. vendor_approval_log additionally keeps a dedicated
-- "Admins can read all approval logs" (is_admin()) policy.
--
-- No new policies required. No table/data change. RLS stays enabled.
-- Anon and INSERT/UPDATE/DELETE policies untouched.
-- Scope: SELECT policies on the 7 listed tables ONLY.
-- ============================================================================

DROP POLICY IF EXISTS "Users can view vendor documents"                ON public.vendor_documents;
DROP POLICY IF EXISTS "Users can view vendor equipment"                ON public.vendor_equipment;
DROP POLICY IF EXISTS "Authenticated can read vendor_selected_fields"  ON public.vendor_selected_fields;
DROP POLICY IF EXISTS "Authenticated can read vendor_travel_documents" ON public.vendor_travel_documents;
DROP POLICY IF EXISTS "Users can view vendor travel documents"         ON public.vendor_travel_documents;
DROP POLICY IF EXISTS "Authenticated can read vendor_approval_log"     ON public.vendor_approval_log;
DROP POLICY IF EXISTS "Users can view vendor invoices"                 ON public.vendor_invoices;
DROP POLICY IF EXISTS "Admins can read all suggestions"                ON public.vendor_suggestions;

-- ----------------------------------------------------------------------------
-- POST-APPLY VERIFICATION
--   SELECT tablename, policyname FROM pg_policies
--    WHERE schemaname='public' AND cmd='SELECT'
--      AND tablename IN ('vendor_documents','vendor_equipment','vendor_selected_fields',
--                        'vendor_travel_documents','vendor_approval_log','vendor_invoices',
--                        'vendor_suggestions');
--   -- expect ONLY each table's portal_vendor_read_own_* policy
--   -- (vendor_approval_log also keeps "Admins can read all approval logs")
-- ----------------------------------------------------------------------------
