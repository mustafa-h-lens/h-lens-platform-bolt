/*
  # إضافة حقول البيانات المستخرجة من المستندات

  ## التغييرات
  
  1. إضافة حقول بيانات الاستمارة إلى جدول `vendors`
    - `vehicle_registration_number` (text): رقم الاستمارة
    - `vehicle_brand` (text): ماركة المركبة
    - `vehicle_plate_number` (text): رقم اللوحة بالإنجليزي
    - `extracted_id_number` (text): رقم الهوية المستخرج من صورة الهوية
  
  2. الاستخدام
    - سيتم استخدام Edge Function لاستخراج البيانات من الصور باستخدام AI
    - البيانات المستخرجة تخزن في هذه الحقول
    - يمكن للمستخدم تعديل البيانات يدوياً إذا كانت غير دقيقة
  
  ## ملاحظات
  
  - جميع الحقول قابلة للقيمة الفارغة (nullable)
  - البيانات المستخرجة تكون تلقائية ويمكن تعديلها
  - تستخدم في التقارير والتصدير
*/

-- إضافة حقول بيانات الاستمارة والهوية المستخرجة
DO $$
BEGIN
  -- رقم الاستمارة
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendors' AND column_name = 'vehicle_registration_number'
  ) THEN
    ALTER TABLE vendors ADD COLUMN vehicle_registration_number text;
    COMMENT ON COLUMN vendors.vehicle_registration_number IS 'رقم الاستمارة المستخرج من صورة الاستمارة';
  END IF;

  -- ماركة المركبة
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendors' AND column_name = 'vehicle_brand'
  ) THEN
    ALTER TABLE vendors ADD COLUMN vehicle_brand text;
    COMMENT ON COLUMN vendors.vehicle_brand IS 'ماركة المركبة المستخرجة من صورة الاستمارة';
  END IF;

  -- رقم اللوحة بالإنجليزي
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendors' AND column_name = 'vehicle_plate_number'
  ) THEN
    ALTER TABLE vendors ADD COLUMN vehicle_plate_number text;
    COMMENT ON COLUMN vendors.vehicle_plate_number IS 'رقم اللوحة بالإنجليزي المستخرج من صورة الاستمارة';
  END IF;

  -- رقم الهوية المستخرج
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendors' AND column_name = 'extracted_id_number'
  ) THEN
    ALTER TABLE vendors ADD COLUMN extracted_id_number text;
    COMMENT ON COLUMN vendors.extracted_id_number IS 'رقم الهوية المستخرج من صورة الهوية';
  END IF;
END $$;
