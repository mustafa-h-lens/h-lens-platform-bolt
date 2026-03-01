/*
  # إضافة معلومات البنك إلى جدول الموردين
  
  ## التفاصيل
  هذا التحديث يضيف حقول المعلومات البنكية إلى جدول الموردين:
  - `bank_id` (uuid) - معرف البنك من جدول banks
  - `iban` (text) - رقم الآيبان
  - `account_name` (text) - اسم صاحب الحساب
  
  ## التعديلات
  1. إضافة الحقول البنكية إلى جدول vendors
  2. إضافة foreign key constraint لربط bank_id بجدول banks
*/

-- إضافة حقول البنك إلى جدول vendors
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendors' AND column_name = 'bank_id'
  ) THEN
    ALTER TABLE vendors ADD COLUMN bank_id uuid REFERENCES banks(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendors' AND column_name = 'iban'
  ) THEN
    ALTER TABLE vendors ADD COLUMN iban text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendors' AND column_name = 'account_name'
  ) THEN
    ALTER TABLE vendors ADD COLUMN account_name text;
  END IF;
END $$;