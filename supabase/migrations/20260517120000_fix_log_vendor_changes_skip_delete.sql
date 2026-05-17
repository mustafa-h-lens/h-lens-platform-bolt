/*
  # Fix log_vendor_changes — skip DELETE branch to avoid FK self-trap

  ## Problem
  vendor_activity_log.vendor_id is FK to vendors(id) ON DELETE CASCADE.
  When a vendor is deleted:
    1. cascade fires first → activity_log rows for this vendor are deleted
    2. AFTER DELETE trigger log_vendor_changes fires → tries to INSERT a
       new activity_log row with vendor_id=OLD.id
    3. FK fails because the vendor row is gone

  Result: every vendor DELETE crashes with FK constraint violation.

  ## Fix
  Remove the DELETE branch from log_vendor_changes. The CASCADE already
  cleans the audit history; logging a deletion to a table that's about
  to be cleared was always pointless.

  Future: if vendor-deletion audit becomes a requirement, log to a
  separate audit table that does NOT FK to vendors, or move to a
  BEFORE DELETE trigger AND change the FK to ON DELETE SET NULL.
*/

CREATE OR REPLACE FUNCTION public.log_vendor_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.vendor_activity_log (vendor_id, performed_by, action, details)
    VALUES (NEW.id, auth.uid(), 'vendor_created',
      jsonb_build_object('full_name', NEW.full_name, 'vendor_type', NEW.vendor_type, 'status', NEW.status));
  ELSIF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.vendor_activity_log (vendor_id, performed_by, action, details)
    VALUES (NEW.id, auth.uid(), 'vendor_status_changed',
      jsonb_build_object('full_name', NEW.full_name, 'from', OLD.status, 'to', NEW.status));
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.vendor_activity_log (vendor_id, performed_by, action, details)
    VALUES (NEW.id, auth.uid(), 'vendor_updated',
      jsonb_build_object('full_name', NEW.full_name));
  END IF;
  -- DELETE branch intentionally omitted — see migration docstring.
  RETURN COALESCE(NEW, OLD);
END;
$function$;
