-- ============================================================================
-- ROLLBACK for 20260610000600_fix_save_vendor_draft_update_path
-- Restores the 20260610000500 version (ON CONFLICT on INSERT only — the
-- UPDATE-path 409 returns).
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

  UPDATE public.vendor_registration_drafts
     SET form_data = p_form_data,
         current_step = p_current_step,
         phone = p_phone,
         updated_at = now()
   WHERE session_id = p_session_id;

  IF NOT FOUND THEN
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
