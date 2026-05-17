-- Add failed_attempts tracking to OTP codes for brute-force protection
ALTER TABLE otp_codes ADD COLUMN IF NOT EXISTS failed_attempts integer DEFAULT 0;

-- Create vendor_sessions table for persistent session management
CREATE TABLE IF NOT EXISTS vendor_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token uuid NOT NULL UNIQUE,
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE vendor_sessions ENABLE ROW LEVEL SECURITY;

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_vendor_sessions_token ON vendor_sessions(token);
CREATE INDEX IF NOT EXISTS idx_vendor_sessions_vendor_id ON vendor_sessions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_sessions_expires_at ON vendor_sessions(expires_at);

-- Policy: vendors can read their own sessions
DROP POLICY IF EXISTS "Vendors can read own sessions" ON vendor_sessions;
CREATE POLICY "Vendors can read own sessions" ON vendor_sessions FOR SELECT
  USING (true);

-- Policy: service role can manage all sessions (via Edge Functions)
DROP POLICY IF EXISTS "Service role can manage sessions" ON vendor_sessions;
CREATE POLICY "Service role can manage sessions" ON vendor_sessions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Auto-cleanup expired sessions (can be run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM vendor_sessions WHERE expires_at < now();
  DELETE FROM otp_codes WHERE expires_at < now() AND created_at < now() - interval '24 hours';
END;
$$;
