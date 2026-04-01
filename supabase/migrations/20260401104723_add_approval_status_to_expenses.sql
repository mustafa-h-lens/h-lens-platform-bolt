/*
  # Add approval_status to vendor_invoices

  ## Summary
  Adds a new `approval_status` column to the `vendor_invoices` table to support
  a manual approval workflow for expenses. This is separate from the auto-calculated
  `status` field (which tracks payment amounts).

  ## New Columns
  - `vendor_invoices.approval_status` (text):
    - `draft` – newly created expense, not yet reviewed (default)
    - `approved` – expense has been approved for payment
    - `paid` – expense has been fully paid/settled

  ## Notes
  - All existing expenses default to `draft`
  - The approval flow is: draft → approved → paid
  - This field is manually controlled by users, distinct from the payment-amount-based `status` field
*/

ALTER TABLE vendor_invoices
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'draft'
  CHECK (approval_status IN ('draft', 'approved', 'paid'));
