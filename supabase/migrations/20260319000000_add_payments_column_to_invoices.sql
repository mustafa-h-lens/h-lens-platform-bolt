-- Add payments JSONB column to invoices table for storing payment history
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payments jsonb DEFAULT NULL;
