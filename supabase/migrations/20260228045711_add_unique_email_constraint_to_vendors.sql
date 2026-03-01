/*
  # Add unique constraint on vendor email

  1. Changes
    - Add unique constraint to vendors.email to prevent duplicate registrations
    - This ensures each email can only be registered once in the system
  
  2. Security
    - Prevents duplicate vendor accounts with same email
*/

-- Add unique constraint to email if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'vendors_email_unique'
  ) THEN
    ALTER TABLE vendors ADD CONSTRAINT vendors_email_unique UNIQUE (email);
  END IF;
END $$;
