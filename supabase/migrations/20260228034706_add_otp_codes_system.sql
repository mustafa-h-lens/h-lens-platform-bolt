/*
  # OTP Authentication System for Suppliers

  1. New Tables
    - `otp_codes`
      - `id` (uuid, primary key) - Unique identifier for each OTP record
      - `email` (text, not null) - Email address of the supplier requesting OTP
      - `code` (text, not null) - The 4-digit OTP code (will be encrypted)
      - `expires_at` (timestamptz, not null) - Expiration time (10 minutes from creation)
      - `used` (boolean, default false) - Whether the OTP has been used
      - `created_at` (timestamptz, default now) - When the OTP was created
      - `attempts` (integer, default 0) - Number of verification attempts
      - `ip_address` (text) - IP address of the requester for security
      - `device_info` (text) - Device information for display in email

  2. Security
    - Enable RLS on `otp_codes` table
    - No public access to the table (only server-side functions can access)
    - Add index on email and created_at for rate limiting queries
    - Add index on expires_at for cleanup queries

  3. Functions
    - Automatic cleanup function to delete expired OTPs older than 24 hours
*/

-- Create OTP codes table
CREATE TABLE IF NOT EXISTS otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  attempts integer DEFAULT 0,
  ip_address text,
  device_info text
);

-- Enable RLS
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

-- No policies - only server-side functions should access this table
-- This ensures OTP codes are never exposed to the client

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_otp_codes_email_created 
  ON otp_codes(email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_otp_codes_expires 
  ON otp_codes(expires_at);

CREATE INDEX IF NOT EXISTS idx_otp_codes_email_unused 
  ON otp_codes(email, used) 
  WHERE used = false;

-- Function to cleanup old OTP codes (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM otp_codes
  WHERE created_at < now() - interval '24 hours';
END;
$$;

-- Grant execute permission on cleanup function
GRANT EXECUTE ON FUNCTION cleanup_expired_otps() TO service_role;