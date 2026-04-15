/*
  # Add timed block support for vendors

  1. Add blocked_until timestamptz and block_reason text columns to vendors
  2. Add auto_unblock_expired_vendors() RPC to auto-lift expired blocks
*/

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS blocked_until timestamptz,
  ADD COLUMN IF NOT EXISTS block_reason text;

CREATE OR REPLACE FUNCTION auto_unblock_expired_vendors()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.vendors
  SET status = 'active', blocked_until = NULL
  WHERE status = 'blocked'
    AND blocked_until IS NOT NULL
    AND blocked_until <= now();
$$;

GRANT EXECUTE ON FUNCTION auto_unblock_expired_vendors() TO authenticated;
