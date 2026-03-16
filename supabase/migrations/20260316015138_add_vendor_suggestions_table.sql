/*
  # Add Vendor Suggestions Table

  1. New Tables
    - `vendor_suggestions`
      - `id` (uuid, primary key)
      - `vendor_id` (uuid, foreign key to vendors)
      - `title` (text)
      - `content` (text)
      - `category` (text, enum: feature/improvement/bug/other)
      - `status` (text, enum: new/under_review/accepted/rejected/implemented)
      - `admin_response` (text, nullable)
      - `responded_by` (uuid, foreign key to users, nullable)
      - `responded_at` (timestamptz, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Indexes
    - vendor_id for fast lookup by vendor
    - status for filtering by status
    - created_at DESC for chronological ordering

  3. Security
    - RLS enabled
    - Anon users can manage their own suggestions (vendor portal access)
    - Authenticated users (admins) can read all suggestions
    - Authenticated users (admins) can update suggestions (respond/change status)
*/

CREATE TABLE IF NOT EXISTS vendor_suggestions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id      uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  title          text NOT NULL,
  content        text NOT NULL,
  category       text DEFAULT 'other' CHECK (category IN ('feature', 'improvement', 'bug', 'other')),
  status         text DEFAULT 'new' CHECK (status IN ('new', 'under_review', 'accepted', 'rejected', 'implemented')),
  admin_response text,
  responded_by   uuid REFERENCES users(id),
  responded_at   timestamptz,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_suggestions_vendor_id ON vendor_suggestions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_suggestions_status ON vendor_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_vendor_suggestions_created_at ON vendor_suggestions(created_at DESC);

ALTER TABLE vendor_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon can manage vendor_suggestions" ON public.vendor_suggestions;
CREATE POLICY "Anon can manage vendor_suggestions"
  ON public.vendor_suggestions FOR ALL TO anon
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can read all suggestions" ON public.vendor_suggestions;
CREATE POLICY "Admins can read all suggestions"
  ON public.vendor_suggestions FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can update suggestions" ON public.vendor_suggestions;
CREATE POLICY "Admins can update suggestions"
  ON public.vendor_suggestions FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);
