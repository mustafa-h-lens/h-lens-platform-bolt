/*
  # Comprehensive Activity Logging Migration (Complete)

  1. New Tables
    - `system_activity_log` - For system-wide activities (POs, tasks, settings)

  2. Schema Updates
    - Add missing columns to vendor_activity_log

  3. Database Triggers
    - Vendor changes, equipment, documents, invoices, payments
    - Purchase orders, production tasks, settings

  4. Views
    - `global_activity_log` - Unified activity view

  5. Security
    - RLS policies for all activity tables
*/

-- 1. Create system_activity_log table
CREATE TABLE IF NOT EXISTS public.system_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  entity_name text,
  action_details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_activity_log_user_id ON public.system_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_system_activity_log_entity_type ON public.system_activity_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_system_activity_log_created_at ON public.system_activity_log(created_at DESC);

ALTER TABLE public.system_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view system activity logs"
  ON public.system_activity_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin')));

CREATE POLICY "System can insert activity logs"
  ON public.system_activity_log FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin')));

CREATE POLICY "Service role can manage system activity logs"
  ON public.system_activity_log FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 2. Add missing columns to vendor_activity_log
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendor_activity_log' AND column_name = 'action_type') THEN
    ALTER TABLE public.vendor_activity_log ADD COLUMN action_type text;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendor_activity_log' AND column_name = 'action') THEN
      UPDATE public.vendor_activity_log SET action_type = action WHERE action_type IS NULL;
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendor_activity_log' AND column_name = 'entity_type') THEN
    ALTER TABLE public.vendor_activity_log ADD COLUMN entity_type text DEFAULT 'vendor';
  END IF;
END $$;

-- 3. Vendor triggers
CREATE OR REPLACE FUNCTION public.log_vendor_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.vendor_activity_log (vendor_id, performed_by, action_type, entity_type, details)
    VALUES (NEW.id, auth.uid(), 'vendor_created', 'vendor',
      jsonb_build_object('full_name', NEW.full_name, 'vendor_type', NEW.vendor_type, 'status', NEW.status));
  ELSIF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.vendor_activity_log (vendor_id, performed_by, action_type, entity_type, details)
    VALUES (NEW.id, auth.uid(), 'vendor_status_changed', 'vendor',
      jsonb_build_object('full_name', NEW.full_name, 'from', OLD.status, 'to', NEW.status));
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.vendor_activity_log (vendor_id, performed_by, action_type, entity_type, details)
    VALUES (NEW.id, auth.uid(), 'vendor_updated', 'vendor',
      jsonb_build_object('full_name', NEW.full_name));
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.vendor_activity_log (vendor_id, performed_by, action_type, entity_type, details)
    VALUES (OLD.id, auth.uid(), 'vendor_deleted', 'vendor',
      jsonb_build_object('full_name', OLD.full_name));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS vendor_changes_trigger ON public.vendors;
CREATE TRIGGER vendor_changes_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.vendors
FOR EACH ROW EXECUTE FUNCTION public.log_vendor_changes();

-- 4. Equipment triggers
CREATE OR REPLACE FUNCTION public.log_vendor_equipment_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_name text;
BEGIN
  SELECT full_name INTO v_name FROM public.vendors WHERE id = COALESCE(NEW.vendor_id, OLD.vendor_id);
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO public.vendor_activity_log (vendor_id, performed_by, action_type, entity_type, details)
    VALUES (OLD.vendor_id, auth.uid(), 'equipment_deleted', 'equipment',
      jsonb_build_object('equipment_name', OLD.name, 'vendor_name', v_name));
  ELSE
    INSERT INTO public.vendor_activity_log (vendor_id, performed_by, action_type, entity_type, details)
    VALUES (NEW.vendor_id, auth.uid(),
      CASE WHEN TG_OP = 'INSERT' THEN 'equipment_added' ELSE 'equipment_updated' END,
      'equipment', jsonb_build_object('equipment_name', NEW.name, 'vendor_name', v_name));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS vendor_equipment_changes_trigger ON public.vendor_equipment;
CREATE TRIGGER vendor_equipment_changes_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.vendor_equipment
FOR EACH ROW EXECUTE FUNCTION public.log_vendor_equipment_changes();

-- 5. Documents triggers
CREATE OR REPLACE FUNCTION public.log_vendor_document_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_name text;
BEGIN
  SELECT full_name INTO v_name FROM public.vendors WHERE id = COALESCE(NEW.vendor_id, OLD.vendor_id);
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO public.vendor_activity_log (vendor_id, performed_by, action_type, entity_type, details)
    VALUES (OLD.vendor_id, auth.uid(), 'document_deleted', 'document',
      jsonb_build_object('file_name', OLD.file_name, 'vendor_name', v_name));
  ELSE
    INSERT INTO public.vendor_activity_log (vendor_id, performed_by, action_type, entity_type, details)
    VALUES (NEW.vendor_id, auth.uid(), 'document_uploaded', 'document',
      jsonb_build_object('file_name', NEW.file_name, 'document_type', NEW.document_type, 'vendor_name', v_name));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS vendor_document_changes_trigger ON public.vendor_documents;
CREATE TRIGGER vendor_document_changes_trigger
AFTER INSERT OR DELETE ON public.vendor_documents
FOR EACH ROW EXECUTE FUNCTION public.log_vendor_document_changes();

-- 6. Invoices/expenses triggers
CREATE OR REPLACE FUNCTION public.log_vendor_invoice_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_name text;
BEGIN
  SELECT full_name INTO v_name FROM public.vendors WHERE id = COALESCE(NEW.vendor_id, OLD.vendor_id);
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.vendor_activity_log (vendor_id, performed_by, action_type, entity_type, details)
    VALUES (NEW.vendor_id, auth.uid(), 'expense_created', 'expense',
      jsonb_build_object('vendor_name', v_name, 'amount', NEW.amount_total, 'status', NEW.status));
  ELSIF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.vendor_activity_log (vendor_id, performed_by, action_type, entity_type, details)
    VALUES (NEW.vendor_id, auth.uid(), 'expense_status_changed', 'expense',
      jsonb_build_object('vendor_name', v_name, 'from', OLD.status, 'to', NEW.status, 'amount', NEW.amount_total));
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.vendor_activity_log (vendor_id, performed_by, action_type, entity_type, details)
    VALUES (OLD.vendor_id, auth.uid(), 'expense_deleted', 'expense',
      jsonb_build_object('vendor_name', v_name, 'amount', OLD.amount_total));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS vendor_invoice_changes_trigger ON public.vendor_invoices;
CREATE TRIGGER vendor_invoice_changes_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.vendor_invoices
FOR EACH ROW EXECUTE FUNCTION public.log_vendor_invoice_changes();

-- 7. Expense payments triggers
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
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.vendor_activity_log (vendor_id, performed_by, action_type, entity_type, details)
    VALUES (v_id, auth.uid(), 'payment_deleted', 'payment',
      jsonb_build_object('vendor_name', v_name, 'amount', OLD.amount));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS expense_payment_changes_trigger ON public.expense_payments;
CREATE TRIGGER expense_payment_changes_trigger
AFTER INSERT OR DELETE ON public.expense_payments
FOR EACH ROW EXECUTE FUNCTION public.log_expense_payment_changes();

-- 8. Purchase orders triggers
CREATE OR REPLACE FUNCTION public.log_purchase_order_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
    VALUES (auth.uid(), 'po_created', 'purchase_order', NEW.id, NEW.po_number,
      jsonb_build_object('total_amount', NEW.total_amount, 'status', NEW.status));
  ELSIF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
    VALUES (auth.uid(), 'po_status_changed', 'purchase_order', NEW.id, NEW.po_number,
      jsonb_build_object('from', OLD.status, 'to', NEW.status));
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
    VALUES (auth.uid(), 'po_deleted', 'purchase_order', OLD.id, OLD.po_number,
      jsonb_build_object('total_amount', OLD.total_amount));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS purchase_order_changes_trigger ON public.purchase_orders;
CREATE TRIGGER purchase_order_changes_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.purchase_orders
FOR EACH ROW EXECUTE FUNCTION public.log_purchase_order_changes();

-- 9. Production tasks triggers
CREATE OR REPLACE FUNCTION public.log_production_task_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
    VALUES (auth.uid(), 'task_created', 'production_task', NEW.id, NEW.name,
      jsonb_build_object('amount', NEW.amount, 'status', NEW.status));
  ELSIF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
    VALUES (auth.uid(), 'task_status_changed', 'production_task', NEW.id, NEW.name,
      jsonb_build_object('from', OLD.status, 'to', NEW.status));
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
    VALUES (auth.uid(), 'task_deleted', 'production_task', OLD.id, OLD.name, '{}'::jsonb);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS production_task_changes_trigger ON public.production_tasks;
CREATE TRIGGER production_task_changes_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.production_tasks
FOR EACH ROW EXECUTE FUNCTION public.log_production_task_changes();

-- 10. Settings triggers
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

-- 11. Global activity log view
DROP VIEW IF EXISTS public.global_activity_log;
CREATE VIEW public.global_activity_log AS
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