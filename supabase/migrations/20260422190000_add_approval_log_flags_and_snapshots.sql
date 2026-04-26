-- P1 Foundation: structured revision flags + submission snapshots
-- ------------------------------------------------------------------
-- Adds a `flags` jsonb column to vendor_approval_log so admins can flag
-- specific registration steps/fields when requesting a revision, and
-- creates vendor_submission_snapshots to append-only record the full
-- vendor payload at each submit/resubmit for audit and client-side diff.

-- 1. Structured flags on approval log rows ---------------------------
ALTER TABLE vendor_approval_log
  ADD COLUMN IF NOT EXISTS flags jsonb;

COMMENT ON COLUMN vendor_approval_log.flags IS
  'For revision_requested rows: { steps: { <stepId>: { comment: text, fields: text[] } } }.
   For resubmitted rows: { delta: { <stepId>: { <fieldName>: {from,to} } } }.
   NULL for legacy rows and for non-flagging actions (approved, rejected, submitted).';

CREATE INDEX IF NOT EXISTS idx_approval_log_flags_gin
  ON vendor_approval_log USING gin (flags)
  WHERE flags IS NOT NULL;

-- 2. Submission snapshots (append-only audit log) --------------------
CREATE TABLE IF NOT EXISTS vendor_submission_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('submitted', 'resubmitted')),
  submission_payload jsonb NOT NULL,
  performed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE vendor_submission_snapshots IS
  'Immutable history of every full submit/resubmit. Used for diff rendering
   in the admin review page and to show vendors what they previously submitted.';

CREATE INDEX IF NOT EXISTS idx_snapshots_vendor_created
  ON vendor_submission_snapshots (vendor_id, created_at DESC);

-- 3. RLS — snapshots are read-only for vendors (own rows) + full for admins
ALTER TABLE vendor_submission_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "snapshots_admin_all" ON vendor_submission_snapshots;
CREATE POLICY "snapshots_admin_all" ON vendor_submission_snapshots
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role IN ('super_admin', 'admin', 'accountant')
    )
  );

DROP POLICY IF EXISTS "snapshots_vendor_select_own" ON vendor_submission_snapshots;
CREATE POLICY "snapshots_vendor_select_own" ON vendor_submission_snapshots
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vendors v
      WHERE v.id = vendor_submission_snapshots.vendor_id
        AND v.user_id = auth.uid()
    )
  );

-- Service role bypasses RLS automatically — edge functions use it for writes.
