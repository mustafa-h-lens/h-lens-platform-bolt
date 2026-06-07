-- ============================================================
-- Add accountant role + delete existing عبدالعزيز الغامدي vendor record
-- ============================================================

-- 1. Relax users.role CHECK constraint to include 'accountant'
DO $$
BEGIN
  ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
  ALTER TABLE public.users ADD CONSTRAINT users_role_check
    CHECK (role IN ('super_admin', 'project_manager', 'accountant', 'client'));
END $$;

-- 2. Seed "محاسب" role with appropriate permissions
INSERT INTO public.roles (id, name, description, is_system)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  'محاسب',
  'محاسب النظام - صلاحيات اعتماد وتسديد المصروفات',
  false
) ON CONFLICT (name) DO NOTHING;

INSERT INTO public.role_permissions (role_id, module_key, has_access)
SELECT '00000000-0000-0000-0000-000000000003', module_key, has_access
FROM (VALUES
  ('dashboard', true),
  ('clients', false),
  ('vendors', true),
  ('projects', true),
  ('expenses', true),
  ('suggestions', false),
  ('reports', true),
  ('activity', false),
  ('settings', false),
  ('users', false)
) AS perms(module_key, has_access)
ON CONFLICT (role_id, module_key) DO NOTHING;

-- 3. Delete existing vendor record for عبدالعزيز الغامدي (if any).
--    The vendor activity-log triggers (on vendors + its child tables) fire
--    AFTER DELETE and INSERT into vendor_activity_log referencing the vendor
--    being removed — which violates vendor_activity_log_vendor_id_fkey on a
--    fresh database (e.g. a Supabase preview branch). A later migration
--    (20260517120000) makes the trigger skip deletes, but it runs AFTER this
--    one. So here we temporarily disable the USER triggers on the affected
--    tables around the delete and clear the log rows first. FK cascades still
--    run (system triggers are untouched). Idempotent + preview-safe; on already
--    migrated databases this block does not re-run.
DO $$
DECLARE
  v_id uuid;
  t text;
  log_tables text[] := ARRAY[
    'vendors', 'vendor_equipment', 'vendor_documents', 'vendor_invoices',
    'vendor_financial_data', 'vendor_travel_documents', 'vendor_suggestions'
  ];
BEGIN
  SELECT id INTO v_id FROM public.vendors
  WHERE full_name LIKE '%عبدالعزيز%الغامدي%' OR full_name LIKE '%عبد العزيز%الغامدي%'
  LIMIT 1;

  IF v_id IS NULL THEN
    RAISE NOTICE 'No vendor record found for عبدالعزيز الغامدي';
    RETURN;
  END IF;

  -- Pause activity-log USER triggers so the delete + cascade cannot INSERT into
  -- vendor_activity_log for the vendor being removed.
  FOREACH t IN ARRAY log_tables LOOP
    EXECUTE format('ALTER TABLE public.%I DISABLE TRIGGER USER', t);
  END LOOP;

  UPDATE public.vendors SET email = NULL WHERE id = v_id;

  -- Clear the log rows first (handles RESTRICT FKs too), then the vendor.
  DELETE FROM public.vendor_financial_data   WHERE vendor_id = v_id;
  DELETE FROM public.vendor_selected_fields  WHERE vendor_id = v_id;
  DELETE FROM public.vendor_travel_documents WHERE vendor_id = v_id;
  DELETE FROM public.vendor_approval_log      WHERE vendor_id = v_id;
  DELETE FROM public.vendor_activity_log      WHERE vendor_id = v_id;
  DELETE FROM public.vendors                  WHERE id = v_id;

  -- Re-enable the triggers.
  FOREACH t IN ARRAY log_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE TRIGGER USER', t);
  END LOOP;

  RAISE NOTICE 'Deleted vendor عبدالعزيز الغامدي (id=%)', v_id;
END $$;
