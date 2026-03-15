/*
  # Seed banks and add RLS policies for public access
  
  1. New Data
    - Insert 12 major Saudi banks
  
  2. Security
    - Add RLS policy for anon/authenticated users to read banks
    - Add RLS policy for anon/authenticated users to read vendor_fields
    - Ensure cities table has read policy (already exists from previous migration)
*/

-- Insert banks
INSERT INTO banks (name_ar, name_en, is_active) VALUES
  ('البنك الأهلي السعودي', 'SNB', true),
  ('بنك الراجحي', 'Al Rajhi Bank', true),
  ('بنك الرياض', 'Riyad Bank', true),
  ('بنك ساب', 'SABB', true),
  ('البنك السعودي الفرنسي', 'BSF', true),
  ('بنك البلاد', 'Bank AlBilad', true),
  ('بنك الجزيرة', 'Bank AlJazira', true),
  ('بنك الإنماء', 'Alinma Bank', true),
  ('البنك العربي الوطني', 'ANB', true),
  ('بنك السعودي للاستثمار', 'SAIB', true),
  ('بنك الخليج الدولي', 'GIB', true),
  ('البنك الأول', 'SAB First', true)
ON CONFLICT DO NOTHING;

-- Allow anon to read banks
DROP POLICY IF EXISTS "Anyone can read banks" ON banks;
CREATE POLICY "Anyone can read banks"
  ON banks FOR SELECT
  TO authenticated, anon
  USING (true);

-- Allow anon to read vendor fields
DROP POLICY IF EXISTS "Anyone can read vendor fields" ON vendor_fields;
CREATE POLICY "Anyone can read vendor fields"
  ON vendor_fields FOR SELECT
  TO authenticated, anon
  USING (true);