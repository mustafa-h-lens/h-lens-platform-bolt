/*
  # Complete Activity Logging Coverage

  Adds triggers for all admin actions that were missing logging:
  1. Projects (CRUD + status changes)
  2. Project Items (CRUD)
  3. Project Files (upload/delete)
  4. Invoices (CRUD + status changes + payments)
  5. Vendor Financial Data (insert/update)
  6. Vendor Travel Documents (CRUD)
  7. Vendor Suggestions (status updates)
  8. Service Items (CRUD)
  9. Task-PO Allocations (create/delete)
  10. Equipment Brands (CRUD)
  11. Equipment Categories (CRUD)
  12. PO Settings (insert/update)
  13. Terms & Privacy Settings (insert/update)
*/

-- ============================================================
-- 1. PROJECTS trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_project_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
    VALUES (auth.uid(), 'project_created', 'project', NEW.id, NEW.name,
      jsonb_build_object('project_code', NEW.project_code, 'status', NEW.status, 'client_id', NEW.client_id));
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
      VALUES (auth.uid(), 'project_status_changed', 'project', NEW.id, NEW.name,
        jsonb_build_object('from', OLD.status, 'to', NEW.status));
    ELSE
      INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
      VALUES (auth.uid(), 'project_updated', 'project', NEW.id, NEW.name,
        jsonb_build_object('project_code', NEW.project_code));
    END IF;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
    VALUES (auth.uid(), 'project_deleted', 'project', OLD.id, OLD.name,
      jsonb_build_object('project_code', OLD.project_code));
    RETURN OLD;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS project_changes_trigger ON public.projects;
CREATE TRIGGER project_changes_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.log_project_changes();

-- ============================================================
-- 2. PROJECT ITEMS trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_project_item_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE p_name text;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    SELECT name INTO p_name FROM public.projects WHERE id = OLD.project_id;
    INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
    VALUES (auth.uid(), 'project_item_deleted', 'project_item', OLD.id, OLD.name,
      jsonb_build_object('project_name', p_name, 'project_id', OLD.project_id));
    RETURN OLD;
  ELSE
    SELECT name INTO p_name FROM public.projects WHERE id = NEW.project_id;
    INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
    VALUES (auth.uid(),
      CASE WHEN TG_OP = 'INSERT' THEN 'project_item_added' ELSE 'project_item_updated' END,
      'project_item', NEW.id, NEW.name,
      jsonb_build_object('project_name', p_name, 'project_id', NEW.project_id, 'quantity', NEW.quantity, 'unit_price', NEW.unit_price));
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS project_item_changes_trigger ON public.project_items;
CREATE TRIGGER project_item_changes_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.project_items
FOR EACH ROW EXECUTE FUNCTION public.log_project_item_changes();

-- ============================================================
-- 3. PROJECT FILES trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_project_file_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE p_name text;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    SELECT name INTO p_name FROM public.projects WHERE id = OLD.project_id;
    INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
    VALUES (auth.uid(), 'project_file_deleted', 'project_file', OLD.id, OLD.file_name,
      jsonb_build_object('project_name', p_name, 'project_id', OLD.project_id, 'file_type', OLD.file_type));
    RETURN OLD;
  ELSE
    SELECT name INTO p_name FROM public.projects WHERE id = NEW.project_id;
    INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
    VALUES (auth.uid(), 'project_file_uploaded', 'project_file', NEW.id, NEW.file_name,
      jsonb_build_object('project_name', p_name, 'project_id', NEW.project_id, 'file_type', NEW.file_type, 'file_size', NEW.file_size));
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS project_file_changes_trigger ON public.project_files;
CREATE TRIGGER project_file_changes_trigger
AFTER INSERT OR DELETE ON public.project_files
FOR EACH ROW EXECUTE FUNCTION public.log_project_file_changes();

-- ============================================================
-- 4. INVOICES trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_invoice_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE p_name text;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    SELECT name INTO p_name FROM public.projects WHERE id = NEW.project_id;
    INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
    VALUES (auth.uid(), 'invoice_created', 'invoice', NEW.id, NEW.invoice_number,
      jsonb_build_object('project_name', p_name, 'total_amount', NEW.total_amount, 'status', NEW.status));
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    SELECT name INTO p_name FROM public.projects WHERE id = NEW.project_id;
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
      VALUES (auth.uid(), 'invoice_status_changed', 'invoice', NEW.id, NEW.invoice_number,
        jsonb_build_object('project_name', p_name, 'from', OLD.status, 'to', NEW.status));
    ELSIF OLD.paid_amount IS DISTINCT FROM NEW.paid_amount THEN
      INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
      VALUES (auth.uid(), 'invoice_payment_recorded', 'invoice', NEW.id, NEW.invoice_number,
        jsonb_build_object('project_name', p_name, 'paid_amount', NEW.paid_amount, 'total_amount', NEW.total_amount));
    ELSE
      INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
      VALUES (auth.uid(), 'invoice_updated', 'invoice', NEW.id, NEW.invoice_number,
        jsonb_build_object('project_name', p_name, 'total_amount', NEW.total_amount));
    END IF;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    SELECT name INTO p_name FROM public.projects WHERE id = OLD.project_id;
    INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
    VALUES (auth.uid(), 'invoice_deleted', 'invoice', OLD.id, OLD.invoice_number,
      jsonb_build_object('project_name', p_name, 'total_amount', OLD.total_amount));
    RETURN OLD;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS invoice_changes_trigger ON public.invoices;
CREATE TRIGGER invoice_changes_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.log_invoice_changes();

-- ============================================================
-- 5. VENDOR FINANCIAL DATA trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_vendor_financial_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_name text;
BEGIN
  SELECT full_name INTO v_name FROM public.vendors WHERE id = COALESCE(NEW.vendor_id, OLD.vendor_id);
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.vendor_activity_log (vendor_id, performed_by, action_type, entity_type, details)
    VALUES (NEW.vendor_id, auth.uid(), 'financial_data_added', 'financial_data',
      jsonb_build_object('vendor_name', v_name, 'payment_method', NEW.payment_method, 'bank_name', NEW.bank_name));
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.vendor_activity_log (vendor_id, performed_by, action_type, entity_type, details)
    VALUES (NEW.vendor_id, auth.uid(), 'financial_data_updated', 'financial_data',
      jsonb_build_object('vendor_name', v_name, 'payment_method', NEW.payment_method, 'bank_name', NEW.bank_name));
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.vendor_activity_log (vendor_id, performed_by, action_type, entity_type, details)
    VALUES (OLD.vendor_id, auth.uid(), 'financial_data_deleted', 'financial_data',
      jsonb_build_object('vendor_name', v_name));
    RETURN OLD;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS vendor_financial_changes_trigger ON public.vendor_financial_data;
CREATE TRIGGER vendor_financial_changes_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.vendor_financial_data
FOR EACH ROW EXECUTE FUNCTION public.log_vendor_financial_changes();

-- ============================================================
-- 6. VENDOR TRAVEL DOCUMENTS trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_vendor_travel_doc_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_name text;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    SELECT full_name INTO v_name FROM public.vendors WHERE id = OLD.vendor_id;
    INSERT INTO public.vendor_activity_log (vendor_id, performed_by, action_type, entity_type, details)
    VALUES (OLD.vendor_id, auth.uid(), 'travel_doc_deleted', 'travel_document',
      jsonb_build_object('vendor_name', v_name, 'document_type', OLD.document_type));
    RETURN OLD;
  ELSE
    SELECT full_name INTO v_name FROM public.vendors WHERE id = NEW.vendor_id;
    INSERT INTO public.vendor_activity_log (vendor_id, performed_by, action_type, entity_type, details)
    VALUES (NEW.vendor_id, auth.uid(),
      CASE WHEN TG_OP = 'INSERT' THEN 'travel_doc_added' ELSE 'travel_doc_updated' END,
      'travel_document',
      jsonb_build_object('vendor_name', v_name, 'document_type', NEW.document_type));
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS vendor_travel_doc_changes_trigger ON public.vendor_travel_documents;
CREATE TRIGGER vendor_travel_doc_changes_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.vendor_travel_documents
FOR EACH ROW EXECUTE FUNCTION public.log_vendor_travel_doc_changes();

-- ============================================================
-- 7. VENDOR SUGGESTIONS trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_vendor_suggestion_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_name text;
BEGIN
  SELECT full_name INTO v_name FROM public.vendors WHERE id = COALESCE(NEW.vendor_id, OLD.vendor_id);
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.vendor_activity_log (vendor_id, performed_by, action_type, entity_type, details)
    VALUES (NEW.vendor_id, auth.uid(), 'suggestion_submitted', 'suggestion',
      jsonb_build_object('vendor_name', v_name, 'title', NEW.title, 'category', NEW.category));
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.vendor_activity_log (vendor_id, performed_by, action_type, entity_type, details)
      VALUES (NEW.vendor_id, auth.uid(), 'suggestion_status_changed', 'suggestion',
        jsonb_build_object('vendor_name', v_name, 'title', NEW.title, 'from', OLD.status, 'to', NEW.status));
    ELSE
      INSERT INTO public.vendor_activity_log (vendor_id, performed_by, action_type, entity_type, details)
      VALUES (NEW.vendor_id, auth.uid(), 'suggestion_updated', 'suggestion',
        jsonb_build_object('vendor_name', v_name, 'title', NEW.title));
    END IF;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.vendor_activity_log (vendor_id, performed_by, action_type, entity_type, details)
    VALUES (OLD.vendor_id, auth.uid(), 'suggestion_deleted', 'suggestion',
      jsonb_build_object('vendor_name', v_name, 'title', OLD.title));
    RETURN OLD;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS vendor_suggestion_changes_trigger ON public.vendor_suggestions;
CREATE TRIGGER vendor_suggestion_changes_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.vendor_suggestions
FOR EACH ROW EXECUTE FUNCTION public.log_vendor_suggestion_changes();

-- ============================================================
-- 8. SERVICE ITEMS trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_service_item_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
    VALUES (auth.uid(), 'service_item_created', 'service_item', NEW.id, NEW.name,
      jsonb_build_object('item_number', NEW.item_number, 'unit_price', NEW.unit_price));
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF OLD.is_active IS DISTINCT FROM NEW.is_active AND NEW.is_active = false THEN
      INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
      VALUES (auth.uid(), 'service_item_deactivated', 'service_item', NEW.id, NEW.name,
        jsonb_build_object('item_number', NEW.item_number));
    ELSE
      INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
      VALUES (auth.uid(), 'service_item_updated', 'service_item', NEW.id, NEW.name,
        jsonb_build_object('item_number', NEW.item_number, 'unit_price', NEW.unit_price));
    END IF;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
    VALUES (auth.uid(), 'service_item_deleted', 'service_item', OLD.id, OLD.name,
      jsonb_build_object('item_number', OLD.item_number));
    RETURN OLD;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS service_item_changes_trigger ON public.service_items;
CREATE TRIGGER service_item_changes_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.service_items
FOR EACH ROW EXECUTE FUNCTION public.log_service_item_changes();

-- ============================================================
-- 9. TASK-PO ALLOCATIONS trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_task_po_allocation_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE t_name text; po_number text;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    SELECT name INTO t_name FROM public.production_tasks WHERE id = OLD.task_id;
    SELECT po_number INTO po_number FROM public.purchase_orders WHERE id = OLD.po_id;
    INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
    VALUES (auth.uid(), 'allocation_deleted', 'task_po_allocation', OLD.id, t_name,
      jsonb_build_object('task_name', t_name, 'po_number', po_number, 'amount', OLD.amount));
    RETURN OLD;
  ELSE
    SELECT name INTO t_name FROM public.production_tasks WHERE id = NEW.task_id;
    SELECT po_number INTO po_number FROM public.purchase_orders WHERE id = NEW.po_id;
    INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
    VALUES (auth.uid(),
      CASE WHEN TG_OP = 'INSERT' THEN 'allocation_created' ELSE 'allocation_updated' END,
      'task_po_allocation', NEW.id, t_name,
      jsonb_build_object('task_name', t_name, 'po_number', po_number, 'amount', NEW.amount));
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS task_po_allocation_changes_trigger ON public.task_po_allocations;
CREATE TRIGGER task_po_allocation_changes_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.task_po_allocations
FOR EACH ROW EXECUTE FUNCTION public.log_task_po_allocation_changes();

-- ============================================================
-- 10. EQUIPMENT BRANDS trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_equipment_brand_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
    VALUES (auth.uid(), 'equipment_brand_created', 'equipment_brand', NEW.id, NEW.name, '{}'::jsonb);
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
    VALUES (auth.uid(), 'equipment_brand_updated', 'equipment_brand', NEW.id, NEW.name, '{}'::jsonb);
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
    VALUES (auth.uid(), 'equipment_brand_deleted', 'equipment_brand', OLD.id, OLD.name, '{}'::jsonb);
    RETURN OLD;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS equipment_brand_changes_trigger ON public.equipment_brands;
CREATE TRIGGER equipment_brand_changes_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.equipment_brands
FOR EACH ROW EXECUTE FUNCTION public.log_equipment_brand_changes();

-- ============================================================
-- 11. EQUIPMENT CATEGORIES trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_equipment_category_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
    VALUES (auth.uid(), 'equipment_category_created', 'equipment_category', NEW.id, NEW.name, '{}'::jsonb);
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
    VALUES (auth.uid(), 'equipment_category_updated', 'equipment_category', NEW.id, NEW.name, '{}'::jsonb);
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
    VALUES (auth.uid(), 'equipment_category_deleted', 'equipment_category', OLD.id, OLD.name, '{}'::jsonb);
    RETURN OLD;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS equipment_category_changes_trigger ON public.equipment_categories;
CREATE TRIGGER equipment_category_changes_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.equipment_categories
FOR EACH ROW EXECUTE FUNCTION public.log_equipment_category_changes();

-- ============================================================
-- 12. PO SETTINGS trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_po_settings_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
  VALUES (auth.uid(),
    CASE WHEN TG_OP = 'INSERT' THEN 'po_settings_created' ELSE 'po_settings_updated' END,
    'po_settings', NEW.id, 'PO Settings',
    jsonb_build_object('warning_threshold', NEW.warning_threshold, 'allow_split_task', NEW.allow_split_task, 'allow_po_exceed', NEW.allow_po_exceed));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS po_settings_changes_trigger ON public.po_settings;
CREATE TRIGGER po_settings_changes_trigger
AFTER INSERT OR UPDATE ON public.po_settings
FOR EACH ROW EXECUTE FUNCTION public.log_po_settings_changes();

-- ============================================================
-- 13. TERMS & PRIVACY SETTINGS trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_terms_privacy_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
  VALUES (auth.uid(),
    CASE WHEN TG_OP = 'INSERT' THEN 'terms_privacy_created' ELSE 'terms_privacy_updated' END,
    'terms_privacy', NEW.id, NEW.type,
    jsonb_build_object('type', NEW.type, 'version', NEW.version, 'is_active', NEW.is_active));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS terms_privacy_changes_trigger ON public.terms_and_privacy_settings;
CREATE TRIGGER terms_privacy_changes_trigger
AFTER INSERT OR UPDATE ON public.terms_and_privacy_settings
FOR EACH ROW EXECUTE FUNCTION public.log_terms_privacy_changes();
