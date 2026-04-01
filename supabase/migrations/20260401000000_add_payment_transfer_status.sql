-- Payment status workflow: draft → approved → transferred
ALTER TABLE expense_payments ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'draft';
ALTER TABLE expense_payments ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE expense_payments ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES users(id);
ALTER TABLE expense_payments ADD COLUMN IF NOT EXISTS transferred_at timestamptz;
ALTER TABLE expense_payments ADD COLUMN IF NOT EXISTS transferred_by uuid REFERENCES users(id);

-- Update existing payments to 'transferred' (they were already processed)
UPDATE expense_payments SET payment_status = 'transferred' WHERE payment_status = 'draft';
