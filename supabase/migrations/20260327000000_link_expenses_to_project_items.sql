-- ============================================================
-- Link expenses (vendor_invoices) to project items (البنود)
-- Each expense can optionally reference a specific project item
-- ============================================================

-- 1. Add project_item_id FK to vendor_invoices
ALTER TABLE public.vendor_invoices
ADD COLUMN IF NOT EXISTS project_item_id uuid REFERENCES public.project_items(id) ON DELETE SET NULL;

-- 2. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_vendor_invoices_project_item_id
ON public.vendor_invoices(project_item_id);
