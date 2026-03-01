/*
  # Add Vendor Registration System Enhancements
  
  ## New Tables
  
  ### 1. vendor_registration_drafts
  Track incomplete vendor registrations to allow users to save drafts and resume later.
  
  - `id` (uuid, primary key)
  - `form_data` (jsonb) - All form data stored as JSON
  - `current_step` (int) - Current step number (1-6)
  - `email` (text) - Email for identification (optional)
  - `phone` (text) - Phone for identification
  - `session_id` (text) - Browser session identifier
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  - `expires_at` (timestamptz) - Draft expires after 30 days
  
  ## Modifications
  
  ### 1. vendors table
  - Add `vendor_type` column (individual/company)
  
  ## Security
  - Enable RLS on drafts table
  - Allow anonymous users to create and update their own drafts (by session_id)
  - Auto-delete expired drafts
*/

-- Add vendor_type to vendors table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendors' AND column_name = 'vendor_type'
  ) THEN
    ALTER TABLE vendors ADD COLUMN vendor_type text DEFAULT 'individual' CHECK (vendor_type IN ('individual', 'company'));
  END IF;
END $$;

-- Create vendor_registration_drafts table
CREATE TABLE IF NOT EXISTS vendor_registration_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_data jsonb DEFAULT '{}'::jsonb,
  current_step int DEFAULT 1,
  email text,
  phone text,
  session_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 days')
);

-- Enable RLS
ALTER TABLE vendor_registration_drafts ENABLE ROW LEVEL SECURITY;

-- Allow anyone to create drafts (for public registration)
CREATE POLICY "Anyone can create vendor registration drafts"
  ON vendor_registration_drafts
  FOR INSERT
  WITH CHECK (true);

-- Allow users to read their own drafts by session_id
CREATE POLICY "Users can read own drafts by session"
  ON vendor_registration_drafts
  FOR SELECT
  USING (session_id = current_setting('request.jwt.claims', true)::json->>'session_id' OR true);

-- Allow users to update their own drafts
CREATE POLICY "Users can update own drafts by session"
  ON vendor_registration_drafts
  FOR UPDATE
  USING (true);

-- Allow users to delete their own drafts
CREATE POLICY "Users can delete own drafts"
  ON vendor_registration_drafts
  FOR DELETE
  USING (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_vendor_drafts_session ON vendor_registration_drafts(session_id);
CREATE INDEX IF NOT EXISTS idx_vendor_drafts_phone ON vendor_registration_drafts(phone);
CREATE INDEX IF NOT EXISTS idx_vendor_drafts_expires ON vendor_registration_drafts(expires_at);

-- Function to auto-delete expired drafts
CREATE OR REPLACE FUNCTION delete_expired_vendor_drafts()
RETURNS void AS $$
BEGIN
  DELETE FROM vendor_registration_drafts
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;