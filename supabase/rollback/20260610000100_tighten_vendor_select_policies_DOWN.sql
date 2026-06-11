-- ============================================================================
-- ROLLBACK for 20260610000100_tighten_vendor_select_policies
-- ============================================================================
-- Recreates the four SELECT policies dropped by the UP migration, exactly as
-- they existed before. WARNING: applying this re-opens the PII/financial read
-- leak to all authenticated portal users — use only to revert in an emergency.
-- ============================================================================

CREATE POLICY "Users can view all vendors" ON public.vendors
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Vendors can view own profile" ON public.vendors
  FOR SELECT TO authenticated
  USING (is_admin() OR (phone IN (SELECT users.phone FROM users WHERE users.id = auth.uid())));

CREATE POLICY "Authenticated can read vendor_financial_data" ON public.vendor_financial_data
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can view vendor financial data" ON public.vendor_financial_data
  FOR SELECT TO authenticated
  USING (true);
