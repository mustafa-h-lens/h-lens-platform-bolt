/*
  # Vendor Approval Flow Migration

  1. Changes
    - Add CHECK constraint to vendors.status for valid approval statuses (if not exists)
    - Create vendor_approval_log table to track approval workflow
    - Change vendor_invoices FK from CASCADE to RESTRICT (prevent deletion of vendors with invoices)
    - Add RLS policies for vendor_approval_log

  2. New Tables
    - `vendor_approval_log`
      - `id` (uuid, primary key)
      - `vendor_id` (uuid, foreign key to vendors)
      - `action` (text, check constraint for valid actions)
      - `reason` (text, required for rejection/revision)
      - `performed_by` (uuid, foreign key to users)
      - `created_at` (timestamptz)

  3. Security
    - Enable RLS on vendor_approval_log
    - Admins can read and insert approval logs
    - Service role has full access
*/

-- 1. Clean up any NULL/invalid statuses and add CHECK constraint
UPDATE vendors SET status = 'active' WHERE status IS NULL;
UPDATE vendors SET status = 'active' WHERE status NOT IN ('active', 'inactive', 'blocked');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'vendors_status_check'
    AND table_name = 'vendors'
  ) THEN
    ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_status_check;
ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_status_check;
ALTER TABLE vendors ADD CONSTRAINT vendors_status_check
    CHECK (status IN ('pending_approval', 'revision_requested', 'rejected', 'active', 'inactive', 'blocked'));
  END IF;
END $$;

-- 2. Create vendor_approval_log table
CREATE TABLE IF NOT EXISTS vendor_approval_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected', 'revision_requested', 'resubmitted')),
  reason text,
  performed_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),

  CONSTRAINT reason_required_for_rejection_and_revision CHECK (
    (action IN ('rejected', 'revision_requested') AND reason IS NOT NULL AND reason != '')
    OR action NOT IN ('rejected', 'revision_requested')
  )
);

CREATE INDEX IF NOT EXISTS idx_vendor_approval_log_vendor_id ON vendor_approval_log(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_approval_log_action ON vendor_approval_log(action);
CREATE INDEX IF NOT EXISTS idx_vendor_approval_log_created_at ON vendor_approval_log(created_at DESC);

-- 3. Change vendor_invoices FK from CASCADE to RESTRICT
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

-- 4. RLS policies for vendor_approval_log
ALTER TABLE vendor_approval_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read all approval logs" ON vendor_approval_log;
CREATE POLICY "Admins can read all approval logs"
  ON vendor_approval_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can insert approval logs" ON vendor_approval_log;
CREATE POLICY "Admins can insert approval logs"
  ON vendor_approval_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Service role can manage approval logs" ON vendor_approval_log;
CREATE POLICY "Service role can manage approval logs"
  ON vendor_approval_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);