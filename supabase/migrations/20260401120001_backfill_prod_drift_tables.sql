/*
  # Backfill remaining prod-drift tables

  Schema diff between prod and a fresh-replay staging revealed 4 tables
  that exist only on prod (added manually, never captured in a repo
  migration). Adding them here so subsequent migrations that reference
  them (20260401130000 references team_entities, 20260401130100
  references sectors, etc.) can run cleanly.

  All blocks are CREATE TABLE IF NOT EXISTS — prod is a no-op.

  Column types/names pulled directly from prod's information_schema
  via the Supabase Management API.
*/

CREATE TABLE IF NOT EXISTS public.sectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_en text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.client_sectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.client_sectors ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.team_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_en text,
  entity_type text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.team_entities ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.vendor_submission_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE CASCADE,
  action text,
  submission_payload jsonb DEFAULT '{}'::jsonb,
  performed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.vendor_submission_snapshots ENABLE ROW LEVEL SECURITY;
