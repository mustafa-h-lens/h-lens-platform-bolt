-- ============================================================================
-- SECURITY LOCKDOWN — PART D (registration drafts + OTP attempt counter)
-- ============================================================================
-- 1. vendor_registration_drafts had a SELECT policy of USING (... OR true),
--    letting ANY anon caller read EVERY draft's form_data — which contains the
--    in-progress registration PII (name, phone, email, national ID number being
--    typed). This replaces all direct anon table access with SECURITY DEFINER
--    RPCs keyed by the caller's unguessable session_id, so a draft is reachable
--    only by whoever holds its session id.
-- 2. verify-otp incremented failed_attempts via read-then-write (a race that let
--    concurrent requests exceed the 5-attempt lock). Adds an atomic increment
--    RPC the function calls instead.
--
-- No data is deleted.
-- ============================================================================

-- ── 1. Registration drafts: drop permissive policies, gate behind RPCs ──────
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'vendor_registration_drafts'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.vendor_registration_drafts', pol.policyname);
  END LOOP;
END $$;

-- RLS stays enabled; with no policies, anon/authenticated get no DIRECT access.
-- The SECURITY DEFINER functions below (owned by the migration role) and the
-- service role are the only ways in.
ALTER TABLE public.vendor_registration_drafts ENABLE ROW LEVEL SECURITY;

-- Read your own draft (by session id only).
CREATE OR REPLACE FUNCTION public.get_vendor_draft(p_session_id text)
RETURNS TABLE (form_data jsonb, current_step int)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT form_data, current_step
  FROM public.vendor_registration_drafts
  WHERE session_id = p_session_id
  LIMIT 1;
$$;

-- Upsert your own draft.
CREATE OR REPLACE FUNCTION public.save_vendor_draft(
  p_session_id  text,
  p_form_data   jsonb,
  p_current_step int,
  p_phone       text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_session_id IS NULL OR length(p_session_id) < 8 THEN
    RAISE EXCEPTION 'invalid session';
  END IF;

  UPDATE public.vendor_registration_drafts
     SET form_data = p_form_data,
         current_step = p_current_step,
         phone = p_phone,
         updated_at = now()
   WHERE session_id = p_session_id;

  IF NOT FOUND THEN
    INSERT INTO public.vendor_registration_drafts (session_id, form_data, current_step, phone)
    VALUES (p_session_id, p_form_data, p_current_step, p_phone);
  END IF;
END;
$$;

-- Delete your own draft.
CREATE OR REPLACE FUNCTION public.delete_vendor_draft(p_session_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  DELETE FROM public.vendor_registration_drafts WHERE session_id = p_session_id;
$$;

REVOKE ALL ON FUNCTION public.get_vendor_draft(text)              FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_vendor_draft(text, jsonb, int, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_vendor_draft(text)          FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_vendor_draft(text)              TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_vendor_draft(text, jsonb, int, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_vendor_draft(text)          TO anon, authenticated;

-- ── 2. Atomic OTP failed-attempt counter (called by verify-otp) ─────────────
CREATE OR REPLACE FUNCTION public.increment_otp_failed_attempts(p_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE n int;
BEGIN
  UPDATE public.otp_codes
     SET failed_attempts = COALESCE(failed_attempts, 0) + 1
   WHERE id = p_id
  RETURNING failed_attempts INTO n;
  RETURN COALESCE(n, 0);
END;
$$;

-- Only the Edge Function (service role) ever calls this; anon must not.
REVOKE ALL ON FUNCTION public.increment_otp_failed_attempts(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_otp_failed_attempts(uuid) TO service_role;

-- ----------------------------------------------------------------------------
-- POST-APPLY VERIFICATION
--   -- No policy should remain on the drafts table:
--   SELECT * FROM pg_policies WHERE tablename='vendor_registration_drafts';
--   -- Anon SELECT on the table directly must now fail / return nothing.
-- ----------------------------------------------------------------------------
