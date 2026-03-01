/*
  # إضافة العلامة التجارية لكتالوج المعدات

  ## التغييرات
  1. إضافة أعمدة جديدة لجدول equipment_catalog
    - `brand` (text) - العلامة التجارية بالعربية (اختياري)
    - `brand_en` (text) - العلامة التجارية بالإنجليزية (اختياري)
  
  ## الهدف
  - السماح بتنظيم المعدات حسب العلامة التجارية
  - عرض العلامة التجارية أولاً ثم الاسم
*/

-- إضافة حقل العلامة التجارية بالعربية
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment_catalog' AND column_name = 'brand'
  ) THEN
    ALTER TABLE equipment_catalog ADD COLUMN brand text;
  END IF;
END $$;

-- إضافة حقل العلامة التجارية بالإنجليزية
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment_catalog' AND column_name = 'brand_en'
  ) THEN
    ALTER TABLE equipment_catalog ADD COLUMN brand_en text;
  END IF;
END $$;

-- إنشاء index لتحسين البحث حسب العلامة التجارية
CREATE INDEX IF NOT EXISTS idx_equipment_catalog_brand ON equipment_catalog(brand);
