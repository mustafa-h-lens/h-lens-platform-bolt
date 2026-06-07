-- ============================================================================
-- ROLLBACK (DOWN) for Migration B — 20260601000100_security_lockdown_b_portal_jwt_rls
-- ============================================================================
-- ⚠️  FAIL-CLOSED teardown, NOT a service-restoring rollback.
--
-- This drops the native-auth portal READ policies and the registration-check
-- function that Migration B created. After it runs, vendor/client portals read
-- NOTHING (fail closed) — but NO PII leak is reopened.
--
-- It intentionally does NOT recreate the old `anon ... USING(true)` SELECT
-- policies that Migration B removed, because doing so would re-open the original
-- data leak. Consequently this script alone does NOT restore the pre-cutover
-- (anon-based) site to working order. For a full service-restoring rollback,
-- restore from the PITR / backup point taken before applying Migration B
-- (see NATIVE_AUTH_CUTOVER_RUNBOOK.md §5.4).
--
-- NOT APPLIED. Idempotent (DROP ... IF EXISTS). Apply manually only if rolling back.
-- ============================================================================

-- 1. Vendor portal: drop the claim-scoped SELECT policies -----------------------
DROP POLICY IF EXISTS "portal_vendor_read_own_profile" ON public.vendors;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'vendor_documents','vendor_financial_data','vendor_travel_documents',
    'vendor_submission_snapshots','vendor_invoices','vendor_equipment',
    'vendor_selected_fields','vendor_suggestions','vendor_approval_log',
    'equipment_suggestions'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'portal_vendor_read_own_' || t, t);
  END LOOP;
END $$;

-- 2. Client portal: drop the claim-scoped SELECT policies -----------------------
DROP POLICY IF EXISTS "portal_client_read_own_client"   ON public.clients;
DROP POLICY IF EXISTS "portal_client_read_own_projects" ON public.projects;
DROP POLICY IF EXISTS "portal_client_read_own_invoices" ON public.invoices;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='project_milestones') THEN
    EXECUTE 'DROP POLICY IF EXISTS "portal_client_read_own_milestones" ON public.project_milestones';
  END IF;
END $$;

-- 3. Drop the registration lookup RPC ------------------------------------------
DROP FUNCTION IF EXISTS public.vendor_registration_check(text, text, text);

-- NOTE: vendors.registration_nonce column is left in place (harmless, additive).
--       Synthetic auth users + auth_user_id links are also left in place.

-- ----------------------------------------------------------------------------
-- POST-ROLLBACK VERIFICATION
--   -- The portal_* policies should be gone:
--   SELECT tablename, policyname FROM pg_policies
--   WHERE schemaname='public' AND policyname LIKE 'portal_%';   -- expect 0 rows
--   -- Portals will now read nothing (fail closed). To restore service, PITR.
-- ----------------------------------------------------------------------------
