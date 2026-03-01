/*
  # إضافة صورة استمارة السيارة للموردين

  ## التغييرات
  
  1. إضافة حقل `vehicle_registration_image` إلى جدول `vendors`
    - النوع: text (URL للصورة المخزنة في Supabase Storage)
    - قابل للقيمة الفارغة: نعم
    - الوصف: رابط صورة استمارة السيارة للمورد
  
  ## الاستخدام
  
  - يستخدم هذا الحقل لتخزين صورة استمارة/رخصة السيارة للمورد
  - يتم رفع الصورة إلى Supabase Storage ثم حفظ الرابط في هذا الحقل
  - يظهر في صفحة تفاصيل المورد تحت قسم المستندات
*/

-- إضافة حقل صورة استمارة السيارة
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendors' AND column_name = 'vehicle_registration_image'
  ) THEN
    ALTER TABLE vendors ADD COLUMN vehicle_registration_image text;
  END IF;
END $$;

-- إضافة تعليق للحقل
COMMENT ON COLUMN vendors.vehicle_registration_image IS 'رابط صورة استمارة السيارة للمورد';
