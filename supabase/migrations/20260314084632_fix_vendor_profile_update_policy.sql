/*
  # إصلاح سياسة تحديث الملف الشخصي للموردين

  ## المشكلة
  - السياسة الحالية تتحقق من `user_id = auth.uid()`
  - لكن الموردين الذين يسجلون دخول مباشرة لديهم `user_id = null`
  - بالتالي لا يمكنهم تحديث بياناتهم (فقط الأدمن)

  ## الحل
  - تعديل السياسة للسماح للمورد بتحديث بياناته إذا كان `id = auth.uid()`
  - هذا يسمح للموردين الذين سجلوا دخول من البوابة بتحديث بياناتهم
  - الأدمن ما زال يمكنه التحديث كالمعتاد

  ## التغييرات
  - تعديل سياسة UPDATE على جدول vendors
  - إضافة شرط `id = auth.uid()` بدلاً من `user_id = auth.uid()` فقط
*/

-- حذف السياسة القديمة
DROP POLICY IF EXISTS "Users can update vendors" ON public.vendors;

-- إنشاء السياسة الجديدة
DROP POLICY IF EXISTS "Users can update vendors" ON public.vendors;
CREATE POLICY "Users can update vendors" ON public.vendors
  FOR UPDATE
  TO authenticated
  USING (
    -- الأدمن يمكنه تحديث أي مورد
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    ) 
    -- أو المورد نفسه (إذا سجل دخول مباشرة، id = auth.uid())
    OR id = auth.uid()
    -- أو إذا كان مرتبط بـ user_id (حالات قديمة)
    OR user_id = auth.uid()
  )
  WITH CHECK (
    -- نفس الشروط للتحقق
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    ) 
    OR id = auth.uid()
    OR user_id = auth.uid()
  );
