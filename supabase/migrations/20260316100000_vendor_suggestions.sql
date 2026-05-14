-- ============================================================
-- Vendor Suggestions Box
-- ============================================================
-- 1. Create vendor_suggestions table
-- 2. Add indexes for performance
-- 3. RLS policies:
--    - anon: full access (vendor portal uses anon role via OTP session)
--    - authenticated: admins can read all + update (respond/change status)

CREATE TABLE IF NOT EXISTS vendor_suggestions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id       uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  title           text NOT NULL,
  content         text NOT NULL,
  category        text DEFAULT 'other' CHECK (category IN ('feature', 'improvement', 'bug', 'other')),
  status          text DEFAULT 'new' CHECK (status IN ('new', 'under_review', 'accepted', 'rejected', 'implemented')),
  admin_response  text,
  responded_by    uuid REFERENCES users(id),
  responded_at    timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vendor_suggestions_vendor_id ON vendor_suggestions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_suggestions_status ON vendor_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_vendor_suggestions_created_at ON vendor_suggestions(created_at DESC);

-- Enable RLS
ALTER TABLE vendor_suggestions ENABLE ROW LEVEL SECURITY;

-- Anon: vendors can SELECT, INSERT (portal uses anon role)
DROP POLICY IF EXISTS "Anon can manage vendor_suggestions" ON public.vendor_suggestions;
CREATE POLICY "Anon can manage vendor_suggestions"
  ON public.vendor_suggestions
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Authenticated: admins can read all suggestions
DROP POLICY IF EXISTS "Admins can read all suggestions" ON public.vendor_suggestions;
CREATE POLICY "Admins can read all suggestions"
  ON public.vendor_suggestions
  FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated: admins can update suggestions (respond, change status)
DROP POLICY IF EXISTS "Admins can update suggestions" ON public.vendor_suggestions;
CREATE POLICY "Admins can update suggestions"
  ON public.vendor_suggestions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
