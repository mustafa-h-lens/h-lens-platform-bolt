-- ============================================================================
-- DROP anon SELECT leak on expense_payments (Finding A)
-- ============================================================================
-- expense_payments held a stray `anon SELECT USING (true)` policy, exposing
-- financial payment records to any anonymous (anon-key) caller. No frontend
-- path uses it (only admin screens read this table, via is_admin()). Dropping
-- the anon policy closes the leak; the existing "Admins can view expense
-- payments" (is_admin()) SELECT policy fully covers legitimate readers
-- (admin/accountant/PM/assistant). No new policy required. PM/assistant
-- project-scoping intentionally NOT changed here.
-- ============================================================================

DROP POLICY IF EXISTS "Anon can read expense_payments" ON public.expense_payments;
