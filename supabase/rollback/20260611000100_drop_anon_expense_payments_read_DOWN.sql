-- ============================================================================
-- ROLLBACK for 20260611000100_drop_anon_expense_payments_read
-- Recreates the anon SELECT policy. WARNING: this re-opens the financial
-- expense_payments read leak to anonymous callers — emergency revert only.
-- ============================================================================

CREATE POLICY "Anon can read expense_payments" ON public.expense_payments
  FOR SELECT TO anon USING (true);
