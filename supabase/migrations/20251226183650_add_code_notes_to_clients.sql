/*
  # Add code and notes fields to clients table

  1. Changes
    - Add `code` column to clients table (unique, nullable)
    - Add `notes` column to clients table (nullable, text)
  
  2. Notes
    - code field will be used for client identification
    - notes field will store additional information about clients
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'code'
  ) THEN
    ALTER TABLE clients ADD COLUMN code text UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'notes'
  ) THEN
    ALTER TABLE clients ADD COLUMN notes text;
  END IF;
END $$;
