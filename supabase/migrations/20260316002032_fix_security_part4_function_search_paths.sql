/*
  # Fix Security and Performance Issues - Part 4: Function Search Paths

  1. **Fix Function Search Paths**
    - Set search_path = public for all security definer functions
    - Prevents potential security vulnerabilities from role-mutable search paths
    - Functions affected:
      - cleanup_expired_otps
      - update_expense_from_payments (with trigger recreation)
      - get_next_legal_page_version
      - publish_legal_page

  2. **Important Notes**
    - Must drop and recreate trigger for update_expense_from_payments
    - All functions maintain SECURITY DEFINER property
    - SET search_path = public makes them immune to search path attacks
*/

-- =====================================================
-- Fix cleanup_expired_otps Function
-- =====================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.otp_codes 
  WHERE expires_at < now();
END;
$$;

-- =====================================================
-- Fix update_expense_from_payments Function
-- =====================================================

-- Drop the trigger first
DROP TRIGGER IF EXISTS trg_update_expense_from_payments ON public.expense_payments;

-- Recreate the function with proper search_path
CREATE OR REPLACE FUNCTION public.update_expense_from_payments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.expenses
  SET paid_amount = (
    SELECT COALESCE(SUM(amount), 0)
    FROM public.expense_payments
    WHERE expense_id = NEW.expense_id
  )
  WHERE id = NEW.expense_id;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trg_update_expense_from_payments ON public.expense_payments;
CREATE TRIGGER trg_update_expense_from_payments AFTER INSERT OR UPDATE OR DELETE ON public.expense_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_expense_from_payments();

-- =====================================================
-- Fix get_next_legal_page_version Function
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_next_legal_page_version(page_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_version integer;
BEGIN
  SELECT COALESCE(MAX(version), 0) + 1 
  INTO next_version
  FROM public.legal_pages_history
  WHERE page_id = page_id_param;
  
  RETURN next_version;
END;
$$;

-- =====================================================
-- Fix publish_legal_page Function
-- =====================================================

CREATE OR REPLACE FUNCTION public.publish_legal_page(
  page_id_param uuid,
  user_id_param uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_page RECORD;
  new_version integer;
BEGIN
  SELECT * INTO current_page
  FROM public.legal_pages
  WHERE id = page_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Legal page not found';
  END IF;
  
  new_version := public.get_next_legal_page_version(page_id_param);
  
  INSERT INTO public.legal_pages_history (
    page_id,
    version,
    content,
    created_by,
    created_at
  ) VALUES (
    page_id_param,
    new_version,
    current_page.content,
    user_id_param,
    now()
  );
  
  UPDATE public.legal_pages
  SET 
    is_active = true,
    updated_at = now()
  WHERE id = page_id_param;
END;
$$;
