/*
  # Add Client Image and Make Email Optional

  ## Changes:
  1. Add client_image column to clients table
     - Stores the URL or path to the client's profile image
     - Optional field (nullable)
     - Data type: text
  
  2. Make email field optional
     - Change email column to allow NULL values
     - Existing clients without email will not be affected
  
  ## Security:
  - No changes to RLS policies
  - Existing data remains protected
*/

-- Add client_image column to store profile picture URL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'client_image'
  ) THEN
    ALTER TABLE clients ADD COLUMN client_image text;
  END IF;
END $$;

-- Make email field optional (nullable)
ALTER TABLE clients ALTER COLUMN email DROP NOT NULL;