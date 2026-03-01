/*
  # تحديث جدول البيانات المالية للموردين
  
  ## التفاصيل
  تحديث جدول vendor_financial_data ليستخدم:
  - `bank_id` (uuid) - معرف البنك من جدول banks بدلاً من bank_name
  - `account_name` (text) - اسم صاحب الحساب بدلاً من beneficiary_name
  
  ## التعديلات
  1. إضافة حقل bank_id مع foreign key constraint
  2. إضافة حقل account_name
  3. الحقول القديمة (bank_name و beneficiary_name) ستبقى للتوافق مع البيانات القديمة
*/

-- إضافة حقل bank_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_financial_data' AND column_name = 'bank_id'
  ) THEN
    ALTER TABLE vendor_financial_data ADD COLUMN bank_id uuid REFERENCES banks(id);
  END IF;
END $$;

-- إضافة حقل account_name
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_financial_data' AND column_name = 'account_name'
  ) THEN
    ALTER TABLE vendor_financial_data ADD COLUMN account_name text;
  END IF;
END $$;