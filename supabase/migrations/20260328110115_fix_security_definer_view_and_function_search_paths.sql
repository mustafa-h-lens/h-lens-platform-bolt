
/*
  # Fix Security Definer View and Mutable Function Search Paths

  ## Summary
  1. Recreates global_activity_log as SECURITY INVOKER (default) instead of SECURITY DEFINER
     to prevent privilege escalation risks.
  2. Fixes the search_path for functions update_roles_updated_at, get_next_legal_page_version,
     and publish_legal_page by setting search_path = public, pg_temp.

  ## Security Changes
  - global_activity_log view no longer runs with owner privileges
  - Functions have fixed search_path to prevent search_path injection attacks
*/

-- Drop and recreate the view without SECURITY DEFINER
DROP VIEW IF EXISTS public.global_activity_log;

CREATE VIEW public.global_activity_log
WITH (security_invoker = true)
AS
  SELECT
    al.id,
    'project'::text AS source_type,
    al.action_type,
    'project'::text AS entity_type,
    al.project_id AS entity_id,
    p.name AS entity_name,
    COALESCE(u.full_name, 'النظام'::text) AS user_name,
    al.user_id,
    al.action_details,
    al.created_at
  FROM activity_logs al
  LEFT JOIN users u ON u.id = al.user_id
  LEFT JOIN projects p ON p.id = al.project_id
UNION ALL
  SELECT
    val.id,
    'vendor'::text AS source_type,
    val.action_type,
    val.entity_type,
    val.vendor_id AS entity_id,
    v.full_name AS entity_name,
    COALESCE(u.full_name, 'النظام'::text) AS user_name,
    val.performed_by AS user_id,
    val.details AS action_details,
    val.created_at
  FROM vendor_activity_log val
  LEFT JOIN users u ON u.id = val.performed_by
  LEFT JOIN vendors v ON v.id = val.vendor_id
UNION ALL
  SELECT
    sal.id,
    'system'::text AS source_type,
    sal.action_type,
    sal.entity_type,
    sal.entity_id,
    sal.entity_name,
    COALESCE(u.full_name, 'النظام'::text) AS user_name,
    sal.user_id,
    sal.action_details,
    sal.created_at
  FROM system_activity_log sal
  LEFT JOIN users u ON u.id = sal.user_id;

-- Fix update_roles_updated_at function search_path
CREATE OR REPLACE FUNCTION public.update_roles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix get_next_legal_page_version - there are two overloads, fix both
-- Version with page_type parameter
DO $$
DECLARE
  func_exists boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'get_next_legal_page_version'
      AND pg_get_function_arguments(p.oid) LIKE '%page_type%'
  ) INTO func_exists;

  IF func_exists THEN
    EXECUTE $func$
      CREATE OR REPLACE FUNCTION public.get_next_legal_page_version(page_type text)
      RETURNS integer
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, pg_temp
      AS $body$
      DECLARE
        max_version integer;
      BEGIN
        SELECT COALESCE(MAX(version), 0) + 1
        INTO max_version
        FROM legal_pages
        WHERE type = page_type;
        RETURN max_version;
      END;
      $body$;
    $func$;
  END IF;
END $$;

-- Version with page_id_param parameter
DO $$
DECLARE
  func_exists boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'get_next_legal_page_version'
      AND pg_get_function_arguments(p.oid) LIKE '%page_id_param%'
  ) INTO func_exists;

  IF func_exists THEN
    EXECUTE $func$
      CREATE OR REPLACE FUNCTION public.get_next_legal_page_version(page_id_param uuid)
      RETURNS integer
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, pg_temp
      AS $body$
      DECLARE
        next_version integer;
      BEGIN
        SELECT COALESCE(MAX(version), 0) + 1
        INTO next_version
        FROM public.legal_pages_history
        WHERE page_id = page_id_param;
        RETURN next_version;
      END;
      $body$;
    $func$;
  END IF;
END $$;

-- Fix publish_legal_page - there are two overloads, fix both
-- Version with page_id parameter only
DO $$
DECLARE
  func_exists boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'publish_legal_page'
      AND pg_get_function_arguments(p.oid) = 'page_id uuid'
  ) INTO func_exists;

  IF func_exists THEN
    EXECUTE $func$
      CREATE OR REPLACE FUNCTION public.publish_legal_page(page_id uuid)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, pg_temp
      AS $body$
      DECLARE
        page_type text;
      BEGIN
        SELECT type INTO page_type FROM legal_pages WHERE id = page_id;

        INSERT INTO legal_pages_history (page_id, type, version, last_updated, content, created_by)
        SELECT id, type, version, last_updated, content, created_by
        FROM legal_pages
        WHERE type = page_type AND is_active = true;

        UPDATE legal_pages
        SET is_active = false
        WHERE type = page_type;

        UPDATE legal_pages
        SET is_active = true, published_at = now()
        WHERE id = page_id;
      END;
      $body$;
    $func$;
  END IF;
END $$;

-- Version with page_id_param and user_id_param parameters
DO $$
DECLARE
  func_exists boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'publish_legal_page'
      AND pg_get_function_arguments(p.oid) LIKE '%page_id_param%'
  ) INTO func_exists;

  IF func_exists THEN
    EXECUTE $func$
      CREATE OR REPLACE FUNCTION public.publish_legal_page(page_id_param uuid, user_id_param uuid)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, pg_temp
      AS $body$
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
      $body$;
    $func$;
  END IF;
END $$;
