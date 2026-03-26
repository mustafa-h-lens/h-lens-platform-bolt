-- Add contacts JSONB column to clients table for storing multiple contact people
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contacts jsonb DEFAULT NULL;
