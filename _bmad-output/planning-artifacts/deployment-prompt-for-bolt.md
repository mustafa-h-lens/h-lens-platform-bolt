# Deployment Tasks — Run on Supabase/Bolt

We've added two features that need database migrations and edge function deployments. Pull the latest code from main, then run these tasks **in order**.

---

## Migration 1: Vendor Approval Flow

Run this SQL in the Supabase SQL Editor. It adds the approval workflow system (new statuses, approval log table, deletion protection, RLS policies):

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

-- 3. Change vendor_invoices FK from CASCADE to RESTRICT
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

## Migration 2: Comprehensive Activity Logging

Run this SQL second. It creates the missing `vendor_activity_log` table, adds triggers for all admin actions (vendors, expenses, purchase orders, production tasks, settings), and recreates the global activity log view:

```sql
-- 1. Create vendor_activity_log table
CREATE TABLE IF NOT EXISTS public.vendor_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE CASCADE,
  performed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  entity_type text NOT NULL DEFAULT 'vendor',
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_activity_log_vendor_id ON public.vendor_activity_log(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_activity_log_created_at ON public.vendor_activity_log(created_at DESC);

ALTER TABLE public.vendor_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view vendor activity logs"
  ON public.vendor_activity_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin')));

CREATE POLICY "Admins can insert vendor activity logs"
  ON public.vendor_activity_log FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin')));

CREATE POLICY "Service role can manage vendor activity logs"
  ON public.vendor_activity_log FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 2. Vendor triggers (CRUD + status changes)
CREATE OR REPLACE FUNCTION public.log_vendor_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.vendor_activity_log (vendor_id, performed_by, action_type, entity_type, details)
    VALUES (NEW.id, auth.uid(), 'vendor_created', 'vendor',
      jsonb_build_object('full_name', NEW.full_name, 'vendor_type', NEW.vendor_type, 'status', NEW.status));
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.vendor_activity_log (vendor_id, performed_by, action_type, entity_type, details)
      VALUES (NEW.id, auth.uid(), 'vendor_status_changed', 'vendor',
        jsonb_build_object('full_name', NEW.full_name, 'from', OLD.status, 'to', NEW.status));
    ELSE
      INSERT INTO public.vendor_activity_log (vendor_id, performed_by, action_type, entity_type, details)
      VALUES (NEW.id, auth.uid(), 'vendor_updated', 'vendor',
        jsonb_build_object('full_name', NEW.full_name));
    END IF;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.vendor_activity_log (vendor_id, performed_by, action_type, entity_type, details)
    VALUES (OLD.id, auth.uid(), 'vendor_deleted', 'vendor',
      jsonb_build_object('full_name', OLD.full_name));
    RETURN OLD;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS vendor_changes_trigger ON public.vendors;
CREATE TRIGGER vendor_changes_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.vendors
FOR EACH ROW EXECUTE FUNCTION public.log_vendor_changes();

-- 3. Vendor equipment triggers
CREATE OR REPLACE FUNCTION public.log_vendor_equipment_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_name text;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    SELECT full_name INTO v_name FROM public.vendors WHERE id = OLD.vendor_id;
    INSERT INTO public.vendor_activity_log (vendor_id, performed_by, action_type, entity_type, details)
    VALUES (OLD.vendor_id, auth.uid(), 'equipment_deleted', 'equipment',
      jsonb_build_object('equipment_name', OLD.name, 'vendor_name', v_name));
    RETURN OLD;
  ELSE
    SELECT full_name INTO v_name FROM public.vendors WHERE id = NEW.vendor_id;
    INSERT INTO public.vendor_activity_log (vendor_id, performed_by, action_type, entity_type, details)
    VALUES (NEW.vendor_id, auth.uid(),
      CASE WHEN TG_OP = 'INSERT' THEN 'equipment_added' ELSE 'equipment_updated' END,
      'equipment', jsonb_build_object('equipment_name', NEW.name, 'vendor_name', v_name));
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS vendor_equipment_changes_trigger ON public.vendor_equipment;
CREATE TRIGGER vendor_equipment_changes_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.vendor_equipment
FOR EACH ROW EXECUTE FUNCTION public.log_vendor_equipment_changes();

-- 4. Vendor documents triggers
CREATE OR REPLACE FUNCTION public.log_vendor_document_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_name text;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    SELECT full_name INTO v_name FROM public.vendors WHERE id = OLD.vendor_id;
    INSERT INTO public.vendor_activity_log (vendor_id, performed_by, action_type, entity_type, details)
    VALUES (OLD.vendor_id, auth.uid(), 'document_deleted', 'document',
      jsonb_build_object('file_name', OLD.file_name, 'vendor_name', v_name));
    RETURN OLD;
  ELSE
    SELECT full_name INTO v_name FROM public.vendors WHERE id = NEW.vendor_id;
    INSERT INTO public.vendor_activity_log (vendor_id, performed_by, action_type, entity_type, details)
    VALUES (NEW.vendor_id, auth.uid(), 'document_uploaded', 'document',
      jsonb_build_object('file_name', NEW.file_name, 'document_type', NEW.document_type, 'vendor_name', v_name));
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS vendor_document_changes_trigger ON public.vendor_documents;
CREATE TRIGGER vendor_document_changes_trigger
AFTER INSERT OR DELETE ON public.vendor_documents
FOR EACH ROW EXECUTE FUNCTION public.log_vendor_document_changes();

-- 5. Vendor invoices / expenses triggers
CREATE OR REPLACE FUNCTION public.log_vendor_invoice_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_name text;
BEGIN
  SELECT full_name INTO v_name FROM public.vendors WHERE id = COALESCE(NEW.vendor_id, OLD.vendor_id);
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.vendor_activity_log (vendor_id, performed_by, action_type, entity_type, details)
    VALUES (NEW.vendor_id, auth.uid(), 'expense_created', 'expense',
      jsonb_build_object('vendor_name', v_name, 'amount', NEW.amount_total, 'status', NEW.status));
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.vendor_activity_log (vendor_id, performed_by, action_type, entity_type, details)
      VALUES (NEW.vendor_id, auth.uid(), 'expense_status_changed', 'expense',
        jsonb_build_object('vendor_name', v_name, 'from', OLD.status, 'to', NEW.status, 'amount', NEW.amount_total));
    END IF;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.vendor_activity_log (vendor_id, performed_by, action_type, entity_type, details)
    VALUES (OLD.vendor_id, auth.uid(), 'expense_deleted', 'expense',
      jsonb_build_object('vendor_name', v_name, 'amount', OLD.amount_total));
    RETURN OLD;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS vendor_invoice_changes_trigger ON public.vendor_invoices;
CREATE TRIGGER vendor_invoice_changes_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.vendor_invoices
FOR EACH ROW EXECUTE FUNCTION public.log_vendor_invoice_changes();

-- 6. Expense payments triggers
CREATE OR REPLACE FUNCTION public.log_expense_payment_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_id uuid; v_name text;
BEGIN
  SELECT vi.vendor_id, vd.full_name INTO v_id, v_name
  FROM public.vendor_invoices vi JOIN public.vendors vd ON vd.id = vi.vendor_id
  WHERE vi.id = COALESCE(NEW.expense_id, OLD.expense_id);
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.vendor_activity_log (vendor_id, performed_by, action_type, entity_type, details)
    VALUES (v_id, auth.uid(), 'payment_added', 'payment',
      jsonb_build_object('vendor_name', v_name, 'amount', NEW.amount, 'method', NEW.payment_method));
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.vendor_activity_log (vendor_id, performed_by, action_type, entity_type, details)
    VALUES (v_id, auth.uid(), 'payment_deleted', 'payment',
      jsonb_build_object('vendor_name', v_name, 'amount', OLD.amount));
    RETURN OLD;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS expense_payment_changes_trigger ON public.expense_payments;
CREATE TRIGGER expense_payment_changes_trigger
AFTER INSERT OR DELETE ON public.expense_payments
FOR EACH ROW EXECUTE FUNCTION public.log_expense_payment_changes();

-- 7. Purchase orders triggers
CREATE OR REPLACE FUNCTION public.log_purchase_order_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
    VALUES (auth.uid(), 'po_created', 'purchase_order', NEW.id, NEW.po_number,
      jsonb_build_object('total_amount', NEW.total_amount, 'status', NEW.status));
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
      VALUES (auth.uid(), 'po_status_changed', 'purchase_order', NEW.id, NEW.po_number,
        jsonb_build_object('from', OLD.status, 'to', NEW.status));
    END IF;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
    VALUES (auth.uid(), 'po_deleted', 'purchase_order', OLD.id, OLD.po_number,
      jsonb_build_object('total_amount', OLD.total_amount));
    RETURN OLD;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS purchase_order_changes_trigger ON public.purchase_orders;
CREATE TRIGGER purchase_order_changes_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.purchase_orders
FOR EACH ROW EXECUTE FUNCTION public.log_purchase_order_changes();

-- 8. Production tasks triggers
CREATE OR REPLACE FUNCTION public.log_production_task_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
    VALUES (auth.uid(), 'task_created', 'production_task', NEW.id, NEW.name,
      jsonb_build_object('amount', NEW.amount, 'status', NEW.status));
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
      VALUES (auth.uid(), 'task_status_changed', 'production_task', NEW.id, NEW.name,
        jsonb_build_object('from', OLD.status, 'to', NEW.status));
    END IF;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
    VALUES (auth.uid(), 'task_deleted', 'production_task', OLD.id, OLD.name, '{}'::jsonb);
    RETURN OLD;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS production_task_changes_trigger ON public.production_tasks;
CREATE TRIGGER production_task_changes_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.production_tasks
FOR EACH ROW EXECUTE FUNCTION public.log_production_task_changes();

-- 9. Settings triggers
CREATE OR REPLACE FUNCTION public.log_settings_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
  VALUES (auth.uid(), 'settings_updated', 'settings', NEW.id, TG_TABLE_NAME,
    jsonb_build_object('table', TG_TABLE_NAME));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS settings_config_changes_trigger ON public.settings_config;
CREATE TRIGGER settings_config_changes_trigger
AFTER INSERT OR UPDATE ON public.settings_config
FOR EACH ROW EXECUTE FUNCTION public.log_settings_changes();

DROP TRIGGER IF EXISTS terms_privacy_changes_trigger ON public.terms_and_privacy_settings;
CREATE TRIGGER terms_privacy_changes_trigger
AFTER INSERT OR UPDATE ON public.terms_and_privacy_settings
FOR EACH ROW EXECUTE FUNCTION public.log_settings_changes();

-- 10. Recreate global_activity_log view
CREATE OR REPLACE VIEW public.global_activity_log AS
SELECT al.id, 'project' AS source_type, al.action_type, 'project' AS entity_type,
  al.project_id AS entity_id, p.name AS entity_name,
  COALESCE(u.full_name, 'النظام') AS user_name, al.user_id, al.action_details, al.created_at
FROM public.activity_logs al
LEFT JOIN public.users u ON u.id = al.user_id
LEFT JOIN public.projects p ON p.id = al.project_id
UNION ALL
SELECT val.id, 'vendor' AS source_type, val.action_type, val.entity_type,
  val.vendor_id AS entity_id, v.full_name AS entity_name,
  COALESCE(u.full_name, 'النظام') AS user_name, val.performed_by AS user_id, val.details AS action_details, val.created_at
FROM public.vendor_activity_log val
LEFT JOIN public.users u ON u.id = val.performed_by
LEFT JOIN public.vendors v ON v.id = val.vendor_id
UNION ALL
SELECT sal.id, 'system' AS source_type, sal.action_type, sal.entity_type,
  sal.entity_id, sal.entity_name,
  COALESCE(u.full_name, 'النظام') AS user_name, sal.user_id, sal.action_details, sal.created_at
FROM public.system_activity_log sal
LEFT JOIN public.users u ON u.id = sal.user_id;

GRANT SELECT ON public.global_activity_log TO authenticated;
```

---

## Edge Functions (3 tasks)

**Task 1:** Deploy the new Edge Function `send-vendor-status-email`:
```bash
supabase functions deploy send-vendor-status-email
```
It uses the same SMTP secrets as `send-otp-email` — no new secrets needed.

**Task 2:** Redeploy the updated `send-otp-email` (now blocks login for pending/rejected vendors):
```bash
supabase functions deploy send-otp-email
```

**Task 3 (Optional):** Set email link URLs as Supabase secrets:
```bash
supabase secrets set VENDOR_LOGIN_URL=https://your-domain.com/vendor-login
supabase secrets set ADMIN_URL=https://your-domain.com/#vendors
```

---

---

## Migration 3: Simplify Roles

Run this SQL last. It converts the old `admin` role to `project_manager`, merges `client_user` into `client`, and updates all RLS policies:

```sql
-- 1. Update existing admin users → project_manager
UPDATE users SET role = 'project_manager' WHERE role = 'admin';

-- 2. Convert client_user to client
UPDATE users SET role = 'client' WHERE role = 'client_user';

-- 3. Drop old CHECK constraint and create new one
DO $$
BEGIN
  ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
  ALTER TABLE users DROP CONSTRAINT IF EXISTS check_role;
  ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('super_admin', 'project_manager', 'client'));
EXCEPTION
  WHEN others THEN
    ALTER TABLE users ADD CONSTRAINT users_role_check
      CHECK (role IN ('super_admin', 'project_manager', 'client'));
END $$;

-- 4. Update is_admin() function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('project_manager', 'super_admin')
    AND is_active = true
  );
END;
$$;

-- 5. Update RLS policies that hardcode 'admin' role
DROP POLICY IF EXISTS "Admins can read all approval logs" ON vendor_approval_log;
CREATE POLICY "Admins can read all approval logs"
  ON vendor_approval_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('project_manager', 'super_admin')));

DROP POLICY IF EXISTS "Admins can insert approval logs" ON vendor_approval_log;
CREATE POLICY "Admins can insert approval logs"
  ON vendor_approval_log FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('project_manager', 'super_admin')));

DROP POLICY IF EXISTS "Admins can view system activity logs" ON system_activity_log;
CREATE POLICY "Admins can view system activity logs"
  ON system_activity_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('project_manager', 'super_admin')));

DROP POLICY IF EXISTS "System can insert activity logs" ON system_activity_log;
CREATE POLICY "System can insert activity logs"
  ON system_activity_log FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('project_manager', 'super_admin')));

DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins can view vendor activity logs" ON vendor_activity_log;
  CREATE POLICY "Admins can view vendor activity logs"
    ON vendor_activity_log FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('project_manager', 'super_admin')));

  DROP POLICY IF EXISTS "Admins can insert vendor activity logs" ON vendor_activity_log;
  CREATE POLICY "Admins can insert vendor activity logs"
    ON vendor_activity_log FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('project_manager', 'super_admin')));
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;
```

**After this migration:**
- `admin` users become `project_manager` (can see everything except Settings, User Management, Activity Log)
- `client_user` users become `client`
- `super_admin` and `client` stay unchanged
- Once confirmed working, the `|| profile?.role === 'admin'` fallbacks in the frontend code can be removed

---

**Run order: Migration 1 → Migration 2 → Migration 3 → Edge Functions. After all steps, everything will be active.**
