-- ============================================================
-- Sync projects.total_cost from vendor_invoices (expenses)
-- Ensures project-level cost metrics always reflect actual expenses
-- ============================================================

-- 1. Create trigger function to recalculate project total_cost
CREATE OR REPLACE FUNCTION public.sync_project_total_cost()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_project_id uuid;
  v_total decimal(15,2);
BEGIN
  -- Determine which project_id was affected
  IF TG_OP = 'DELETE' THEN
    v_project_id := OLD.project_id;
  ELSE
    v_project_id := NEW.project_id;
  END IF;

  -- Recalculate total cost from all vendor_invoices for this project
  SELECT COALESCE(SUM(amount_total), 0)
  INTO v_total
  FROM public.vendor_invoices
  WHERE project_id = v_project_id;

  -- Update the project's total_cost
  UPDATE public.projects
  SET total_cost = v_total,
      updated_at = now()
  WHERE id = v_project_id;

  -- If the old and new project_id differ (expense moved between projects), update the old project too
  IF TG_OP = 'UPDATE' AND OLD.project_id IS DISTINCT FROM NEW.project_id THEN
    SELECT COALESCE(SUM(amount_total), 0)
    INTO v_total
    FROM public.vendor_invoices
    WHERE project_id = OLD.project_id;

    UPDATE public.projects
    SET total_cost = v_total,
        updated_at = now()
    WHERE id = OLD.project_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 2. Create trigger on vendor_invoices
DROP TRIGGER IF EXISTS trg_sync_project_total_cost ON public.vendor_invoices;
DROP TRIGGER IF EXISTS trg_sync_project_total_cost ON public.vendor_invoices;
CREATE TRIGGER trg_sync_project_total_cost AFTER INSERT OR UPDATE OR DELETE ON public.vendor_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_project_total_cost();

-- 3. Backfill: sync all existing projects from their current expenses
UPDATE public.projects p
SET total_cost = sub.total,
    updated_at = now()
FROM (
  SELECT project_id, COALESCE(SUM(amount_total), 0) as total
  FROM public.vendor_invoices
  GROUP BY project_id
) sub
WHERE p.id = sub.project_id;
