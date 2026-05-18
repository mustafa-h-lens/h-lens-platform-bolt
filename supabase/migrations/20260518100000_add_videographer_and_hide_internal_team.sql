/*
  # Vendor fields: add مصور فيديو and hide فريق العمل الداخلي from registration

  ## Changes
  1. Insert new subcategory "مصور فيديو" (Videographer) under the existing
     "قسم الكاميرا" (Camera Department) parent. Distinct from the existing
     "مصور كاميرا" (Camera Operator, cinematic) and "مصور فوتوغرافي"
     (Photographer, stills) — this row covers event/social/corporate
     videography which is its own role in Saudi production market.

  2. Mark "فريق العمل الداخلي" as inactive. The vendor registration step
     (StepFieldsAndRates) queries `.eq('is_active', true)` so it will be
     hidden from vendor self-selection. The admin Settings → Vendor Fields
     page does NOT filter by is_active, so admins retain full visibility
     and can manage / reassign / reactivate as needed. This matches the
     user's requirement: "decided and chosen by the admins only".

  Pure data migration — no schema changes, idempotent, safe to re-run.
*/

DO $$
DECLARE
  camera_dept_id uuid;
  next_order int;
BEGIN
  -- Find the Camera Department parent
  SELECT id INTO camera_dept_id
  FROM public.vendor_fields
  WHERE name_ar = 'قسم الكاميرا' AND parent_id IS NULL
  LIMIT 1;

  IF camera_dept_id IS NOT NULL THEN
    -- Place the new row after the last subcategory of Camera Dept
    SELECT COALESCE(MAX(display_order), 0) + 1 INTO next_order
    FROM public.vendor_fields
    WHERE parent_id = camera_dept_id;

    -- Idempotent insert — only if not already present
    INSERT INTO public.vendor_fields (name_ar, name_en, parent_id, display_order, is_active)
    SELECT 'مصور فيديو', 'Videographer', camera_dept_id, next_order, true
    WHERE NOT EXISTS (
      SELECT 1 FROM public.vendor_fields
      WHERE name_ar = 'مصور فيديو' AND parent_id = camera_dept_id
    );
  END IF;

  -- Hide internal-team field from vendor self-selection
  UPDATE public.vendor_fields
  SET is_active = false
  WHERE name_ar = 'فريق العمل الداخلي' AND is_active = true;
END $$;
