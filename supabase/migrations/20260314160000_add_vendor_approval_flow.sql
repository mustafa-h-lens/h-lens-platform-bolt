-- ============================================================
-- Vendor Approval Flow Migration
-- ============================================================

-- 1. Add CHECK constraint on vendors.status
-- First, update any NULL or invalid statuses
UPDATE vendors SET status = 'active' WHERE status IS NULL;
UPDATE vendors SET status = 'active' WHERE status NOT IN ('active', 'inactive', 'blocked');

-- Drop any prior constraint by the same name first so a re-run / fresh
-- replay where it was already added doesn't error.
ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_status_check;
ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_status_check;
ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_status_check;
ALTER TABLE vendors ADD CONSTRAINT vendors_status_check
CHECK (status IN ('pending_approval', 'revision_requested', 'rejected', 'active', 'inactive', 'blocked'));

-- 2. Create vendor_approval_log table
CREATE TABLE IF NOT EXISTS vendor_approval_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected', 'revision_requested', 'resubmitted')),
  reason text,
  performed_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),

  -- Enforce: reason is required for rejected and revision_requested actions
  CONSTRAINT reason_required_for_rejection_and_revision CHECK (
    (action IN ('rejected', 'revision_requested') AND reason IS NOT NULL AND reason != '')
    OR action NOT IN ('rejected', 'revision_requested')
  )
);

CREATE INDEX IF NOT EXISTS idx_vendor_approval_log_vendor_id ON vendor_approval_log(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_approval_log_action ON vendor_approval_log(action);
CREATE INDEX IF NOT EXISTS idx_vendor_approval_log_created_at ON vendor_approval_log(created_at DESC);

-- 3. Change key foreign keys from CASCADE to RESTRICT for deletion protection
-- (vendor_invoices - prevent deleting vendors with invoices)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'vendor_invoices_vendor_id_fkey'
    AND table_name = 'vendor_invoices'
  ) THEN
    ALTER TABLE vendor_invoices DROP CONSTRAINT vendor_invoices_vendor_id_fkey;
    ALTER TABLE vendor_invoices DROP CONSTRAINT IF EXISTS vendor_invoices_vendor_id_fkey;
ALTER TABLE vendor_invoices DROP CONSTRAINT IF EXISTS vendor_invoices_vendor_id_fkey;
ALTER TABLE vendor_invoices ADD CONSTRAINT vendor_invoices_vendor_id_fkey
      FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- 4. RLS policies for vendor_approval_log (admin only)
ALTER TABLE vendor_approval_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read all approval logs" ON vendor_approval_log;
CREATE POLICY "Admins can read all approval logs" ON vendor_approval_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can insert approval logs" ON vendor_approval_log;
CREATE POLICY "Admins can insert approval logs" ON vendor_approval_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Allow anon role to insert (for vendor-initiated actions like submitted/resubmitted via Edge Functions)
DROP POLICY IF EXISTS "Service role can manage approval logs" ON vendor_approval_log;
CREATE POLICY "Service role can manage approval logs" ON vendor_approval_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
