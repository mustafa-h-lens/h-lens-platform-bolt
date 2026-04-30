-- Fix "new row violates row-level security policy for table vendors" when an
-- admin tries to add a vendor manually from the admin UI.
--
-- The original policy "Admins can manage all vendors" (from
-- 20260315111948_add_secure_vendor_registration.sql) hardcoded
--   role IN ('admin', 'super_admin')
-- and ignored the project_manager / general_manager roles that are also
-- treated as admin elsewhere in the schema. The is_admin() helper already
-- handles the full set of admin-equivalent roles plus role_id-based admins,
-- so the policy should defer to it.
--
-- Same problem affects the vendor-portal "Vendors can view own profile" and
-- "Anon can read pending vendors" wrap predicates: they hardcoded the role
-- list inline. Replace each occurrence with is_admin() to keep the schema
-- consistent.

-- ── vendors ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage all vendors" ON public.vendors;

CREATE POLICY "Admins can manage all vendors"
  ON public.vendors
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- The "Vendors can view own profile" policy from the same migration also
-- branches on the hardcoded admin role list. Recreate it with is_admin().
DROP POLICY IF EXISTS "Vendors can view own profile" ON public.vendors;

CREATE POLICY "Vendors can view own profile"
  ON public.vendors
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR phone IN (SELECT phone FROM public.users WHERE id = auth.uid())
  );
