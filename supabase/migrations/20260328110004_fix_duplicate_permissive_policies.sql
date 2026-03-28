
/*
  # Fix Duplicate/Conflicting Permissive Policies

  ## Summary
  Removes redundant duplicate policies that cause multiple permissive policy warnings.
  Where two policies cover the same role+action, the more restrictive/specific one is kept
  and the overly broad one is removed.

  ## Tables Fixed
  - expense_payments: Remove the catch-all "Authenticated can manage expense_payments"
  - vendor_invoices: Remove the catch-all "Authenticated can manage vendor_invoices"
  - vendor_documents (anon): Remove the broad always-true policies, keep the draft-scoped ones
  - vendor_financial_data (anon): Remove the broad always-true policies, keep the draft-scoped ones
  - vendor_selected_fields (anon): Remove the broad always-true policies, keep the draft-scoped ones
  - vendor_travel_documents (anon): Remove the broad always-true policies, keep the draft-scoped ones
*/

-- expense_payments: drop the broad catch-all, keep the specific admin-only policies
DROP POLICY IF EXISTS "Authenticated can manage expense_payments" ON public.expense_payments;

-- vendor_invoices: drop the broad catch-all, keep the specific role-checked policies
DROP POLICY IF EXISTS "Authenticated can manage vendor_invoices" ON public.vendor_invoices;

-- vendor_documents anon: drop the always-true broad ones, keep the draft-scoped ones
DROP POLICY IF EXISTS "Anon delete vendor_documents" ON public.vendor_documents;
DROP POLICY IF EXISTS "Anon insert vendor_documents" ON public.vendor_documents;
DROP POLICY IF EXISTS "Anon read vendor_documents" ON public.vendor_documents;
DROP POLICY IF EXISTS "Anon update vendor_documents" ON public.vendor_documents;

-- vendor_financial_data anon: drop the always-true broad ones, keep the draft-scoped ones
DROP POLICY IF EXISTS "Anon delete vendor_financial_data" ON public.vendor_financial_data;
DROP POLICY IF EXISTS "Anon insert vendor_financial_data" ON public.vendor_financial_data;
DROP POLICY IF EXISTS "Anon read vendor_financial_data" ON public.vendor_financial_data;
DROP POLICY IF EXISTS "Anon update vendor_financial_data" ON public.vendor_financial_data;

-- vendor_selected_fields anon: drop the always-true broad ones, keep the draft-scoped ones
DROP POLICY IF EXISTS "Anon delete vendor_selected_fields" ON public.vendor_selected_fields;
DROP POLICY IF EXISTS "Anon insert vendor_selected_fields" ON public.vendor_selected_fields;
DROP POLICY IF EXISTS "Anon read vendor_selected_fields" ON public.vendor_selected_fields;
DROP POLICY IF EXISTS "Anon update vendor_selected_fields" ON public.vendor_selected_fields;

-- vendor_travel_documents anon: drop the always-true broad ones, keep the draft-scoped ones
DROP POLICY IF EXISTS "Anon delete vendor_travel_documents" ON public.vendor_travel_documents;
DROP POLICY IF EXISTS "Anon insert vendor_travel_documents" ON public.vendor_travel_documents;
DROP POLICY IF EXISTS "Anon read vendor_travel_documents" ON public.vendor_travel_documents;
DROP POLICY IF EXISTS "Anon update vendor_travel_documents" ON public.vendor_travel_documents;
