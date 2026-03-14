# Vendor Approval Flow — Deployment Guide

We've added a vendor registration approval flow feature. There are 4 things that need to be done on the Supabase/Bolt side to activate it.

---

## 1. Run this SQL migration on the Supabase database

Go to the SQL Editor in Supabase and run this:

```sql
-- 1. Clean up any NULL/invalid statuses and add CHECK constraint
UPDATE vendors SET status = 'active' WHERE status IS NULL;
UPDATE vendors SET status = 'active' WHERE status NOT IN ('active', 'inactive', 'blocked');

ALTER TABLE vendors
ADD CONSTRAINT vendors_status_check
CHECK (status IN ('pending_approval', 'revision_requested', 'rejected', 'active', 'inactive', 'blocked'));

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

CREATE INDEX idx_vendor_approval_log_vendor_id ON vendor_approval_log(vendor_id);
CREATE INDEX idx_vendor_approval_log_action ON vendor_approval_log(action);
CREATE INDEX idx_vendor_approval_log_created_at ON vendor_approval_log(created_at DESC);

-- 3. Change vendor_invoices FK from CASCADE to RESTRICT (prevents deleting vendors with invoices)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'vendor_invoices_vendor_id_fkey'
    AND table_name = 'vendor_invoices'
  ) THEN
    ALTER TABLE vendor_invoices DROP CONSTRAINT vendor_invoices_vendor_id_fkey;
    ALTER TABLE vendor_invoices ADD CONSTRAINT vendor_invoices_vendor_id_fkey
      FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- 4. RLS policies for vendor_approval_log
ALTER TABLE vendor_approval_log ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Service role can manage approval logs"
  ON vendor_approval_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

---

## 2. Deploy the new Edge Function `send-vendor-status-email`

There's a new Edge Function at `supabase/functions/send-vendor-status-email/index.ts` in the codebase. It needs to be deployed. It uses the same SMTP secrets that `send-otp-email` already uses (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL, SMTP_FROM_NAME), so no new secrets are needed for it to work.

Deploy it using:
```bash
supabase functions deploy send-vendor-status-email
```

Or if you're using Bolt, deploy it through the Bolt interface the same way `send-otp-email` was deployed.

---

## 3. Redeploy the updated `send-otp-email` Edge Function

The `send-otp-email` function at `supabase/functions/send-otp-email/index.ts` has been updated. It now checks the vendor's status before sending an OTP:
- **Blocks** login for: `pending_approval`, `rejected`, `inactive`, `blocked`
- **Allows** login for: `active`, `revision_requested`

It needs to be redeployed:
```bash
supabase functions deploy send-otp-email
```

---

## 4. (Optional) Set two environment variables

These are optional — the code has fallbacks. But if you want the email links to point to the correct URLs, set these as Supabase secrets:

- **`VENDOR_LOGIN_URL`** — The full URL to the vendor login page (e.g., `https://your-domain.com/vendor-login`)
- **`ADMIN_URL`** — The full URL to the admin panel (e.g., `https://your-domain.com/#vendors`)

```bash
supabase secrets set VENDOR_LOGIN_URL=https://your-domain.com/vendor-login
supabase secrets set ADMIN_URL=https://your-domain.com/#vendors
```

If not set, the email links will use a URL derived from the Supabase project URL, which may not be correct.

---

---

## 5. Run the comprehensive activity logging migration

There's a second SQL migration that adds activity logging triggers for vendors, expenses, purchase orders, production tasks, and settings. Run the contents of this file in the Supabase SQL Editor:

**File:** `supabase/migrations/20260314170000_add_comprehensive_activity_logging.sql`

This creates:
- `vendor_activity_log` table (was referenced but never created)
- Triggers on: `vendors`, `vendor_equipment`, `vendor_documents`, `vendor_invoices`, `expense_payments`, `purchase_orders`, `production_tasks`, `settings_config`, `terms_and_privacy_settings`
- Recreates the `global_activity_log` view to include all sources

---

**After these 5 steps, the approval flow and full activity logging will be active.**
