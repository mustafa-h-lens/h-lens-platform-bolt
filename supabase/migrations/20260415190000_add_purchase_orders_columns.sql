-- Add missing columns the app expects on purchase_orders
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS currency text DEFAULT 'SAR';
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS issue_date date;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS expiry_date date;

NOTIFY pgrst, 'reload schema';
