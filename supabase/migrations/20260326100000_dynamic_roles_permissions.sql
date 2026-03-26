-- ============================================================
-- Dynamic Roles & Permissions System
-- Replaces hardcoded role checks with configurable RBAC
-- ============================================================

-- 1. Create roles table
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Create role_permissions table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  module_key text NOT NULL,
  has_access boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role_id, module_key)
);

-- 3. Add role_id to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES public.roles(id);

-- 4. Seed built-in super_admin role (is_system = true, cannot be deleted/edited)
INSERT INTO public.roles (id, name, description, is_system)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'مدير عام',
  'صلاحيات كاملة على جميع أقسام النظام - لا يمكن تعديله أو حذفه',
  true
) ON CONFLICT (name) DO NOTHING;

-- 5. Seed default project_manager role
INSERT INTO public.roles (id, name, description, is_system)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'مدير مشاريع',
  'صلاحيات إدارة المشاريع والعملاء والموردين',
  false
) ON CONFLICT (name) DO NOTHING;

-- 6. Define all module keys
-- dashboard, clients, vendors, projects, expenses, suggestions, reports, activity, settings, users

-- 7. Seed permissions for super_admin (all modules ON)
INSERT INTO public.role_permissions (role_id, module_key, has_access)
SELECT '00000000-0000-0000-0000-000000000001', module_key, true
FROM unnest(ARRAY[
  'dashboard', 'clients', 'vendors', 'projects', 'expenses',
  'suggestions', 'reports', 'activity', 'settings', 'users'
]) AS module_key
ON CONFLICT (role_id, module_key) DO NOTHING;

-- 8. Seed permissions for project_manager (matching current access)
INSERT INTO public.role_permissions (role_id, module_key, has_access)
SELECT '00000000-0000-0000-0000-000000000002', module_key, has_access
FROM (VALUES
  ('dashboard', true),
  ('clients', true),
  ('vendors', true),
  ('projects', true),
  ('expenses', true),
  ('suggestions', true),
  ('reports', true),
  ('activity', false),
  ('settings', false),
  ('users', false)
) AS perms(module_key, has_access)
ON CONFLICT (role_id, module_key) DO NOTHING;

-- 9. Migrate existing users to role_id
UPDATE public.users
SET role_id = '00000000-0000-0000-0000-000000000001'
WHERE role IN ('super_admin', 'admin') AND role_id IS NULL;

UPDATE public.users
SET role_id = '00000000-0000-0000-0000-000000000002'
WHERE role = 'project_manager' AND role_id IS NULL;

-- 10. Enable RLS on new tables
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- 11. RLS policies for roles table
CREATE POLICY "Authenticated users can view roles"
  ON public.roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only super_admin can manage roles"
  ON public.roles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role_id = '00000000-0000-0000-0000-000000000001'
      AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role_id = '00000000-0000-0000-0000-000000000001'
      AND is_active = true
    )
  );

-- 12. RLS policies for role_permissions table
CREATE POLICY "Authenticated users can view role_permissions"
  ON public.role_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only super_admin can manage role_permissions"
  ON public.role_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role_id = '00000000-0000-0000-0000-000000000001'
      AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role_id = '00000000-0000-0000-0000-000000000001'
      AND is_active = true
    )
  );

-- 13. Update is_admin() to also check role_id
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users u
    LEFT JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid()
    AND u.is_active = true
    AND (
      u.role IN ('project_manager', 'super_admin')
      OR r.is_system = true
      OR u.role_id IS NOT NULL
    )
  );
END;
$$;

-- 14. Create helper function to check module access
CREATE OR REPLACE FUNCTION public.has_module_access(p_module_key text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    LEFT JOIN public.role_permissions rp ON rp.role_id = r.id AND rp.module_key = p_module_key
    WHERE u.id = auth.uid()
    AND u.is_active = true
    AND (r.is_system = true OR rp.has_access = true)
  );
END;
$$;

-- 15. Add updated_at trigger for roles
CREATE OR REPLACE FUNCTION public.update_roles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_roles_updated_at();
