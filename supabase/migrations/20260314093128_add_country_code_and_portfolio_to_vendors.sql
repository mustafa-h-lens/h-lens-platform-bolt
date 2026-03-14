/*
  # إضافة حقول country_code و portfolio_url لجدول vendors

  1. تعديلات
    - إضافة عمود `country_code` (text) لتخزين رمز الدولة بشكل منفصل
    - إضافة عمود `portfolio_url` (text) لرابط أعمال المورد
  
  2. ملاحظات
    - كلا الحقلين اختياريان
    - country_code سيكون القيمة الافتراضية '+966' للسعودية
*/

DO $$
BEGIN
  -- إضافة عمود country_code إذا لم يكن موجوداً
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendors' AND column_name = 'country_code'
  ) THEN
    ALTER TABLE vendors ADD COLUMN country_code text DEFAULT '+966';
  END IF;

  -- إضافة عمود portfolio_url إذا لم يكن موجوداً
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendors' AND column_name = 'portfolio_url'
  ) THEN
    ALTER TABLE vendors ADD COLUMN portfolio_url text;
  END IF;
END $$;