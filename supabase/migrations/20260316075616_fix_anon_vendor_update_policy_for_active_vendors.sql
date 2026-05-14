/*
  # Fix anon UPDATE policy on vendors for active vendor portal

  ## Problem
  The current "Anon can update draft vendors" policy restricts anonymous updates
  to vendors with status = 'draft' only. This blocks active vendors from updating
  their own profile (nationality, phone, city, portfolio URL, etc.) via the vendor
  portal after approval.

  ## Change
  Replace the draft-only UPDATE policy with one that covers all vendor statuses
  where self-service editing is legitimate:
    - 'draft'              — initial registration flow
    - 'active'             — approved vendors managing their profile
    - 'revision_requested' — vendors asked to update information before re-approval

  ## Security Notes
  - The vendor portal uses OTP-based authentication without Supabase Auth JWT claims,
    so no per-row identity check (e.g. id = auth.uid()) is possible at the DB layer.
  - Status gating is the available server-side constraint: statuses like
    'pending_approval', 'rejected', 'blocked', and 'suspended' remain non-updatable
    by anon, preserving admin control over those records.
  - Admin-authenticated UPDATE policy remains unchanged and unrestricted by status.
*/

DROP POLICY IF EXISTS "Anon can update draft vendors" ON public.vendors;

DROP POLICY IF EXISTS "Anon can update editable vendors" ON public.vendors;
CREATE POLICY "Anon can update editable vendors" ON public.vendors
  FOR UPDATE
  TO anon
  USING (status IN ('draft', 'active', 'revision_requested'))
  WITH CHECK (status IN ('draft', 'active', 'revision_requested'));
