/*
  # Backfill legal_pages_history.page_id

  My earlier backfill (20260316001500) named the FK column legal_page_id
  but prod uses page_id. Add the page_id column if missing so the
  downstream index in 20260328105922 succeeds.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='legal_pages_history' AND column_name='page_id'
  ) THEN
    ALTER TABLE public.legal_pages_history ADD COLUMN page_id uuid REFERENCES public.legal_pages(id) ON DELETE CASCADE;
  END IF;
END $$;
