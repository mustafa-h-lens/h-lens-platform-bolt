-- Add company_name and vat_number to vendor_financial_data
-- These are required when vendor has price_includes_tax enabled
ALTER TABLE vendor_financial_data ADD COLUMN IF NOT EXISTS company_name text;
ALTER TABLE vendor_financial_data ADD COLUMN IF NOT EXISTS vat_number text;
