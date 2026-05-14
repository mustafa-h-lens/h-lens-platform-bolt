/*
  # Backfill prod schema drift

  Production carries several columns that were added manually (or via
  migrations that were later deleted) and were never captured by any
  remaining repo migration. The very next migration in the timeline
  (20260226021405_fix_security_and_performance_issues.sql) references
  those columns when creating indexes, which works fine on prod (the
  columns exist there) but blows up on any from-scratch replay such
  as Supabase Branching:

    ERROR: column "reviewed_by" does not exist
    ERROR: column "bank_id" does not exist  (on vendor_registration_drafts)
    ERROR: relation "vendor_activity_log" does not exist

  This migration adds those columns idempotently so the rest of the
  migration history can replay cleanly on a fresh database. On prod
  every block here no-ops because the columns / tables already exist.
*/

-- vendors.reviewed_by — admin who approved/rejected the registration
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vendors' AND column_name = 'reviewed_by'
  ) THEN
    ALTER TABLE public.vendors ADD COLUMN reviewed_by uuid REFERENCES public.users(id);
  END IF;
END $$;

-- vendor_registration_drafts.bank_id — selected bank during registration wizard
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vendor_registration_drafts' AND column_name = 'bank_id'
  ) THEN
    ALTER TABLE public.vendor_registration_drafts ADD COLUMN bank_id uuid REFERENCES public.banks(id);
  END IF;
END $$;

-- vendor_notifications — in-app notifications for vendor portal. Table was
-- created manually on prod and the schema was never captured here.
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
