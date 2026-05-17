/*
  # Backfill equipment_suggestions table (prod-drift)

  Table referenced by RLS policies in 20260328110038 but never created
  by any repo migration. Was added manually on prod.
*/

CREATE TABLE IF NOT EXISTS public.equipment_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  name text NOT NULL,
  category text,
  brand text,
  notes text,
  status text DEFAULT 'pending',
  reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.equipment_suggestions ENABLE ROW LEVEL SECURITY;
