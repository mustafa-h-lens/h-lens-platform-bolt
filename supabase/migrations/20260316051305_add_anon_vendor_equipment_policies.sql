/*
  # Add anon policies for vendor_equipment

  ## Summary
  The vendor portal uses custom OTP authentication with the anon role.
  All other vendor-related tables already have equivalent anon policies from
  migration 20260315_anon_vendor_portal_policies.sql.

  vendor_equipment was missing anon access entirely — it only had authenticated
  role policies. This migration adds the 4 scoped per-operation anon policies
  to match the pattern used across the rest of the vendor portal tables.

  ## Changes
  - vendor_equipment: SELECT, INSERT, UPDATE, DELETE policies for anon role
*/

DROP POLICY IF EXISTS "Anon can read vendor_equipment" ON public.vendor_equipment;
CREATE POLICY "Anon can read vendor_equipment" ON public.vendor_equipment FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Anon can insert vendor_equipment" ON public.vendor_equipment;
CREATE POLICY "Anon can insert vendor_equipment" ON public.vendor_equipment FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can update vendor_equipment" ON public.vendor_equipment;
CREATE POLICY "Anon can update vendor_equipment" ON public.vendor_equipment FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can delete vendor_equipment" ON public.vendor_equipment;
CREATE POLICY "Anon can delete vendor_equipment" ON public.vendor_equipment FOR DELETE TO anon USING (true);
