/*
  # إضافة جدول الإعدادات والبنوك
  
  ## التفاصيل
  هذا التحديث يضيف:
  1. جدول `settings_config` لحفظ إعدادات النظام مثل الشروط والأحكام
  2. جدول `banks` لإدارة البنوك المتاحة في النظام
  
  ## الجداول الجديدة
  
  ### `settings_config`
  - `id` (uuid, primary key) - معرف فريد
  - `key` (text, unique) - مفتاح الإعداد (مثل 'terms_and_conditions')
  - `value` (text) - قيمة الإعداد
  - `description` (text) - وصف الإعداد
  - `updated_at` (timestamptz) - وقت آخر تحديث
  - `updated_by` (uuid) - المستخدم الذي قام بالتحديث
  
  ### `banks`
  - `id` (uuid, primary key) - معرف فريد
  - `name_ar` (text) - اسم البنك بالعربية
  - `name_en` (text) - اسم البنك بالإنجليزية
  - `is_active` (boolean) - حالة النشاط
  - `created_at` (timestamptz) - وقت الإنشاء
  
  ## الأمان
  - تفعيل RLS على جميع الجداول
  - سياسات للقراءة والكتابة للمستخدمين المصادق عليهم
*/

-- إنشاء جدول الإعدادات
CREATE TABLE IF NOT EXISTS settings_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text DEFAULT '',
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- إنشاء جدول البنوك
CREATE TABLE IF NOT EXISTS banks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_en text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE settings_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;

-- سياسات RLS لـ settings_config
DROP POLICY IF EXISTS "المستخدمون المصادق عليهم يمكنهم قراءة الإعدادات" ON settings_config;
CREATE POLICY "المستخدمون المصادق عليهم يمكنهم قراءة الإعدادات" ON settings_config FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "المستخدمون المصادق عليهم يمكنهم تحديث الإعدادات" ON settings_config;
CREATE POLICY "المستخدمون المصادق عليهم يمكنهم تحديث الإعدادات" ON settings_config FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "المستخدمون المصادق عليهم يمكنهم إدراج الإعدادات" ON settings_config;
CREATE POLICY "المستخدمون المصادق عليهم يمكنهم إدراج الإعدادات" ON settings_config FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- سياسات RLS لـ banks
DROP POLICY IF EXISTS "المستخدمون المصادق عليهم يمكنهم قراءة البنوك" ON banks;
CREATE POLICY "المستخدمون المصادق عليهم يمكنهم قراءة البنوك" ON banks FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "المستخدمون المصادق عليهم يمكنهم إدراج البنوك" ON banks;
CREATE POLICY "المستخدمون المصادق عليهم يمكنهم إدراج البنوك" ON banks FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "المستخدمون المصادق عليهم يمكنهم تحديث البنوك" ON banks;
CREATE POLICY "المستخدمون المصادق عليهم يمكنهم تحديث البنوك" ON banks FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "المستخدمون المصادق عليهم يمكنهم حذف البنوك" ON banks;
CREATE POLICY "المستخدمون المصادق عليهم يمكنهم حذف البنوك" ON banks FOR DELETE
  TO authenticated
  USING (true);

-- إدراج قيمة افتراضية للشروط والأحكام
INSERT INTO settings_config (key, value, description) VALUES
('terms_and_conditions', 'الشروط والأحكام الافتراضية للمنصة', 'نص الشروط والأحكام')
ON CONFLICT (key) DO NOTHING;

-- إدراج بنوك افتراضية
INSERT INTO banks (name_ar, name_en, is_active) VALUES
('البنك الأهلي السعودي', 'Al Ahli Bank', true),
('بنك الرياض', 'Riyad Bank', true),
('بنك الراجحي', 'Al Rajhi Bank', true),
('البنك السعودي الفرنسي', 'Banque Saudi Fransi', true),
('البنك السعودي البريطاني (ساب)', 'SABB', true),
('البنك العربي الوطني', 'Arab National Bank', true)
ON CONFLICT DO NOTHING;