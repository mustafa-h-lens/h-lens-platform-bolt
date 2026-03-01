/*
  # إنشاء bucket لملفات المشاريع

  ## التغييرات

  1. إنشاء bucket جديد (project-files) يدعم جميع أنواع الملفات الشائعة
  2. إعداد سياسات الأمان
     - السماح للمستخدمين المصادقين برفع وحذف الملفات
     - السماح للجميع بقراءة الملفات

  ## الملاحظات
  - الحد الأقصى لحجم الملف: 50MB
  - الصيغ المدعومة: صور، PDF، مستندات Word، Excel، أرشيفات
*/

-- إنشاء bucket لملفات المشاريع
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-files',
  'project-files',
  true,
  52428800,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'application/x-rar-compressed',
    'application/vnd.rar',
    'text/plain',
    'text/csv'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- سياسة القراءة للجميع
CREATE POLICY "Anyone can read project files"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-files');

-- سياسة الرفع للمستخدمين المصادقين
CREATE POLICY "Authenticated users can upload project files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'project-files');

-- سياسة التحديث للمستخدمين المصادقين
CREATE POLICY "Authenticated users can update project files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'project-files')
WITH CHECK (bucket_id = 'project-files');

-- سياسة الحذف للمستخدمين المصادقين
CREATE POLICY "Authenticated users can delete project files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'project-files');
