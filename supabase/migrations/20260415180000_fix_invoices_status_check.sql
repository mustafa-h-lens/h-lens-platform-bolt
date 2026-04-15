-- Update invoices.status check constraint to match app statuses
-- App uses: draft, sent, paid, overdue, cancelled
-- Old constraint only allowed: paid, unpaid, partial, cancelled

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;

-- Migrate legacy values to the new schema
UPDATE invoices SET status = 'sent' WHERE status IN ('unpaid', 'partial');

ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
  CHECK (status = ANY (ARRAY['draft'::text, 'sent'::text, 'paid'::text, 'overdue'::text, 'cancelled'::text]));
