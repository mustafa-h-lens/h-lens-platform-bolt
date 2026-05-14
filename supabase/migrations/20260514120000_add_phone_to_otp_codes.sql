/*
  # Add phone column to otp_codes for SMS-OTP login

  The existing otp_codes table keys on `email` for email-OTP delivery.
  This migration adds a `phone` column so the same table can serve
  SMS-based login OTPs, with an XOR check constraint enforcing that
  exactly one of {email, phone} is set per row.

  ## Changes
  1. Add `phone` (text, nullable) column.
  2. Drop the NOT NULL constraint on `email` (now optional).
  3. Add XOR check: (email IS NOT NULL) <> (phone IS NOT NULL).
  4. Partial index on (phone, used) WHERE phone IS NOT NULL AND used = false
     for fast OTP lookups in the SMS verify path.
*/

ALTER TABLE otp_codes ADD COLUMN IF NOT EXISTS phone text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'otp_codes' AND column_name = 'email' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE otp_codes ALTER COLUMN email DROP NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'otp_codes_email_xor_phone'
  ) THEN
    ALTER TABLE otp_codes
      ADD CONSTRAINT otp_codes_email_xor_phone
      CHECK ((email IS NOT NULL) <> (phone IS NOT NULL));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_otp_codes_phone_unused
  ON otp_codes(phone, used)
  WHERE phone IS NOT NULL AND used = false;

CREATE INDEX IF NOT EXISTS idx_otp_codes_phone_created
  ON otp_codes(phone, created_at DESC)
  WHERE phone IS NOT NULL;
