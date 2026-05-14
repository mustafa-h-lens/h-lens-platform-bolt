/*
  # إضافة نظام كتالوج المعدات
  
  ## الجداول الجديدة
  
  ### 1. equipment_categories
  - `id` (uuid, primary key)
  - `name` (text) - اسم التصنيف بالعربية
  - `name_en` (text) - اسم التصنيف بالإنجليزية
  - `is_active` (boolean) - حالة التفعيل
  - `display_order` (int) - ترتيب العرض
  - `created_at` (timestamptz) - تاريخ الإنشاء
  - `updated_at` (timestamptz) - تاريخ التحديث
  
  ### 2. equipment_catalog
  - `id` (uuid, primary key)
  - `name` (text) - الاسم بالعربية
  - `name_en` (text) - الاسم بالإنجليزية (اختياري)
  - `category_id` (uuid) - معرف التصنيف
  - `image_url` (text) - رابط صورة المعدة (اختياري)
  - `description` (text) - وصف مختصر (اختياري)
  - `is_active` (boolean) - حالة التفعيل
  - `created_at` (timestamptz) - تاريخ الإنشاء
  - `updated_at` (timestamptz) - تاريخ التحديث
  
  ### 3. تحديث vendor_equipment
  - إضافة `catalog_item_id` (uuid) - معرف المعدة من الكتالوج
  - إضافة `serial_number` (text) - الرقم التسلسلي
  - إضافة `condition` (text) - الحالة
  - إضافة `notes` (text) - ملاحظات
  
  ## الأمان
  - تفعيل RLS على جميع الجداول
  - سياسات للقراءة للمستخدمين المصادق عليهم
  - سياسات للتعديل للمسؤولين فقط
  
  ## البيانات الافتراضية
  - إضافة التصنيفات الأساسية
*/

-- إنشاء جدول تصنيفات المعدات
CREATE TABLE IF NOT EXISTS equipment_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_en text NOT NULL,
  is_active boolean DEFAULT true,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- إنشاء جدول كتالوج المعدات
CREATE TABLE IF NOT EXISTS equipment_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_en text,
  category_id uuid REFERENCES equipment_categories(id) ON DELETE SET NULL,
  image_url text,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- تحديث جدول معدات الموردين
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_equipment' AND column_name = 'catalog_item_id'
  ) THEN
    ALTER TABLE vendor_equipment ADD COLUMN catalog_item_id uuid REFERENCES equipment_catalog(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_equipment' AND column_name = 'serial_number'
  ) THEN
    ALTER TABLE vendor_equipment ADD COLUMN serial_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_equipment' AND column_name = 'condition'
  ) THEN
    ALTER TABLE vendor_equipment ADD COLUMN condition text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_equipment' AND column_name = 'notes'
  ) THEN
    ALTER TABLE vendor_equipment ADD COLUMN notes text;
  END IF;
END $$;

-- تفعيل RLS
ALTER TABLE equipment_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_catalog ENABLE ROW LEVEL SECURITY;

-- سياسات القراءة للجميع المصادق عليهم
DROP POLICY IF EXISTS "Authenticated users can view equipment categories" ON equipment_categories;
CREATE POLICY "Authenticated users can view equipment categories" ON equipment_categories
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view equipment catalog" ON equipment_catalog;
CREATE POLICY "Authenticated users can view equipment catalog" ON equipment_catalog
  FOR SELECT
  TO authenticated
  USING (true);

-- سياسات الإدراج للمسؤولين
DROP POLICY IF EXISTS "Admins can insert equipment categories" ON equipment_categories;
CREATE POLICY "Admins can insert equipment categories" ON equipment_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert equipment catalog" ON equipment_catalog;
CREATE POLICY "Admins can insert equipment catalog" ON equipment_catalog
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- سياسات التحديث للمسؤولين
DROP POLICY IF EXISTS "Admins can update equipment categories" ON equipment_categories;
CREATE POLICY "Admins can update equipment categories" ON equipment_categories
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update equipment catalog" ON equipment_catalog;
CREATE POLICY "Admins can update equipment catalog" ON equipment_catalog
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- سياسات الحذف للمسؤولين
DROP POLICY IF EXISTS "Admins can delete equipment categories" ON equipment_categories;
CREATE POLICY "Admins can delete equipment categories" ON equipment_categories
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete equipment catalog" ON equipment_catalog;
CREATE POLICY "Admins can delete equipment catalog" ON equipment_catalog
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- إدراج التصنيفات الافتراضية
INSERT INTO equipment_categories (name, name_en, display_order) VALUES
  ('كاميرا', 'Camera', 1),
  ('عدسة', 'Lens', 2),
  ('إضاءة', 'Lighting', 3),
  ('صوت', 'Audio', 4),
  ('موبايل', 'Mobile', 5),
  ('درون', 'Drone', 6),
  ('اكسسوارات', 'Accessories', 7)
ON CONFLICT DO NOTHING;

-- إنشاء indexes للأداء
CREATE INDEX IF NOT EXISTS idx_equipment_catalog_category ON equipment_catalog(category_id);
CREATE INDEX IF NOT EXISTS idx_equipment_catalog_active ON equipment_catalog(is_active);
CREATE INDEX IF NOT EXISTS idx_vendor_equipment_catalog ON vendor_equipment(catalog_item_id);
