/*
  # إعداد Storage للصور
  
  ## التغييرات
  
  1. إنشاء bucket للصور (vendor-images)
  2. إعداد سياسات الأمان للـ bucket
     - السماح للمستخدمين المصادقين برفع الصور
     - السماح للجميع بقراءة الصور
     - السماح للمستخدمين المصادقين بحذف صورهم
  
  ## الملاحظات
  - الصور يتم حفظها في مجلد vendor-images
  - الحد الأقصى لحجم الصورة: 5MB
  - الصيغ المدعومة: JPG, PNG, WebP
*/

-- إنشاء bucket للصور
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vendor-images',
  'vendor-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- سياسة القراءة للجميع
CREATE POLICY "Anyone can read vendor images"
ON storage.objects FOR SELECT
USING (bucket_id = 'vendor-images');

-- سياسة الرفع للمستخدمين المصادقين
CREATE POLICY "Authenticated users can upload vendor images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vendor-images');

-- سياسة التحديث للمستخدمين المصادقين
CREATE POLICY "Authenticated users can update vendor images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'vendor-images')
WITH CHECK (bucket_id = 'vendor-images');

-- سياسة الحذف للمستخدمين المصادقين
CREATE POLICY "Authenticated users can delete vendor images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'vendor-images');