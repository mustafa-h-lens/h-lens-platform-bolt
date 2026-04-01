-- Sectors settings table
CREATE TABLE IF NOT EXISTS sectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_en text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Seed default sectors
INSERT INTO sectors (name_ar, name_en, display_order) VALUES
  ('تقنية', 'Technology', 1),
  ('تصميم', 'Design', 2),
  ('تسويق', 'Marketing', 3),
  ('عقارات', 'Real Estate', 4),
  ('تعليم', 'Education', 5),
  ('صحة', 'Healthcare', 6),
  ('سياحة', 'Tourism', 7),
  ('إنتاج', 'Production', 8),
  ('إعلام', 'Media', 9),
  ('أخرى', 'Other', 10)
ON CONFLICT DO NOTHING;

-- RLS policies
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read sectors" ON sectors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage sectors" ON sectors FOR ALL TO authenticated USING (true);
