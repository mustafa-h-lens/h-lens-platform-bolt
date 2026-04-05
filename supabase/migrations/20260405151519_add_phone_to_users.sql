/*
  # Add phone column to users table

  ## Changes
  - Adds a nullable `phone` text column to the `users` table

  ## Reason
  The user management form collects a phone number field, but the column
  did not exist in the schema, causing a runtime error when creating or
  updating users.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'phone' AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.users ADD COLUMN phone text;
  END IF;
END $$;
