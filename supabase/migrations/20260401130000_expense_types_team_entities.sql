-- Add expense type columns to vendor_invoices
ALTER TABLE vendor_invoices ADD COLUMN IF NOT EXISTS expense_type text DEFAULT 'vendor';
ALTER TABLE vendor_invoices ADD COLUMN IF NOT EXISTS expense_description text;
ALTER TABLE vendor_invoices ADD COLUMN IF NOT EXISTS team_member_id uuid REFERENCES users(id);
ALTER TABLE vendor_invoices ADD COLUMN IF NOT EXISTS paid_by_user_id uuid REFERENCES users(id);

-- Make vendor_id nullable (required only for vendor type expenses)
ALTER TABLE vendor_invoices ALTER COLUMN vendor_id DROP NOT NULL;

-- Team entities table (departments like المالية, الإدارة)
CREATE TABLE IF NOT EXISTS team_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_en text,
  entity_type text NOT NULL DEFAULT 'department' CHECK (entity_type IN ('department')),
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

INSERT INTO team_entities (name_ar, name_en, display_order) VALUES
  ('المالية', 'Finance', 1),
  ('الإدارة', 'Management', 2)
ON CONFLICT DO NOTHING;

ALTER TABLE team_entities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read team_entities" ON team_entities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage team_entities" ON team_entities FOR ALL TO authenticated USING (true);
