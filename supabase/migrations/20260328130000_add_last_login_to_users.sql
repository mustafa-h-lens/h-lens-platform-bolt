-- Add last_login column to track when users last signed in
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login timestamptz;
