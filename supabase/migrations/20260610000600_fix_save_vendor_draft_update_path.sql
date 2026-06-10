-- ============================================================================
-- FIX save_vendor_draft UPDATE-path collision (completes 20260610000500)
-- ============================================================================
-- The ON CONFLICT fix only guarded the INSERT path. The UPDATE-by-session path
-- still violated ux_drafts_identity_key: a session that already has a draft and
-- then sets its phone to one an ABANDONED draft already owns makes its generated
-- identity_key collide -> 23505/409 (the live frontend's repeated-autosave case).
--
-- Fix: before UPDATE/INSERT, remove any OTHER session's draft holding this
-- phone-identity (latest session wins). This RPC only ever writes the phone
-- column (email column stays NULL), so identity_key here == phone. Function body
-- only; signature, grants, SECURITY DEFINER and search_path unchanged.
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
DECLARE
  v_ident text := NULLIF(btrim(p_phone), '');
BEGIN
  IF p_session_id IS NULL OR length(p_session_id) < 8 THEN
    RAISE EXCEPTION 'invalid session';
  END IF;

  -- Latest session wins this phone-identity: drop any OTHER session's draft that
  -- already holds it, so neither the UPDATE nor the INSERT below can violate
  -- ux_drafts_identity_key. Never touches the current session's own row.
  IF v_ident IS NOT NULL THEN
    DELETE FROM public.vendor_registration_drafts
     WHERE identity_key = v_ident
       AND session_id IS DISTINCT FROM p_session_id;
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
