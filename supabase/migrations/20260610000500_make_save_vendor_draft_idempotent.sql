-- ============================================================================
-- MAKE save_vendor_draft IDEMPOTENT (fix draft-autosave 409 / 23505)
-- ============================================================================
-- The drafts table has a partial unique index ux_drafts_identity_key on
-- identity_key (= COALESCE(lower(email), phone)). The old function UPDATEd by
-- session_id then plain-INSERTed; a save from a NEW session_id with a phone that
-- already had a draft violated that index -> 409. This adds ON CONFLICT so the
-- new session collapses onto the existing draft (adopting the new session_id,
-- so get_vendor_draft still restores it). Function body only; signature, grants,
-- SECURITY DEFINER and search_path are unchanged.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.save_vendor_draft(
  p_session_id   text,
  p_form_data    jsonb,
  p_current_step int,
  p_phone        text DEFAULT NULL
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

  -- Same session: update in place (also covers no-phone-yet drafts, identity_key NULL).
  UPDATE public.vendor_registration_drafts
     SET form_data = p_form_data,
         current_step = p_current_step,
         phone = p_phone,
         updated_at = now()
   WHERE session_id = p_session_id;

  IF NOT FOUND THEN
    -- New session: if this phone already has a draft, collapse onto it instead of
    -- violating ux_drafts_identity_key. The existing row adopts the new session_id.
    INSERT INTO public.vendor_registration_drafts (session_id, form_data, current_step, phone)
    VALUES (p_session_id, p_form_data, p_current_step, p_phone)
    ON CONFLICT (identity_key) WHERE identity_key IS NOT NULL
    DO UPDATE SET
      session_id   = EXCLUDED.session_id,
      form_data    = EXCLUDED.form_data,
      current_step = EXCLUDED.current_step,
      phone        = EXCLUDED.phone,
      updated_at   = now();
  END IF;
END;
$$;
