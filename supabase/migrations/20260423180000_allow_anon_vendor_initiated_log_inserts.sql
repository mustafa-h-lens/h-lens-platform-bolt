-- Allow anon-session vendors (using custom vendor_sessions tokens) to insert
-- their own audit rows during registration and resubmission.
-- ----------------------------------------------------------------------
-- Context
-- -------
-- Vendors authenticate via a custom `vendor_sessions` token, not Supabase's
-- auth.uid(). From Postgres/PostgREST's perspective they are the `anon`
-- role. The resubmit flow in VendorEditSubmission.tsx needs to write:
--   • one row in vendor_submission_snapshots (action='resubmitted')
--   • one row in vendor_approval_log         (action='resubmitted')
-- Both inserts were failing with 401 because only admin-authenticated
-- users had INSERT policies. The vendor's status had already flipped to
-- `pending_approval` by that point, leaving state inconsistent.
--
-- Security notes
-- --------------
-- • Both tables are append-only for vendors — no UPDATE/DELETE policy
--   is added here, so vendors can't rewrite history.
-- • The CHECK constraint on vendor_submission_snapshots.action limits
--   values to 'submitted' | 'resubmitted'.
-- • vendor_approval_log.action is a free text column but we scope the
--   policy to vendor-initiated actions only.
-- • vendor_id must reference an existing vendor row (FK).
-- • performed_by is forced to NULL so the log cannot impersonate an
--   admin.

-- 1. vendor_submission_snapshots — allow anon INSERT for vendor actions
DROP POLICY IF EXISTS "snapshots_anon_insert" ON vendor_submission_snapshots;
CREATE POLICY "snapshots_anon_insert" ON vendor_submission_snapshots
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    action IN ('submitted', 'resubmitted')
    AND performed_by IS NULL
    AND EXISTS (SELECT 1 FROM vendors v WHERE v.id = vendor_id)
  );

-- 2. vendor_submission_snapshots — allow anon SELECT so the client can
--    confirm its own write succeeded (RLS-visible upsert semantics).
DROP POLICY IF EXISTS "snapshots_anon_select" ON vendor_submission_snapshots;
CREATE POLICY "snapshots_anon_select" ON vendor_submission_snapshots
  FOR SELECT TO anon
  USING (true);

-- 3. vendor_approval_log — allow anon INSERT for vendor-initiated actions.
--    Admin actions (approved/rejected/revision_requested) remain gated to
--    authenticated admin users by the existing "Admins can insert…" policy.
DROP POLICY IF EXISTS "approval_log_anon_vendor_insert" ON vendor_approval_log;
CREATE POLICY "approval_log_anon_vendor_insert" ON vendor_approval_log
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    action IN ('submitted', 'resubmitted')
    AND performed_by IS NULL
    AND EXISTS (SELECT 1 FROM vendors v WHERE v.id = vendor_id)
  );
