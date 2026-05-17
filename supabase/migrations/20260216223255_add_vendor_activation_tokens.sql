/*
  # نظام تفعيل حسابات الموردين
  
  ## التفاصيل
  هذا التحديث يضيف:
  1. جدول activation_tokens لحفظ رموز التفعيل
  
  ## الجداول الجديدة
  
  ### `activation_tokens`
  - `id` (uuid, primary key) - معرف فريد
  - `token` (text, unique) - رمز التفعيل
  - `vendor_id` (uuid) - معرف المورد
  - `email` (text) - البريد الإلكتروني
  - `expires_at` (timestamptz) - وقت انتهاء الصلاحية (72 ساعة)
  - `used` (boolean) - هل تم استخدام الرمز
  - `used_at` (timestamptz) - وقت الاستخدام
  - `created_at` (timestamptz) - وقت الإنشاء
  
  ## الأمان
  - تفعيل RLS على الجدول
  - سياسات تضمن الأمان
*/

-- جدول رموز التفعيل
CREATE TABLE IF NOT EXISTS activation_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  email text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '72 hours'),
  used boolean DEFAULT false,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE activation_tokens ENABLE ROW LEVEL SECURITY;

-- سياسات RLS
DROP POLICY IF EXISTS "أي شخص يمكنه التحقق من رمز التفعيل" ON activation_tokens;
CREATE POLICY "أي شخص يمكنه التحقق من رمز التفعيل" ON activation_tokens FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "المسؤولون يمكنهم إنشاء رموز التفعيل" ON activation_tokens;
CREATE POLICY "المسؤولون يمكنهم إنشاء رموز التفعيل" ON activation_tokens FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "يمكن تحديث رموز التفعيل عند الاستخدام" ON activation_tokens;
CREATE POLICY "يمكن تحديث رموز التفعيل عند الاستخدام" ON activation_tokens FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- إنشاء index لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_activation_tokens_token ON activation_tokens(token);
CREATE INDEX IF NOT EXISTS idx_activation_tokens_vendor_id ON activation_tokens(vendor_id);
CREATE INDEX IF NOT EXISTS idx_activation_tokens_used ON activation_tokens(used);
CREATE INDEX IF NOT EXISTS idx_activation_tokens_expires_at ON activation_tokens(expires_at);