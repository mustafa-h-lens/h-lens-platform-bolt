/*
  # Fix expense_payments INSERT/UPDATE RLS policies

  The INSERT policy only allowed users with role = 'admin', silently blocking
  super_admin and project_manager from recording payments. The UPDATE policy
  allowed admin + super_admin but not project_manager.

  Standardize on is_admin() (which covers super_admin + project_manager).
*/

DROP POLICY IF EXISTS "Admins can insert expense payments" ON public.expense_payments;
CREATE POLICY "Admins can insert expense payments" ON public.expense_payments
  FOR INSERT TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update expense payments" ON public.expense_payments;
CREATE POLICY "Admins can update expense payments" ON public.expense_payments
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
