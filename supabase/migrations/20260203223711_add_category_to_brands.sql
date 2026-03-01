/*
  # ربط العلامات التجارية بالتصنيفات

  ## التغييرات
  1. إضافة جدول `brand_categories` - جدول وسيط للربط بين العلامات والتصنيفات
    - `id` (uuid, primary key)
    - `brand_id` (uuid, foreign key)
    - `category_id` (uuid, foreign key)
    - `created_at` (timestamptz)
  
  ## الهدف
  - السماح بربط علامة تجارية واحدة مع تصنيفات متعددة
  - عرض العلامات التجارية المناسبة فقط عند اختيار تصنيف معين
  - إذا لم يتم ربط علامة بأي تصنيف، ستظهر لجميع التصنيفات

  ## الأمان
  - تفعيل RLS
  - سياسات للقراءة والتعديل
*/

-- إنشاء جدول الربط بين العلامات والتصنيفات
CREATE TABLE IF NOT EXISTS brand_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES equipment_brands(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES equipment_categories(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(brand_id, category_id)
);

-- تفعيل RLS
ALTER TABLE brand_categories ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة
CREATE POLICY "Authenticated users can view brand categories"
  ON brand_categories
  FOR SELECT
  TO authenticated
  USING (true);

-- سياسة الإضافة
CREATE POLICY "Authenticated users can insert brand categories"
  ON brand_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- سياسة الحذف
CREATE POLICY "Authenticated users can delete brand categories"
  ON brand_categories
  FOR DELETE
  TO authenticated
  USING (true);

-- إنشاء indexes لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_brand_categories_brand_id ON brand_categories(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_categories_category_id ON brand_categories(category_id);

-- ربط العلامات الموجودة بتصنيف "كاميرات" إذا كان موجوداً
DO $$
DECLARE
  camera_category_id uuid;
BEGIN
  -- البحث عن تصنيف الكاميرات
  SELECT id INTO camera_category_id 
  FROM equipment_categories 
  WHERE name LIKE '%كاميرا%' OR name_en ILIKE '%camera%'
  LIMIT 1;
  
  -- إذا وجدنا تصنيف الكاميرات، نربط جميع العلامات الحالية به
  IF camera_category_id IS NOT NULL THEN
    INSERT INTO brand_categories (brand_id, category_id)
    SELECT id, camera_category_id
    FROM equipment_brands
    WHERE is_active = true
    ON CONFLICT (brand_id, category_id) DO NOTHING;
  END IF;
END $$;
