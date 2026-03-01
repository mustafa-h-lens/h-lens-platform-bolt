/*
  # إضافة نوع المشروع (Project Mode)

  ## التغييرات
  
  1. إضافة نوع جديد `project_mode_type` بخيارين:
    - `STANDARD` - مشروع عادي يحتوي على بنود ومهام إنتاجية
    - `FRAMEWORK` - عقد إطاري يعتمد على أوامر الشراء فقط
  
  2. إضافة حقل `project_mode` إلى جدول `projects`
    - النوع: project_mode_type
    - القيمة الافتراضية: 'STANDARD'
    - إلزامي: نعم
  
  3. تحديث المشاريع الموجودة
    - تعيين جميع المشاريع الحالية كـ STANDARD
  
  ## القواعد
  
  - المشروع العادي (STANDARD):
    * يحتوي على بنود (Items)
    * يحتوي على مهام إنتاجية
    * غالباً يرتبط بأمر شراء واحد
    * الإيراد = مجموع البنود
  
  - العقد الإطاري (FRAMEWORK):
    * لا يحتوي على بنود
    * يعتمد على أوامر شراء متعددة
    * الصرف عبر المهام الإنتاجية فقط
    * الإيراد = مجموع تخصيصات PO
*/

-- إنشاء النوع الجديد
DO $$ BEGIN
  CREATE TYPE project_mode_type AS ENUM ('STANDARD', 'FRAMEWORK');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- إضافة الحقل إلى جدول projects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'project_mode'
  ) THEN
    ALTER TABLE projects ADD COLUMN project_mode project_mode_type DEFAULT 'STANDARD' NOT NULL;
  END IF;
END $$;

-- تحديث المشاريع الموجودة
UPDATE projects SET project_mode = 'STANDARD' WHERE project_mode IS NULL;

-- إضافة تعليق للحقل
COMMENT ON COLUMN projects.project_mode IS 'نوع المشروع: STANDARD (مشروع عادي) أو FRAMEWORK (عقد إطاري)';
