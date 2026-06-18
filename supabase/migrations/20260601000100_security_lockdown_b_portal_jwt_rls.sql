-- ============================================================================
-- SECURITY LOCKDOWN — PART B (portal JWT RLS)
-- ============================================================================
-- DEPLOY ORDER: apply AFTER the edge functions (verify-otp,
-- create-post-registration-session) and the frontend that mints/sends portal
-- JWTs are deployed, then TEST the vendor + client portals and registration.
--
-- Context: vendor/client portals now authenticate with a Supabase JWT minted by
-- verify-otp / create-post-registration-session. The token carries role
-- 'authenticated' plus a `vendor_id` or `client_id` claim. This migration:
--   1. Adds vendors.registration_nonce (one-time post-registration auto-login).
--   2. Replaces the `anon USING(true)` SELECT leaks on vendor PII tables with
--      authenticated, claim-scoped SELECT policies (vendor reads ONLY its own
--      rows; admins still see everything via is_admin()).
--   3. Adds claim-scoped SELECT for the client portal (clients/projects/invoices).
--   4. Adds vendor_registration_check(): a SECURITY DEFINER RPC so the anonymous
--      registration flow can detect duplicates / reuse a rejected row WITHOUT a
--      blanket anon read of the vendors table (no PII returned).
--
-- NOTE: this migration intentionally leaves the anon INSERT/UPDATE policies used
-- by the registration flow in place (writes are scoped to draft/pending rows).
-- Moving those writes server-side is a tracked follow-up. Storage-bucket privacy
-- is handled separately in Part C.
-- ============================================================================

-- 1. One-time post-registration nonce ----------------------------------------
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS registration_nonce text;

-- 2. Drop the anon SELECT leaks on vendor PII tables --------------------------
--    Only SELECT-to-anon/public policies are dropped, so registration's
--    INSERT/UPDATE policies are untouched.
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'vendors','vendor_documents','vendor_financial_data',
        'vendor_travel_documents','vendor_submission_snapshots','vendor_invoices',
        'vendor_equipment','vendor_selected_fields','vendor_suggestions',
        'vendor_approval_log','equipment_suggestions')
      AND cmd = 'SELECT'
      AND ('anon' = ANY(roles) OR 'public' = ANY(roles))
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- 3. Authenticated, claim-scoped SELECT for the vendor portal -----------------
--    vendor reads only its own rows; admin (is_admin()) reads all.
DROP POLICY IF EXISTS "portal_vendor_read_own_profile" ON public.vendors;
CREATE POLICY "portal_vendor_read_own_profile" ON public.vendors
  FOR SELECT TO authenticated
  USING ( id = (auth.jwt() ->> 'vendor_id')::uuid OR public.is_admin() );

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
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated '
      || 'USING ( vendor_id = (auth.jwt() ->> ''vendor_id'')::uuid OR public.is_admin() )',
      'portal_vendor_read_own_' || t, t);
  END LOOP;
END $$;

-- 4. Authenticated, claim-scoped SELECT for the client portal -----------------
DROP POLICY IF EXISTS "portal_client_read_own_client" ON public.clients;
CREATE POLICY "portal_client_read_own_client" ON public.clients
  FOR SELECT TO authenticated
  USING ( id = (auth.jwt() ->> 'client_id')::uuid OR public.is_admin() );

DROP POLICY IF EXISTS "portal_client_read_own_projects" ON public.projects;
CREATE POLICY "portal_client_read_own_projects" ON public.projects
  FOR SELECT TO authenticated
  USING ( client_id = (auth.jwt() ->> 'client_id')::uuid OR public.is_admin() );

DROP POLICY IF EXISTS "portal_client_read_own_invoices" ON public.invoices;
CREATE POLICY "portal_client_read_own_invoices" ON public.invoices
  FOR SELECT TO authenticated
  USING ( client_id = (auth.jwt() ->> 'client_id')::uuid OR public.is_admin() );

-- project_milestones is scoped through its parent project's client_id.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='project_milestones') THEN
    EXECUTE 'DROP POLICY IF EXISTS "portal_client_read_own_milestones" ON public.project_milestones';
    EXECUTE
      'CREATE POLICY "portal_client_read_own_milestones" ON public.project_milestones '
      || 'FOR SELECT TO authenticated USING ( '
      || 'project_id IN (SELECT id FROM public.projects '
      || 'WHERE client_id = (auth.jwt() ->> ''client_id'')::uuid) OR public.is_admin() )';
  END IF;
END $$;

-- 5. Registration lookup RPC (replaces the anon read of vendors) --------------
--    Returns ONLY a conflict field name + a reusable rejected-row id. No PII.
CREATE OR REPLACE FUNCTION public.vendor_registration_check(
  p_email     text DEFAULT NULL,
  p_phone     text DEFAULT NULL,
  p_id_number text DEFAULT NULL
)
RETURNS TABLE (conflict_field text, rejected_vendor_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_conflict text := NULL;
  v_rejected uuid := NULL;
BEGIN
  IF p_email IS NOT NULL AND length(trim(p_email)) > 0
     AND EXISTS (SELECT 1 FROM public.vendors
                 WHERE email ILIKE trim(p_email) AND status <> 'rejected') THEN
    v_conflict := 'email';
  END IF;

  IF v_conflict IS NULL AND p_phone IS NOT NULL AND length(trim(p_phone)) > 0
     AND EXISTS (SELECT 1 FROM public.vendors
                 WHERE phone = trim(p_phone) AND status <> 'rejected') THEN
    v_conflict := 'phone';
  END IF;

  IF v_conflict IS NULL AND p_id_number IS NOT NULL AND length(trim(p_id_number)) > 0
     AND EXISTS (SELECT 1 FROM public.vendors
                 WHERE id_number = trim(p_id_number) AND status <> 'rejected') THEN
    v_conflict := 'id_number';
  END IF;

  IF p_phone IS NOT NULL AND length(trim(p_phone)) > 0 THEN
    SELECT id INTO v_rejected FROM public.vendors
    WHERE phone = trim(p_phone) AND status = 'rejected'
    ORDER BY created_at DESC LIMIT 1;
  END IF;

  RETURN QUERY SELECT v_conflict, v_rejected;
END;
$$;

REVOKE ALL ON FUNCTION public.vendor_registration_check(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vendor_registration_check(text, text, text) TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- POST-APPLY VERIFICATION
--   -- No anon SELECT should remain on vendor PII tables:
--   SELECT tablename, policyname, roles, cmd FROM pg_policies
--   WHERE schemaname='public' AND cmd='SELECT' AND 'anon' = ANY(roles)
--     AND tablename LIKE 'vendor%';
--   -- A vendor JWT should see ONLY its own rows; a second vendor's id must 404.
-- ----------------------------------------------------------------------------
