-- Tracks when an admin sent the "your account was created" email to a vendor.
-- Set when the welcome email succeeds (auto-send on admin creation, or manual
-- send from the vendor's البيانات الشخصية page). NULL means no welcome email
-- has been delivered yet — surfaced in the UI so admins know who still needs
-- to be notified about their existing account.

ALTER TABLE public.vendors
ADD COLUMN IF NOT EXISTS welcome_email_sent_at TIMESTAMPTZ;
