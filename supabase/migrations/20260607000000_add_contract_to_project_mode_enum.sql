-- ============================================================================
-- FIX: add CONTRACT to the project_mode_type enum
-- ============================================================================
-- The "نوع المشروع" form offers three modes (STANDARD / FRAMEWORK / CONTRACT),
-- but the project_mode_type enum was created with only STANDARD + FRAMEWORK
-- (20260203191322_add_project_mode_to_projects.sql). Creating a CONTRACT project
-- therefore failed with:
--   invalid input value for enum project_mode_type: "CONTRACT"
--
-- This adds the missing value. Additive + idempotent — no existing data changes.
-- (Postgres 12+ allows ALTER TYPE ... ADD VALUE outside a dedicated transaction;
--  Supabase runs PG15, and IF NOT EXISTS makes it safe to re-run.)
-- ============================================================================

ALTER TYPE project_mode_type ADD VALUE IF NOT EXISTS 'CONTRACT';

-- ----------------------------------------------------------------------------
-- Verify after applying:
--   SELECT enumlabel FROM pg_enum
--   WHERE enumtypid = 'project_mode_type'::regtype ORDER BY enumsortorder;
--   -- should now list: STANDARD, FRAMEWORK, CONTRACT
-- ----------------------------------------------------------------------------
