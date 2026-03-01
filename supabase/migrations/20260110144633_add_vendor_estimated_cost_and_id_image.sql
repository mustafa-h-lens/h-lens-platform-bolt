/*
  # إضافة التكلفة التقديرية وصورة الهوية للموردين
  
  1. التغييرات
    - إضافة حقل `estimated_cost` (numeric) - التكلفة التقديرية (اختياري، معلومة داخلية)
    - إضافة حقل `id_image` (text) - رابط صورة الهوية الشخصية (اختياري)
  
  2. ملاحظات
    - التكلفة التقديرية هي معلومة داخلية لن تظهر للعملاء أو الموردين
    - صورة الهوية ستُخزن في Supabase Storage
*/

-- إضافة حقل التكلفة التقديرية
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendors' AND column_name = 'estimated_cost'
  ) THEN
    ALTER TABLE vendors ADD COLUMN estimated_cost numeric(10,2);
  END IF;
END $$;

-- إضافة حقل صورة الهوية
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendors' AND column_name = 'id_image'
  ) THEN
    ALTER TABLE vendors ADD COLUMN id_image text;
  END IF;
END $$;

-- إضافة تعليقات على الحقول الجديدة
COMMENT ON COLUMN vendors.estimated_cost IS 'التكلفة التقديرية للمورد - معلومة داخلية';
COMMENT ON COLUMN vendors.id_image IS 'رابط صورة الهوية الشخصية';
