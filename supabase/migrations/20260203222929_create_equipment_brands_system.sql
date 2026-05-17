/*
  # إنشاء نظام العلامات التجارية للمعدات

  ## الجداول الجديدة
  1. `equipment_brands` - جدول العلامات التجارية
    - `id` (uuid, primary key)
    - `name` (text) - اسم العلامة بالعربية
    - `name_en` (text) - اسم العلامة بالإنجليزية
    - `is_active` (boolean) - حالة التفعيل
    - `display_order` (integer) - ترتيب العرض
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## التعديلات على الجداول الموجودة
  1. تحديث `equipment_catalog`:
    - إضافة `brand_id` (uuid, foreign key)
    - حذف `brand` و `brand_en` (سيتم استخدام brand_id بدلاً منهما)

  ## الأمان
  - تفعيل RLS على جدول equipment_brands
  - سياسات للقراءة والتعديل
*/

-- إنشاء جدول العلامات التجارية
CREATE TABLE IF NOT EXISTS equipment_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_en text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE equipment_brands ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة للمستخدمين المصادقين
DROP POLICY IF EXISTS "Authenticated users can view brands" ON equipment_brands;
CREATE POLICY "Authenticated users can view brands" ON equipment_brands
  FOR SELECT
  TO authenticated
  USING (true);

-- سياسة الإضافة للمستخدمين المصادقين
DROP POLICY IF EXISTS "Authenticated users can insert brands" ON equipment_brands;
CREATE POLICY "Authenticated users can insert brands" ON equipment_brands
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- سياسة التحديث للمستخدمين المصادقين
DROP POLICY IF EXISTS "Authenticated users can update brands" ON equipment_brands;
CREATE POLICY "Authenticated users can update brands" ON equipment_brands
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- سياسة الحذف للمستخدمين المصادقين
DROP POLICY IF EXISTS "Authenticated users can delete brands" ON equipment_brands;
CREATE POLICY "Authenticated users can delete brands" ON equipment_brands
  FOR DELETE
  TO authenticated
  USING (true);

-- إضافة brand_id إلى equipment_catalog
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment_catalog' AND column_name = 'brand_id'
  ) THEN
    ALTER TABLE equipment_catalog ADD COLUMN brand_id uuid REFERENCES equipment_brands(id);
  END IF;
END $$;

-- إنشاء index لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_equipment_catalog_brand_id ON equipment_catalog(brand_id);

-- إزالة الأعمدة القديمة brand و brand_en
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment_catalog' AND column_name = 'brand'
  ) THEN
    ALTER TABLE equipment_catalog DROP COLUMN brand;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment_catalog' AND column_name = 'brand_en'
  ) THEN
    ALTER TABLE equipment_catalog DROP COLUMN brand_en;
  END IF;
END $$;

-- إضافة بعض العلامات التجارية الشائعة كأمثلة
INSERT INTO equipment_brands (name, name_en, display_order) VALUES
  ('سوني', 'Sony', 1),
  ('كانون', 'Canon', 2),
  ('نيكون', 'Nikon', 3),
  ('باناسونيك', 'Panasonic', 4),
  ('فوجي فيلم', 'Fujifilm', 5),
  ('بلاك ماجيك', 'Blackmagic', 6)
ON CONFLICT DO NOTHING;
