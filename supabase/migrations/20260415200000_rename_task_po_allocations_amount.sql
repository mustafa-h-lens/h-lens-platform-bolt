-- Rename task_po_allocations.amount to allocated_amount to match app code
ALTER TABLE task_po_allocations RENAME COLUMN amount TO allocated_amount;

NOTIFY pgrst, 'reload schema';
