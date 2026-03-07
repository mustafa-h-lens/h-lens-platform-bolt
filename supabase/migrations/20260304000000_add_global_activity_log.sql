-- ================================================================
-- Global Activity Log System
-- Creates system_activity_log table, global_activity_log view,
-- helper function, and auto-logging triggers
-- ================================================================

-- ========================================
-- 1. system_activity_log table
-- For non-project/vendor events (client CRUD, user management)
-- ========================================

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
CREATE INDEX IF NOT EXISTS idx_system_activity_log_created_at ON public.system_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_activity_log_entity_type ON public.system_activity_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_system_activity_log_action_type ON public.system_activity_log(action_type);

ALTER TABLE public.system_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view system activity logs"
  ON public.system_activity_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "System can insert activity logs"
  ON public.system_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- ========================================
-- 2. log_system_activity() helper function
-- ========================================

CREATE OR REPLACE FUNCTION public.log_system_activity(
  p_action_type text,
  p_entity_type text,
  p_entity_id uuid DEFAULT NULL,
  p_entity_name text DEFAULT NULL,
  p_action_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
  VALUES (auth.uid(), p_action_type, p_entity_type, p_entity_id, p_entity_name, p_action_details);
END;
$$;

-- ========================================
-- 3. Triggers on clients table
-- ========================================

CREATE OR REPLACE FUNCTION public.log_client_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
    VALUES (auth.uid(), 'created', 'client', NEW.id, NEW.name, jsonb_build_object('email', NEW.email));
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
    VALUES (auth.uid(), 'updated', 'client', NEW.id, NEW.name,
      jsonb_build_object('old_name', OLD.name, 'new_name', NEW.name));
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
    VALUES (auth.uid(), 'deleted', 'client', OLD.id, OLD.name, '{}'::jsonb);
    RETURN OLD;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS client_changes_trigger ON public.clients;
CREATE TRIGGER client_changes_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.log_client_changes();

-- ========================================
-- 4. Triggers on users table
-- ========================================

CREATE OR REPLACE FUNCTION public.log_user_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
    VALUES (auth.uid(), 'created', 'user', NEW.id, NEW.full_name,
      jsonb_build_object('email', NEW.email, 'role', NEW.role));
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.system_activity_log (user_id, action_type, entity_type, entity_id, entity_name, action_details)
    VALUES (auth.uid(), 'updated', 'user', NEW.id, NEW.full_name,
      jsonb_build_object('old_role', OLD.role, 'new_role', NEW.role));
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_changes_trigger ON public.users;
CREATE TRIGGER user_changes_trigger
AFTER INSERT OR UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.log_user_changes();

-- ========================================
-- 5. global_activity_log view
-- UNION ALL of activity_logs + vendor_activity_log + system_activity_log
-- ========================================

CREATE OR REPLACE VIEW public.global_activity_log AS

-- Project activity logs
SELECT
  al.id,
  'project' AS source_type,
  al.action_type,
  'project' AS entity_type,
  al.project_id AS entity_id,
  p.name AS entity_name,
  COALESCE(u.full_name, 'النظام') AS user_name,
  al.user_id,
  al.action_details,
  al.created_at
FROM public.activity_logs al
LEFT JOIN public.users u ON u.id = al.user_id
LEFT JOIN public.projects p ON p.id = al.project_id

UNION ALL

-- Vendor activity logs
SELECT
  val.id,
  'vendor' AS source_type,
  val.action_type,
  val.entity_type,
  val.vendor_id AS entity_id,
  v.full_name AS entity_name,
  COALESCE(u.full_name, 'النظام') AS user_name,
  val.performed_by AS user_id,
  val.details AS action_details,
  val.created_at
FROM public.vendor_activity_log val
LEFT JOIN public.users u ON u.id = val.performed_by
LEFT JOIN public.vendors v ON v.id = val.vendor_id

UNION ALL

-- System activity logs (clients, users, etc.)
SELECT
  sal.id,
  'system' AS source_type,
  sal.action_type,
  sal.entity_type,
  sal.entity_id,
  sal.entity_name,
  COALESCE(u.full_name, 'النظام') AS user_name,
  sal.user_id,
  sal.action_details,
  sal.created_at
FROM public.system_activity_log sal
LEFT JOIN public.users u ON u.id = sal.user_id;

-- Grant access to the view (inherits RLS from underlying tables)
GRANT SELECT ON public.global_activity_log TO authenticated;
