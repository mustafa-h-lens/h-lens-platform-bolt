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

-- 3. Delete existing vendor record for عبدالعزيز الغامدي (if any)
--    Null out email first to avoid unique-constraint collisions if any secondary rows reference it
DO $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.vendors
  WHERE full_name LIKE '%عبدالعزيز%الغامدي%' OR full_name LIKE '%عبد العزيز%الغامدي%'
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    -- Null email first (avoid future collisions)
    UPDATE public.vendors SET email = NULL WHERE id = v_id;

    -- Delete secondary rows (cascade should handle most, but be explicit)
    DELETE FROM public.vendor_financial_data WHERE vendor_id = v_id;
    DELETE FROM public.vendor_selected_fields WHERE vendor_id = v_id;
    DELETE FROM public.vendor_travel_documents WHERE vendor_id = v_id;
    DELETE FROM public.vendor_approval_log WHERE vendor_id = v_id;

    -- Delete the vendor row
    DELETE FROM public.vendors WHERE id = v_id;

    RAISE NOTICE 'Deleted vendor عبدالعزيز الغامدي (id=%)', v_id;
  ELSE
    RAISE NOTICE 'No vendor record found for عبدالعزيز الغامدي';
  END IF;
END $$;
