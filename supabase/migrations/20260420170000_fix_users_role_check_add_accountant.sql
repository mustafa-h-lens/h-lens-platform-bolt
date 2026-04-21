-- Add 'accountant' to the allowed roles in users table check constraint.
-- The app maps محاسب role to 'accountant' but the constraint only allowed
-- super_admin, project_manager, client — causing update failures.

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('super_admin', 'project_manager', 'client', 'accountant'));
