-- ============================================================================
-- NATIVE AUTH — step 1: link vendors/clients to their Supabase Auth user
-- ============================================================================
-- ADDITIVE ONLY. This adds one nullable column to each table and two indexes.
-- It does NOT touch, overwrite, or delete any existing data:
--   • new column starts NULL on every existing row,
--   • the FK is ON DELETE SET NULL (deleting an auth user never deletes a
--     vendor/client — it just clears the link),
--   • no DROP / DELETE / TRUNCATE / UPDATE of existing data anywhere.
-- Safe to run on production and safe to re-run (IF NOT EXISTS guards).
-- ============================================================================

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vendors_auth_user_id ON public.vendors(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_clients_auth_user_id ON public.clients(auth_user_id);

-- ----------------------------------------------------------------------------
-- Verify after applying (both should now list the new column):
--   SELECT column_name FROM information_schema.columns
--   WHERE table_schema='public' AND table_name IN ('vendors','clients')
--     AND column_name='auth_user_id';
-- ----------------------------------------------------------------------------
