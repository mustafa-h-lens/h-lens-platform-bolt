/*
  # Backfill prod schema drift (no-op marker)

  This migration's content has been moved into the next migration
  (20260226021405_fix_security_and_performance_issues.sql) as a new
  الجزء 0 section so the backfill runs at the right point in the
  timeline. This file is preserved as a marker only — Supabase's
  schema_migrations table has a row for this version and removing
  the file confuses the migration orchestrator.

  Everything below is idempotent and safe to re-run. On any database
  where it has already been applied, every block is a no-op.
*/

-- vendors.reviewed_by
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vendors' AND column_name = 'reviewed_by'
  ) THEN
    ALTER TABLE public.vendors ADD COLUMN reviewed_by uuid REFERENCES public.users(id);
  END IF;
END $$;

-- vendor_registration_drafts.bank_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vendor_registration_drafts' AND column_name = 'bank_id'
  ) THEN
    ALTER TABLE public.vendor_registration_drafts ADD COLUMN bank_id uuid REFERENCES public.banks(id);
  END IF;
END $$;

-- vendor_notifications
CREATE TABLE IF NOT EXISTS public.vendor_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  type text DEFAULT 'general',
  title text,
  message text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_notifications_vendor_id ON public.vendor_notifications(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_notifications_created_at ON public.vendor_notifications(created_at DESC);
ALTER TABLE public.vendor_notifications ENABLE ROW LEVEL SECURITY;
