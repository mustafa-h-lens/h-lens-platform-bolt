-- Add expense_type and expense_description to vendor_invoices
-- Make vendor_id nullable for non-vendor expenses
ALTER TABLE vendor_invoices ADD COLUMN IF NOT EXISTS expense_type text NOT NULL DEFAULT 'vendor';
ALTER TABLE vendor_invoices ADD COLUMN IF NOT EXISTS expense_description text;
ALTER TABLE vendor_invoices ALTER COLUMN vendor_id DROP NOT NULL;
