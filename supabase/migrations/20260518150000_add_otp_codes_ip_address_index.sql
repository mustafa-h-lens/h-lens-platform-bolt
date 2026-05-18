/*
  # Partial index on otp_codes.ip_address for per-IP rate-limit queries

  Both `send-otp-sms` and `send-otp-email` edge functions now run a per-IP
  cap (20 requests / hour) before any vendor/email lookup. The query shape:

    SELECT count(*) FROM otp_codes
    WHERE ip_address = $1 AND created_at >= now() - interval '1 hour';

  Without this index it scans the table. With it, it's an index-only scan.
  Partial index excludes NULL and 'unknown' rows — most requests have a
  real x-forwarded-for, and we don't bother rate-limiting unknowns.

  Idempotent: IF NOT EXISTS.
*/

CREATE INDEX IF NOT EXISTS idx_otp_codes_ip_recent
  ON public.otp_codes (ip_address, created_at DESC)
  WHERE ip_address IS NOT NULL AND ip_address != 'unknown';
