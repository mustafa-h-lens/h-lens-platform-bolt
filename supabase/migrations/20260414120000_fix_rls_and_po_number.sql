/*
  # Fix RLS policies and add PO number generation

  1. Fix 12 RLS policies that used role = 'admin' instead of is_admin()
     - super_admin and project_manager users were silently blocked from updates

  2. Add generate_po_number() function for auto-generated PO numbers

  3. Fix vendor_documents SELECT for authenticated to use USING (true)
*/

-- Fix vendor_financial_data UPDATE
DROP POLICY IF EXISTS "Users can update vendor financial data" ON public.vendor_financial_data;
CREATE POLICY "Users can update vendor financial data" ON public.vendor_financial_data FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Fix vendor_documents INSERT, UPDATE and DELETE
DROP POLICY IF EXISTS "Users can insert vendor documents" ON public.vendor_documents;
CREATE POLICY "Users can insert vendor documents" ON public.vendor_documents FOR INSERT TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Users can update vendor documents" ON public.vendor_documents;
CREATE POLICY "Users can update vendor documents" ON public.vendor_documents FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Users can delete vendor documents" ON public.vendor_documents;
CREATE POLICY "Users can delete vendor documents" ON public.vendor_documents FOR DELETE TO authenticated USING (is_admin());

-- Fix vendor_documents SELECT (was checking role = 'admin')
DROP POLICY IF EXISTS "Users can view vendor documents" ON public.vendor_documents;
CREATE POLICY "Users can view vendor documents" ON public.vendor_documents FOR SELECT TO authenticated USING (true);

-- Fix countries
DROP POLICY IF EXISTS "Admins can manage countries" ON public.countries;
CREATE POLICY "Admins can manage countries" ON public.countries FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Fix expense_payments
DROP POLICY IF EXISTS "Admins can delete expense payments" ON public.expense_payments;
CREATE POLICY "Admins can delete expense payments" ON public.expense_payments FOR DELETE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Admins can view expense payments" ON public.expense_payments;
CREATE POLICY "Admins can view expense payments" ON public.expense_payments FOR SELECT TO authenticated USING (is_admin());

-- Fix legal_pages
DROP POLICY IF EXISTS "Admins can update legal pages" ON public.legal_pages;
CREATE POLICY "Admins can update legal pages" ON public.legal_pages FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Fix system_activity_log
DROP POLICY IF EXISTS "Admins can view system activity logs" ON public.system_activity_log;
CREATE POLICY "Admins can view system activity logs" ON public.system_activity_log FOR SELECT TO authenticated USING (is_admin());

-- Fix terms_and_privacy_settings
DROP POLICY IF EXISTS "Admins can read all terms and privacy" ON public.terms_and_privacy_settings;
CREATE POLICY "Admins can read all terms and privacy" ON public.terms_and_privacy_settings FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Admins can update terms and privacy" ON public.terms_and_privacy_settings;
CREATE POLICY "Admins can update terms and privacy" ON public.terms_and_privacy_settings FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Fix vendor_activity_log
DROP POLICY IF EXISTS "Admins can view vendor activity logs" ON public.vendor_activity_log;
CREATE POLICY "Admins can view vendor activity logs" ON public.vendor_activity_log FOR SELECT TO authenticated USING (is_admin());

-- Fix vendor_approval_log
DROP POLICY IF EXISTS "Admins can read all approval logs" ON public.vendor_approval_log;
CREATE POLICY "Admins can read all approval logs" ON public.vendor_approval_log FOR SELECT TO authenticated USING (is_admin());

-- Fix vendor_documents anon SELECT
DROP POLICY IF EXISTS "Anon can view vendor documents during registration" ON public.vendor_documents;
CREATE POLICY "Anon can view vendor_documents" ON public.vendor_documents FOR SELECT TO anon USING (true);

-- Add PO number auto-generation
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_num integer;
  result text;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(po_number FROM '[0-9]+$') AS integer)), 0) + 1
  INTO next_num
  FROM purchase_orders;
  result := 'PO-' || LPAD(next_num::text, 6, '0');
  RETURN result;
END;
$$;
