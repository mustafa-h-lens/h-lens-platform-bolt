/*
  # Fix Security and Performance Issues - Part 2: RLS Optimization

  1. **Optimize RLS Policies**
    - Replace auth.uid() with (SELECT auth.uid()) to prevent re-evaluation
    - Affects 25+ policies across multiple tables
    - Significantly improves query performance at scale

  2. **Fix Duplicate/Conflicting Policies**
    - Remove Arabic-named duplicate policies
    - Consolidate multiple permissive policies
*/

-- =====================================================
-- System Activity Log
-- =====================================================

DROP POLICY IF EXISTS "Admins can view system activity logs" ON public.system_activity_log;
CREATE POLICY "Admins can view system activity logs"
  ON public.system_activity_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = (SELECT auth.uid()) 
      AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "System can insert activity logs" ON public.system_activity_log;
CREATE POLICY "System can insert activity logs"
  ON public.system_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = (SELECT auth.uid())
    )
  );

-- =====================================================
-- Vendor Registration Drafts
-- =====================================================

DROP POLICY IF EXISTS "Users can delete own drafts" ON public.vendor_registration_drafts;
CREATE POLICY "Users can delete own drafts"
  ON public.vendor_registration_drafts FOR DELETE
  TO authenticated
  USING (session_id = (SELECT auth.uid()::text));

DROP POLICY IF EXISTS "Users can read own drafts by session" ON public.vendor_registration_drafts;
CREATE POLICY "Users can read own drafts by session"
  ON public.vendor_registration_drafts FOR SELECT
  TO authenticated
  USING (session_id = (SELECT auth.uid()::text));

DROP POLICY IF EXISTS "Users can update own drafts by session" ON public.vendor_registration_drafts;
CREATE POLICY "Users can update own drafts by session"
  ON public.vendor_registration_drafts FOR UPDATE
  TO authenticated
  USING (session_id = (SELECT auth.uid()::text))
  WITH CHECK (session_id = (SELECT auth.uid()::text));

-- =====================================================
-- Vendor Documents
-- =====================================================

DROP POLICY IF EXISTS "Users can delete vendor documents" ON public.vendor_documents;
CREATE POLICY "Users can delete vendor documents"
  ON public.vendor_documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = (SELECT auth.uid()) 
      AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can insert vendor documents" ON public.vendor_documents;
CREATE POLICY "Users can insert vendor documents"
  ON public.vendor_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = (SELECT auth.uid()) 
      AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can update vendor documents" ON public.vendor_documents;
CREATE POLICY "Users can update vendor documents"
  ON public.vendor_documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = (SELECT auth.uid()) 
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = (SELECT auth.uid()) 
      AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view vendor documents" ON public.vendor_documents;
CREATE POLICY "Users can view vendor documents"
  ON public.vendor_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = (SELECT auth.uid()) 
      AND users.role = 'admin'
    )
  );

-- =====================================================
-- Vendors
-- =====================================================

DROP POLICY IF EXISTS "Users can update vendors" ON public.vendors;
CREATE POLICY "Users can update vendors"
  ON public.vendors FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = (SELECT auth.uid()) 
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = (SELECT auth.uid()) 
      AND users.role = 'admin'
    )
  );

-- =====================================================
-- Vendor Financial Data
-- =====================================================

DROP POLICY IF EXISTS "Users can insert vendor financial data" ON public.vendor_financial_data;
CREATE POLICY "Users can insert vendor financial data"
  ON public.vendor_financial_data FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = (SELECT auth.uid()) 
      AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can update vendor financial data" ON public.vendor_financial_data;
CREATE POLICY "Users can update vendor financial data"
  ON public.vendor_financial_data FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = (SELECT auth.uid()) 
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = (SELECT auth.uid()) 
      AND users.role = 'admin'
    )
  );

-- =====================================================
-- Expense Payments
-- =====================================================

DROP POLICY IF EXISTS "Admins can delete expense payments" ON public.expense_payments;
CREATE POLICY "Admins can delete expense payments"
  ON public.expense_payments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = (SELECT auth.uid()) 
      AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert expense payments" ON public.expense_payments;
CREATE POLICY "Admins can insert expense payments"
  ON public.expense_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = (SELECT auth.uid()) 
      AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can view expense payments" ON public.expense_payments;
CREATE POLICY "Admins can view expense payments"
  ON public.expense_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = (SELECT auth.uid()) 
      AND users.role = 'admin'
    )
  );

-- =====================================================
-- Vendor Activity Log
-- =====================================================

DROP POLICY IF EXISTS "Admins can insert vendor activity logs" ON public.vendor_activity_log;
DROP POLICY IF EXISTS "المسؤولون يمكنهم إنشاء سجلات أنشط" ON public.vendor_activity_log;
CREATE POLICY "Admins can insert vendor activity logs"
  ON public.vendor_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = (SELECT auth.uid()) 
      AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can view vendor activity logs" ON public.vendor_activity_log;
DROP POLICY IF EXISTS "المسؤولون يمكنهم قراءة جميع الأنش" ON public.vendor_activity_log;
CREATE POLICY "Admins can view vendor activity logs"
  ON public.vendor_activity_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = (SELECT auth.uid()) 
      AND users.role = 'admin'
    )
  );

-- =====================================================
-- Vendor Selected Fields
-- =====================================================

DROP POLICY IF EXISTS "Vendors can manage own selected fields" ON public.vendor_selected_fields;
DROP POLICY IF EXISTS "Vendors can view own selected fields" ON public.vendor_selected_fields;
CREATE POLICY "Vendors can manage own selected fields"
  ON public.vendor_selected_fields FOR ALL
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM public.vendors 
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM public.vendors 
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- =====================================================
-- Vendor Approval Log
-- =====================================================

DROP POLICY IF EXISTS "Admins can insert approval logs" ON public.vendor_approval_log;
CREATE POLICY "Admins can insert approval logs"
  ON public.vendor_approval_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = (SELECT auth.uid()) 
      AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can read all approval logs" ON public.vendor_approval_log;
CREATE POLICY "Admins can read all approval logs"
  ON public.vendor_approval_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = (SELECT auth.uid()) 
      AND users.role = 'admin'
    )
  );

-- =====================================================
-- Terms and Privacy Settings
-- =====================================================

DROP POLICY IF EXISTS "Admins can insert terms and privacy" ON public.terms_and_privacy_settings;
CREATE POLICY "Admins can insert terms and privacy"
  ON public.terms_and_privacy_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = (SELECT auth.uid()) 
      AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can read all terms and privacy" ON public.terms_and_privacy_settings;
CREATE POLICY "Admins can read all terms and privacy"
  ON public.terms_and_privacy_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = (SELECT auth.uid()) 
      AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update terms and privacy" ON public.terms_and_privacy_settings;
CREATE POLICY "Admins can update terms and privacy"
  ON public.terms_and_privacy_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = (SELECT auth.uid()) 
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = (SELECT auth.uid()) 
      AND users.role = 'admin'
    )
  );

-- =====================================================
-- Vendor Notifications - Remove Duplicate Policies
-- =====================================================

DROP POLICY IF EXISTS "المسؤولون يمكنهم قراءة جميع الإشع" ON public.vendor_notifications;
DROP POLICY IF EXISTS "الموردون يمكنهم قراءة إشعاراتهم ا" ON public.vendor_notifications;

-- =====================================================
-- Vendor Fields - Remove Duplicate Anon Policy
-- =====================================================

DROP POLICY IF EXISTS "Anon can read vendor_fields" ON public.vendor_fields;
