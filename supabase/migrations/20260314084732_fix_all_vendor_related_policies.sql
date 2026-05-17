/*
  # إصلاح جميع سياسات RLS للجداول المتعلقة بالموردين

  ## المشكلة
  - جميع السياسات تتحقق من `vendors.user_id = auth.uid()`
  - لكن الموردين الذين يسجلون دخول مباشرة لديهم `user_id = null`
  - بالتالي لا يمكنهم تحديث/إضافة بياناتهم المالية، الخدمات، والمستندات

  ## الحل
  - تعديل السياسات للتحقق من `vendors.id = auth.uid()` بدلاً من `vendors.user_id`
  - هذا يسمح للموردين الذين سجلوا دخول من البوابة بإدارة بياناتهم

  ## الجداول المتأثرة
  - vendor_financial_data
  - vendor_selected_fields
  - vendor_documents
*/

-- ══════════════════════════════════════════════════════════════
-- vendor_financial_data
-- ══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can insert vendor financial data" ON public.vendor_financial_data;
CREATE POLICY "Users can insert vendor financial data"
  ON public.vendor_financial_data
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.vendors
      WHERE vendors.id = vendor_financial_data.vendor_id
      AND (vendors.id = auth.uid() OR vendors.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update vendor financial data" ON public.vendor_financial_data;
CREATE POLICY "Users can update vendor financial data"
  ON public.vendor_financial_data
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.vendors
      WHERE vendors.id = vendor_financial_data.vendor_id
      AND (vendors.id = auth.uid() OR vendors.user_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.vendors
      WHERE vendors.id = vendor_financial_data.vendor_id
      AND (vendors.id = auth.uid() OR vendors.user_id = auth.uid())
    )
  );

-- ══════════════════════════════════════════════════════════════
-- vendor_selected_fields
-- ══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Admins can manage vendor selected fields" ON public.vendor_selected_fields;
DROP POLICY IF EXISTS "Vendors can view own selected fields" ON public.vendor_selected_fields;

CREATE POLICY "Vendors can view own selected fields"
  ON public.vendor_selected_fields
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.vendors
      WHERE vendors.id = vendor_selected_fields.vendor_id
      AND (vendors.id = auth.uid() OR vendors.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Vendors can manage own selected fields" ON public.vendor_selected_fields;
CREATE POLICY "Vendors can manage own selected fields" ON public.vendor_selected_fields
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.vendors
      WHERE vendors.id = vendor_selected_fields.vendor_id
      AND (vendors.id = auth.uid() OR vendors.user_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.vendors
      WHERE vendors.id = vendor_selected_fields.vendor_id
      AND (vendors.id = auth.uid() OR vendors.user_id = auth.uid())
    )
  );

-- ══════════════════════════════════════════════════════════════
-- vendor_documents
-- ══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can view vendor documents" ON public.vendor_documents;
CREATE POLICY "Users can view vendor documents"
  ON public.vendor_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.vendors
      WHERE vendors.id = vendor_documents.vendor_id
      AND (vendors.id = auth.uid() OR vendors.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert vendor documents" ON public.vendor_documents;
CREATE POLICY "Users can insert vendor documents"
  ON public.vendor_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.vendors
      WHERE vendors.id = vendor_documents.vendor_id
      AND (vendors.id = auth.uid() OR vendors.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update vendor documents" ON public.vendor_documents;
CREATE POLICY "Users can update vendor documents"
  ON public.vendor_documents
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.vendors
      WHERE vendors.id = vendor_documents.vendor_id
      AND (vendors.id = auth.uid() OR vendors.user_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.vendors
      WHERE vendors.id = vendor_documents.vendor_id
      AND (vendors.id = auth.uid() OR vendors.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete vendor documents" ON public.vendor_documents;
CREATE POLICY "Users can delete vendor documents"
  ON public.vendor_documents
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.vendors
      WHERE vendors.id = vendor_documents.vendor_id
      AND (vendors.id = auth.uid() OR vendors.user_id = auth.uid())
    )
  );
