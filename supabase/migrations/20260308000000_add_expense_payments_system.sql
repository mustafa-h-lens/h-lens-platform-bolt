-- Add new columns to vendor_invoices for expense tracking
ALTER TABLE vendor_invoices
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS invoice_file_url text;

-- Create expense_payments table
CREATE TABLE IF NOT EXISTS expense_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES vendor_invoices(id) ON DELETE CASCADE,
  amount decimal(15,2) NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL DEFAULT 'bank_transfer'
    CHECK (payment_method IN ('bank_transfer', 'cash', 'check')),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expense_payments_expense_id ON expense_payments(expense_id);

-- Enable RLS on expense_payments
ALTER TABLE expense_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies: admin-only access
CREATE POLICY "Admins can view expense payments"
  ON expense_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can insert expense payments"
  ON expense_payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can delete expense payments"
  ON expense_payments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Trigger function to auto-recalculate vendor_invoices from payments
CREATE OR REPLACE FUNCTION update_expense_from_payments()
RETURNS TRIGGER AS $$
DECLARE
  v_expense_id uuid;
  v_total_paid decimal(15,2);
  v_amount_total decimal(15,2);
  v_due_date date;
  v_new_status text;
BEGIN
  -- Determine which expense was affected
  IF TG_OP = 'DELETE' THEN
    v_expense_id := OLD.expense_id;
  ELSE
    v_expense_id := NEW.expense_id;
  END IF;

  -- Calculate total paid from all payments
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM expense_payments
  WHERE expense_id = v_expense_id;

  -- Get expense details
  SELECT amount_total, due_date INTO v_amount_total, v_due_date
  FROM vendor_invoices
  WHERE id = v_expense_id;

  -- Derive status
  IF v_total_paid >= v_amount_total THEN
    v_new_status := 'paid';
  ELSIF v_total_paid > 0 THEN
    v_new_status := 'partial';
  ELSIF v_due_date IS NOT NULL AND v_due_date < CURRENT_DATE THEN
    v_new_status := 'overdue';
  ELSE
    v_new_status := 'pending';
  END IF;

  -- Update the parent expense
  UPDATE vendor_invoices
  SET
    amount_paid = v_total_paid,
    amount_remaining = v_amount_total - v_total_paid,
    status = v_new_status
  WHERE id = v_expense_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_update_expense_from_payments ON expense_payments;
CREATE TRIGGER trg_update_expense_from_payments
  AFTER INSERT OR UPDATE OR DELETE ON expense_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_expense_from_payments();
