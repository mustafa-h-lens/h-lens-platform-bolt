-- ============================================================================
-- ROLLBACK for 20260610000200_tighten_vendor_sibling_select_policies
-- ============================================================================
-- Recreates the eight SELECT policies dropped by the UP migration, exactly as
-- they existed before. WARNING: applying this re-opens the cross-vendor read
-- leak (documents/equipment/fields/travel/approval log/invoices/suggestions)
-- to all authenticated portal users — use only to revert in an emergency.
-- ============================================================================

CREATE POLICY "Users can view vendor documents" ON public.vendor_documents
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can view vendor equipment" ON public.vendor_equipment
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can read vendor_selected_fields" ON public.vendor_selected_fields
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can read vendor_travel_documents" ON public.vendor_travel_documents
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can view vendor travel documents" ON public.vendor_travel_documents
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can read vendor_approval_log" ON public.vendor_approval_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can view vendor invoices" ON public.vendor_invoices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can read all suggestions" ON public.vendor_suggestions
  FOR SELECT TO authenticated USING (true);
