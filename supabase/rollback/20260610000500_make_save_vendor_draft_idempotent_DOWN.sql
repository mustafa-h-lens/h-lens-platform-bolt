-- ============================================================================
-- ROLLBACK for 20260610000500_make_save_vendor_draft_idempotent
-- Restores the previous (non-idempotent) save_vendor_draft body. WARNING: this
-- re-introduces the cross-session same-phone 409.
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
    VALUES (p_session_id, p_form_data, p_current_step, p_phone);
  END IF;
END;
$$;
