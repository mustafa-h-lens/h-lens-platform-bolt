/*
  # إضافة نظام الشروط والأحكام وسياسة الخصوصية
  
  1. جدول جديد
    - `terms_and_privacy_settings`
      - `id` (uuid, primary key)
      - `type` (text) - 'terms' أو 'privacy'
      - `title_ar` (text) - العنوان بالعربي
      - `content_ar` (text) - المحتوى بالعربي
      - `version` (text) - رقم الإصدار
      - `is_active` (boolean) - هل نشط
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `updated_by` (uuid) - معرف المستخدم الذي قام بالتحديث
      
  2. أمان
    - تفعيل RLS
    - سياسة للقراءة العامة
    - سياسة للإضافة والتعديل للمسؤولين فقط
*/

-- إنشاء الجدول
CREATE TABLE IF NOT EXISTS terms_and_privacy_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('terms', 'privacy')),
  title_ar text NOT NULL,
  content_ar text NOT NULL,
  version text DEFAULT '1.0',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- تفعيل RLS
ALTER TABLE terms_and_privacy_settings ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة للجميع (النسخة النشطة فقط)
DROP POLICY IF EXISTS "Anyone can read active terms and privacy" ON terms_and_privacy_settings;
CREATE POLICY "Anyone can read active terms and privacy" ON terms_and_privacy_settings
  FOR SELECT
  USING (is_active = true);

-- سياسة القراءة الكاملة للمسؤولين
DROP POLICY IF EXISTS "Admins can read all terms and privacy" ON terms_and_privacy_settings;
CREATE POLICY "Admins can read all terms and privacy" ON terms_and_privacy_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  );

-- سياسة الإضافة للمسؤولين
DROP POLICY IF EXISTS "Admins can insert terms and privacy" ON terms_and_privacy_settings;
CREATE POLICY "Admins can insert terms and privacy" ON terms_and_privacy_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  );

-- سياسة التعديل للمسؤولين
DROP POLICY IF EXISTS "Admins can update terms and privacy" ON terms_and_privacy_settings;
CREATE POLICY "Admins can update terms and privacy" ON terms_and_privacy_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  );

-- إضافة index للبحث السريع
CREATE INDEX IF NOT EXISTS idx_terms_privacy_type_active 
  ON terms_and_privacy_settings(type, is_active);

-- إدراج بيانات افتراضية للشروط والأحكام
INSERT INTO terms_and_privacy_settings (type, title_ar, content_ar, version, is_active)
VALUES (
  'terms',
  'الشروط والأحكام',
  '# الشروط والأحكام

## 1. القبول بالشروط
بتسجيلك في منصة Half Lens، فإنك توافق على الالتزام بهذه الشروط والأحكام.

## 2. الخدمات المقدمة
نوفر منصة لربط مقدمي الخدمات الإنتاجية بالعملاء.

## 3. التزامات المستخدم
- تقديم معلومات صحيحة ودقيقة
- الالتزام بالمعايير المهنية
- احترام حقوق الملكية الفكرية

## 4. المدفوعات والرسوم
سيتم توضيح جميع الرسوم قبل إتمام أي معاملة.

## 5. إنهاء الخدمة
يحق للمنصة إنهاء حسابك في حال مخالفة الشروط.

للمزيد من التفاصيل، يرجى التواصل معنا.',
  '1.0',
  true
) ON CONFLICT DO NOTHING;

-- إدراج بيانات افتراضية لسياسة الخصوصية
INSERT INTO terms_and_privacy_settings (type, title_ar, content_ar, version, is_active)
VALUES (
  'privacy',
  'سياسة الخصوصية',
  '# سياسة الخصوصية

## 1. جمع المعلومات
نجمع المعلومات التي تقدمها عند التسجيل في المنصة.

## 2. استخدام المعلومات
نستخدم معلوماتك لـ:
- تقديم وتحسين خدماتنا
- التواصل معك
- معالجة المعاملات

## 3. حماية المعلومات
نستخدم تدابير أمنية لحماية بياناتك الشخصية.

## 4. مشاركة المعلومات
لا نشارك معلوماتك مع أطراف ثالثة إلا بموافقتك أو عند الضرورة القانونية.

## 5. حقوقك
يحق لك الوصول إلى بياناتك وتعديلها أو حذفها.

## 6. ملفات تعريف الارتباط (Cookies)
نستخدم ملفات تعريف الارتباط لتحسين تجربتك.

للاستفسارات، تواصل معنا عبر البريد الإلكتروني.',
  '1.0',
  true
) ON CONFLICT DO NOTHING;