-- Fix ambiguous po_number variable in log_task_po_allocation_changes trigger function.
-- The local variable was named the same as the column, causing:
--   "column reference \"po_number\" is ambiguous"
-- Also update OLD.amount / NEW.amount to the renamed column allocated_amount.

CREATE OR REPLACE FUNCTION log_task_po_allocation_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
DECLARE
  t_name text;
  v_po_number text;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    SELECT name INTO t_name FROM public.production_tasks WHERE id = OLD.task_id;
    SELECT po_number INTO v_po_number FROM public.purchase_orders WHERE id = OLD.po_id;
    INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
    VALUES (auth.uid(), 'allocation_deleted', 'task_po_allocation', OLD.id, t_name,
      jsonb_build_object('task_name', t_name, 'po_number', v_po_number, 'amount', OLD.allocated_amount));
    RETURN OLD;
  ELSE
    SELECT name INTO t_name FROM public.production_tasks WHERE id = NEW.task_id;
    SELECT po_number INTO v_po_number FROM public.purchase_orders WHERE id = NEW.po_id;
    INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
    VALUES (auth.uid(),
      CASE WHEN TG_OP = 'INSERT' THEN 'allocation_created' ELSE 'allocation_updated' END,
      'task_po_allocation', NEW.id, t_name,
      jsonb_build_object('task_name', t_name, 'po_number', v_po_number, 'amount', NEW.allocated_amount));
    RETURN NEW;
  END IF;
END;
$fn$;
