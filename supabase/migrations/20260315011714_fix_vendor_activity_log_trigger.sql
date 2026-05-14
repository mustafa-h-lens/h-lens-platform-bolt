/*
  # Fix Vendor Activity Log Trigger

  1. Problem
    - The `vendor_activity_log` table has a required column `action` (NOT NULL)
    - The trigger function `log_vendor_changes()` was inserting into `action_type` instead
    - This caused "null value in column action violates not-null constraint" errors

  2. Solution
    - Update the trigger function to insert into the correct `action` column
    - Keep the same action values: vendor_created, vendor_status_changed, vendor_updated, vendor_deleted

  3. Changes
    - Modified `log_vendor_changes()` function to use `action` instead of `action_type`
    - Removed `entity_type` since it's redundant (always 'vendor' for this table)

  4. Schema backfill
    - The original create-table at 20260314225353 used `action_type`, but production
      drift-added an `action` column manually. Add it idempotently here so a fresh
      replay (Supabase Branching) has the column the trigger requires.
*/

ALTER TABLE public.vendor_activity_log ADD COLUMN IF NOT EXISTS action text;

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
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.vendor_activity_log (vendor_id, performed_by, action, details)
    VALUES (OLD.id, auth.uid(), 'vendor_deleted',
      jsonb_build_object('full_name', OLD.full_name));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;
