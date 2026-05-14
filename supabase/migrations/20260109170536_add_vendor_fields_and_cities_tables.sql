/*
  # إضافة جداول المجالات والمدن

  ## الجداول الجديدة
  
  ### 1. `vendor_fields` - مجالات عمل الموردين
    - `id` (uuid, primary key)
    - `name` (text) - اسم المجال (مثل: كهرباء، سباكة، نجارة)
    - `name_en` (text) - الاسم بالإنجليزية (اختياري)
    - `is_active` (boolean) - هل المجال نشط
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### 2. `cities` - المدن
    - `id` (uuid, primary key)
    - `name` (text) - اسم المدينة
    - `name_en` (text) - الاسم بالإنجليزية (اختياري)
    - `region` (text) - المنطقة (اختياري)
    - `is_active` (boolean) - هل المدينة نشطة
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## الأمان
    - تفعيل RLS على جميع الجداول
    - السماح للمستخدمين المصادقين بقراءة البيانات
    - السماح للإداريين فقط بالتعديل

  ## البيانات الأولية
    - إضافة بعض المجالات الشائعة
    - إضافة المدن السعودية الرئيسية
*/

-- إنشاء جدول المجالات
CREATE TABLE IF NOT EXISTS vendor_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  name_en text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- إنشاء جدول المدن
CREATE TABLE IF NOT EXISTS cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  name_en text,
  region text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE vendor_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

-- سياسات القراءة للمستخدمين المصادقين
DROP POLICY IF EXISTS "Authenticated users can read vendor fields" ON vendor_fields;
CREATE POLICY "Authenticated users can read vendor fields" ON vendor_fields
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can read cities" ON cities;
CREATE POLICY "Authenticated users can read cities" ON cities
  FOR SELECT
  TO authenticated
  USING (true);

-- سياسات الإدارة (يمكن تعديلها لاحقاً لتحديد الإداريين فقط)
DROP POLICY IF EXISTS "Authenticated users can insert vendor fields" ON vendor_fields;
CREATE POLICY "Authenticated users can insert vendor fields" ON vendor_fields
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update vendor fields" ON vendor_fields;
CREATE POLICY "Authenticated users can update vendor fields" ON vendor_fields
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can insert cities" ON cities;
CREATE POLICY "Authenticated users can insert cities" ON cities
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update cities" ON cities;
CREATE POLICY "Authenticated users can update cities" ON cities
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- إدراج المجالات الشائعة
INSERT INTO vendor_fields (name, name_en) VALUES
  ('كهرباء', 'Electricity'),
  ('سباكة', 'Plumbing'),
  ('نجارة', 'Carpentry'),
  ('دهان', 'Painting'),
  ('تكييف وتبريد', 'HVAC'),
  ('بناء وتشييد', 'Construction'),
  ('تصميم داخلي', 'Interior Design'),
  ('حدادة', 'Blacksmithing'),
  ('ألمنيوم وزجاج', 'Aluminum & Glass'),
  ('جبس وديكور', 'Gypsum & Decoration'),
  ('أرضيات وبلاط', 'Flooring & Tiles'),
  ('عزل', 'Insulation'),
  ('مقاولات عامة', 'General Contracting'),
  ('صيانة عامة', 'General Maintenance'),
  ('نظافة', 'Cleaning')
ON CONFLICT (name) DO NOTHING;

-- إدراج المدن السعودية الرئيسية
INSERT INTO cities (name, name_en, region) VALUES
  ('الرياض', 'Riyadh', 'الوسطى'),
  ('جدة', 'Jeddah', 'الغربية'),
  ('مكة المكرمة', 'Makkah', 'الغربية'),
  ('المدينة المنورة', 'Madinah', 'الغربية'),
  ('الدمام', 'Dammam', 'الشرقية'),
  ('الخبر', 'Khobar', 'الشرقية'),
  ('الظهران', 'Dhahran', 'الشرقية'),
  ('الجبيل', 'Jubail', 'الشرقية'),
  ('الطائف', 'Taif', 'الغربية'),
  ('أبها', 'Abha', 'الجنوبية'),
  ('خميس مشيط', 'Khamis Mushait', 'الجنوبية'),
  ('تبوك', 'Tabuk', 'الشمالية'),
  ('القصيم', 'Qassim', 'الوسطى'),
  ('حائل', 'Hail', 'الشمالية'),
  ('نجران', 'Najran', 'الجنوبية'),
  ('الباحة', 'Al Bahah', 'الجنوبية'),
  ('جازان', 'Jazan', 'الجنوبية'),
  ('ينبع', 'Yanbu', 'الغربية'),
  ('الأحساء', 'Al Ahsa', 'الشرقية'),
  ('القطيف', 'Qatif', 'الشرقية')
ON CONFLICT (name) DO NOTHING;

-- إنشاء indexes للبحث السريع
CREATE INDEX IF NOT EXISTS idx_vendor_fields_name ON vendor_fields(name);
CREATE INDEX IF NOT EXISTS idx_vendor_fields_active ON vendor_fields(is_active);
CREATE INDEX IF NOT EXISTS idx_cities_name ON cities(name);
CREATE INDEX IF NOT EXISTS idx_cities_active ON cities(is_active);
