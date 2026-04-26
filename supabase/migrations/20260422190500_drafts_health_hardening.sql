-- P1 Foundation: vendor_registration_drafts health hardening
-- ------------------------------------------------------------------
-- Problems this fixes:
--   1. Drafts grow unbounded — delete_expired_vendor_drafts() existed but
--      was never invoked. We schedule it via pg_cron (best-effort: if the
--      extension is unavailable the schedule block is a no-op).
--   2. One vendor on multiple browsers produced multiple draft rows because
--      the only key was session_id. We add a derived identity_key
--      (phone OR lower(email)) with a partial unique index so a given real
--      person collapses to one active draft.
--   3. The function only deleted past-expiry drafts — truly abandoned
--      drafts with no phone/email and no activity for 7 days now also go.

-- 1. Derived identity column + partial unique index ------------------
ALTER TABLE vendor_registration_drafts
  ADD COLUMN IF NOT EXISTS identity_key text
  GENERATED ALWAYS AS (
    COALESCE(
      NULLIF(lower(btrim(email)), ''),
      NULLIF(btrim(phone), '')
    )
  ) STORED;

-- Dedupe existing rows before the unique index can be created.
-- For each identity_key, keep the most recently updated row; drop the rest.
-- Rows with NULL identity_key (no phone AND no email) are kept for now —
-- the cleanup function will prune the abandoned ones after 7 days idle.
WITH ranked AS (
  SELECT id,
    row_number() OVER (
      PARTITION BY identity_key
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
    ) AS rn
  FROM vendor_registration_drafts
  WHERE identity_key IS NOT NULL
)
DELETE FROM vendor_registration_drafts d
USING ranked r
WHERE d.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS ux_drafts_identity_key
  ON vendor_registration_drafts (identity_key)
  WHERE identity_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_drafts_updated_at
  ON vendor_registration_drafts (updated_at);

-- 2. Enhanced cleanup function ---------------------------------------
-- Drop the old `void`-returning function before recreating with a richer
-- signature; CREATE OR REPLACE cannot change the return type.
DROP FUNCTION IF EXISTS delete_expired_vendor_drafts();

CREATE OR REPLACE FUNCTION delete_expired_vendor_drafts()
RETURNS TABLE(expired_deleted int, abandoned_deleted int)
LANGUAGE plpgsql
AS $$
DECLARE
  v_expired int;
  v_abandoned int;
BEGIN
  -- (a) Past their expires_at
  WITH del AS (
    DELETE FROM vendor_registration_drafts
    WHERE expires_at < now()
    RETURNING 1
  )
  SELECT count(*) INTO v_expired FROM del;

  -- (b) Truly abandoned: no phone, no email, idle > 7 days
  WITH del AS (
    DELETE FROM vendor_registration_drafts
    WHERE identity_key IS NULL
      AND updated_at < now() - interval '7 days'
    RETURNING 1
  )
  SELECT count(*) INTO v_abandoned FROM del;

  RETURN QUERY SELECT v_expired, v_abandoned;
END;
$$;

COMMENT ON FUNCTION delete_expired_vendor_drafts IS
  'Purges expired and abandoned vendor registration drafts.
   Returns (expired_deleted, abandoned_deleted). Scheduled nightly via pg_cron
   if available; can also be invoked manually from the admin Data Health card.';

-- 3. Nightly cleanup via pg_cron (best-effort) ------------------------
-- pg_cron is available on Supabase Pro+. If the extension isn't installed
-- the CREATE EXTENSION fails silently via the exception block — the
-- Data Health admin card still exposes a manual "Run cleanup now" button.
DO $$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron extension not available on this tier — manual cleanup only.';
    RETURN;
  END;

  -- Remove any previous schedule by name (safe re-run of this migration)
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'purge-expired-vendor-drafts';

  PERFORM cron.schedule(
    'purge-expired-vendor-drafts',
    '0 3 * * *',
    $cron$ SELECT delete_expired_vendor_drafts(); $cron$
  );
END $$;
