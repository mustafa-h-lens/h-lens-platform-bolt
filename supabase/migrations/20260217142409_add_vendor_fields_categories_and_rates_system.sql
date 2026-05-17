/*
  # Enhanced Vendor Fields with Categories and Rate Ranges
  
  1. Changes
    - Drop existing vendor_fields table and recreate with hierarchy support
    - Add parent_id to support categories and subcategories
    - Add bilingual support (Arabic and English names)
    - Create vendor_selected_fields table to store vendor's chosen fields with rate ranges
    - Add sample data for all 10 categories with their subcategories
    
  2. Tables
    - `vendor_fields`: Stores categories and their subcategories
      - `id` (uuid, primary key)
      - `name_ar` (text, Arabic name)
      - `name_en` (text, English name)
      - `parent_id` (uuid, nullable, references vendor_fields for hierarchy)
      - `display_order` (integer, for sorting)
      - `is_active` (boolean)
      
    - `vendor_selected_fields`: Links vendors to their chosen fields with rates
      - `id` (uuid, primary key)
      - `vendor_id` (uuid, references vendors)
      - `field_id` (uuid, references vendor_fields)
      - `rate_from` (decimal, minimum rate)
      - `rate_to` (decimal, maximum rate)
      - `currency` (text, default 'SAR')
      
  3. Security
    - Enable RLS on both tables
    - Policies for authenticated users and admins
*/

-- Drop existing vendor_fields table if it exists
DROP TABLE IF EXISTS vendor_fields CASCADE;

-- Create enhanced vendor_fields table with hierarchy
CREATE TABLE IF NOT EXISTS vendor_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_en text NOT NULL,
  parent_id uuid REFERENCES vendor_fields(id) ON DELETE CASCADE,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create vendor_selected_fields table
CREATE TABLE IF NOT EXISTS vendor_selected_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendors(id) ON DELETE CASCADE NOT NULL,
  field_id uuid REFERENCES vendor_fields(id) ON DELETE CASCADE NOT NULL,
  rate_from decimal(10,2),
  rate_to decimal(10,2),
  currency text DEFAULT 'SAR',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(vendor_id, field_id)
);

-- Enable RLS
ALTER TABLE vendor_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_selected_fields ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vendor_fields
DROP POLICY IF EXISTS "Anyone can view active vendor fields" ON vendor_fields;
CREATE POLICY "Anyone can view active vendor fields" ON vendor_fields FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage vendor fields" ON vendor_fields;
CREATE POLICY "Admins can manage vendor fields" ON vendor_fields FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- RLS Policies for vendor_selected_fields
DROP POLICY IF EXISTS "Vendors can view own selected fields" ON vendor_selected_fields;
CREATE POLICY "Vendors can view own selected fields" ON vendor_selected_fields FOR SELECT
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM vendors WHERE phone = (
        SELECT phone FROM users WHERE id = auth.uid()
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can manage vendor selected fields" ON vendor_selected_fields;
CREATE POLICY "Admins can manage vendor selected fields" ON vendor_selected_fields FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Insert categories and subcategories
DO $$
DECLARE
  cat_id uuid;
BEGIN
  -- 1. الإدارة والإشراف (Production Management)
  INSERT INTO vendor_fields (name_ar, name_en, parent_id, display_order)
  VALUES ('الإدارة والإشراف', 'Production Management', NULL, 1)
  RETURNING id INTO cat_id;
  
  INSERT INTO vendor_fields (name_ar, name_en, parent_id, display_order) VALUES
    ('منتج', 'Producer', cat_id, 1),
    ('منتج منفذ', 'Executive Producer', cat_id, 2),
    ('مدير إنتاج', 'Production Manager', cat_id, 3),
    ('منسق إنتاج', 'Production Coordinator', cat_id, 4),
    ('مساعد إنتاج', 'Production Assistant', cat_id, 5),
    ('مدير موقع تصوير', 'Location Manager', cat_id, 6),
    ('مدير وحدة إنتاج', 'Unit Production Manager', cat_id, 7);

  -- 2. الإخراج (Direction Department)
  INSERT INTO vendor_fields (name_ar, name_en, parent_id, display_order)
  VALUES ('الإخراج', 'Direction Department', NULL, 2)
  RETURNING id INTO cat_id;
  
  INSERT INTO vendor_fields (name_ar, name_en, parent_id, display_order) VALUES
    ('مخرج', 'Director', cat_id, 1),
    ('مساعد مخرج', 'Assistant Director (AD)', cat_id, 2),
    ('سكربت مشرف', 'Script Supervisor', cat_id, 3),
    ('مخرج منفذ', 'Line Producer', cat_id, 4),
    ('مخرج فني', 'Artistic Director', cat_id, 5);

  -- 3. قسم الكاميرا (Camera Department)
  INSERT INTO vendor_fields (name_ar, name_en, parent_id, display_order)
  VALUES ('قسم الكاميرا', 'Camera Department', NULL, 3)
  RETURNING id INTO cat_id;
  
  INSERT INTO vendor_fields (name_ar, name_en, parent_id, display_order) VALUES
    ('مدير تصوير', 'Director of Photography (DOP)', cat_id, 1),
    ('مصور كاميرا', 'Camera Operator', cat_id, 2),
    ('مساعد كاميرا أول', '1st AC (Focus Puller)', cat_id, 3),
    ('مساعد كاميرا ثاني', '2nd AC', cat_id, 4),
    ('مشغل درون', 'Drone Operator', cat_id, 5),
    ('مصور فوتوغرافي', 'Photographer', cat_id, 6),
    ('مشغل جيمبل', 'Gimbal Operator', cat_id, 7);

  -- 4. الإضاءة (Lighting Department)
  INSERT INTO vendor_fields (name_ar, name_en, parent_id, display_order)
  VALUES ('الإضاءة', 'Lighting Department', NULL, 4)
  RETURNING id INTO cat_id;
  
  INSERT INTO vendor_fields (name_ar, name_en, parent_id, display_order) VALUES
    ('فني إضاءة', 'Gaffer', cat_id, 1),
    ('مساعد إضاءة', 'Best Boy', cat_id, 2),
    ('تقني إضاءة', 'Lighting Technician', cat_id, 3);

  -- 5. قسم الفن (Art Department)
  INSERT INTO vendor_fields (name_ar, name_en, parent_id, display_order)
  VALUES ('قسم الفن', 'Art Department', NULL, 5)
  RETURNING id INTO cat_id;
  
  INSERT INTO vendor_fields (name_ar, name_en, parent_id, display_order) VALUES
    ('مدير فني', 'Art Director', cat_id, 1),
    ('مصمم إنتاج', 'Production Designer', cat_id, 2),
    ('منسق مواقع', 'Set Designer', cat_id, 3),
    ('مصمم ديكور', 'Set Decorator', cat_id, 4),
    ('مصمم أزياء', 'Costume Designer', cat_id, 5),
    ('خبير مكياج', 'Makeup Artist', cat_id, 6);

  -- 6. الصوت (Sound Department)
  INSERT INTO vendor_fields (name_ar, name_en, parent_id, display_order)
  VALUES ('الصوت', 'Sound Department', NULL, 6)
  RETURNING id INTO cat_id;
  
  INSERT INTO vendor_fields (name_ar, name_en, parent_id, display_order) VALUES
    ('مهندس صوت', 'Sound Engineer', cat_id, 1),
    ('مسجل صوت ميداني', 'Location Sound Recordist', cat_id, 2),
    ('مشغل بوم', 'Boom Operator', cat_id, 3),
    ('مصمم صوت', 'Sound Designer', cat_id, 4);

  -- 7. ما بعد الإنتاج (Post Production)
  INSERT INTO vendor_fields (name_ar, name_en, parent_id, display_order)
  VALUES ('ما بعد الإنتاج', 'Post Production', NULL, 7)
  RETURNING id INTO cat_id;
  
  INSERT INTO vendor_fields (name_ar, name_en, parent_id, display_order) VALUES
    ('مونتير', 'Video Editor', cat_id, 1),
    ('مصحح ألوان', 'Colorist', cat_id, 2),
    ('مصمم موشن جرافيك', 'Motion Graphics Designer', cat_id, 3),
    ('مصمم مؤثرات بصرية', 'VFX Artist', cat_id, 4),
    ('مهندس صوت (ما بعد الإنتاج)', 'Post Sound Engineer', cat_id, 5);

  -- 8. المحتوى الرقمي والسوشال (Digital Content & Social)
  INSERT INTO vendor_fields (name_ar, name_en, parent_id, display_order)
  VALUES ('المحتوى الرقمي والسوشال', 'Digital Content & Social', NULL, 8)
  RETURNING id INTO cat_id;
  
  INSERT INTO vendor_fields (name_ar, name_en, parent_id, display_order) VALUES
    ('صانع محتوى', 'Content Creator', cat_id, 1),
    ('مدير محتوى', 'Content Manager', cat_id, 2),
    ('مدير حسابات سوشال', 'Social Media Manager', cat_id, 3),
    ('مخرج محتوى رقمي', 'Digital Director', cat_id, 4);

  -- 9. التسويق والإعلان (Marketing & Advertising)
  INSERT INTO vendor_fields (name_ar, name_en, parent_id, display_order)
  VALUES ('التسويق والإعلان', 'Marketing & Advertising', NULL, 9)
  RETURNING id INTO cat_id;
  
  INSERT INTO vendor_fields (name_ar, name_en, parent_id, display_order) VALUES
    ('مدير حملة', 'Campaign Manager', cat_id, 1),
    ('كاتب إعلاني', 'Copywriter', cat_id, 2),
    ('استراتيجي محتوى', 'Content Strategist', cat_id, 3),
    ('مدير علامة تجارية', 'Brand Manager', cat_id, 4);

  -- 10. المواهب والأداء (Talent & Performance)
  INSERT INTO vendor_fields (name_ar, name_en, parent_id, display_order)
  VALUES ('المواهب والأداء', 'Talent & Performance', NULL, 10)
  RETURNING id INTO cat_id;
  
  INSERT INTO vendor_fields (name_ar, name_en, parent_id, display_order) VALUES
    ('ممثل', 'Actor', cat_id, 1),
    ('مقدم برامج', 'Presenter / Host', cat_id, 2),
    ('مؤدي صوتي', 'Voice Over Artist', cat_id, 3),
    ('عارض أزياء', 'Model', cat_id, 4);
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vendor_fields_parent_id ON vendor_fields(parent_id);
CREATE INDEX IF NOT EXISTS idx_vendor_fields_is_active ON vendor_fields(is_active);
CREATE INDEX IF NOT EXISTS idx_vendor_selected_fields_vendor_id ON vendor_selected_fields(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_selected_fields_field_id ON vendor_selected_fields(field_id);

-- Update vendors table to remove old primary_field column if needed
-- (We'll keep it for backward compatibility but use vendor_selected_fields going forward)
