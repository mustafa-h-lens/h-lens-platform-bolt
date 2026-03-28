-- ============================================================
-- Client Portal: Sessions + Invitation Infrastructure
-- Mirrors vendor_sessions pattern for client OTP auth
-- ============================================================

-- 1. Create client_sessions table (mirrors vendor_sessions)
CREATE TABLE IF NOT EXISTS public.client_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_sessions_token ON public.client_sessions(token);
CREATE INDEX IF NOT EXISTS idx_client_sessions_client_id ON public.client_sessions(client_id);

-- 2. Add invitation tracking to clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS invitation_status text NOT NULL DEFAULT 'not_invited';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS invited_at timestamptz;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS portal_email text;

-- 3. Enable RLS
ALTER TABLE public.client_sessions ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies for client_sessions
CREATE POLICY "Service role can manage client sessions"
  ON public.client_sessions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can insert client sessions"
  ON public.client_sessions FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can read client sessions"
  ON public.client_sessions FOR SELECT
  TO anon
  USING (true);
