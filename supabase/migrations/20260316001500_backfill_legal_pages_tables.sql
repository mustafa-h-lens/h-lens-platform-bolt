/*
  # Backfill legal_pages + legal_pages_history (prod-drift)

  These tables exist on production (added manually) but were never
  created by any repo migration. The next migration
  (20260316001838_fix_security_part1_indexes.sql) tries to index
  columns on them, which works on prod but fails on Supabase Branching.

  Idempotent: CREATE TABLE IF NOT EXISTS means prod is a no-op.

  Timestamp picked to slot between 20260316000931 (last applied on
  staging at the time of this fix) and 20260316001838 (the failing one).
*/

CREATE TABLE IF NOT EXISTS public.legal_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  content jsonb DEFAULT '{}'::jsonb,
  version text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.legal_pages ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.legal_pages_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_page_id uuid REFERENCES public.legal_pages(id) ON DELETE CASCADE,
  content jsonb,
  version text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.legal_pages_history ENABLE ROW LEVEL SECURITY;
