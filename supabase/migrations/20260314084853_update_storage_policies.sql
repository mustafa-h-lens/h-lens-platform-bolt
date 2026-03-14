/*
  # تحديث سياسات التخزين لدعم بوابة الموردين

  ## التغييرات
  1. إضافة PDF إلى أنواع الملفات المسموحة
  2. السماح للمستخدمين غير المصادق عليهم (anon) بالرفع
     - بوابة الموردين تستخدم نظام مصادقة مخصص (OTP)
     - الموردين ليسوا مستخدمي Supabase Auth العاديين
  3. السماح للحذف والتحديث للمستخدمين غير المصادق عليهم

  ## الجداول المتأثرة
  - storage.buckets (vendor-images)
  - storage.objects (policies)
*/

-- تحديث أنواع الملفات المسموحة لتشمل PDF
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
WHERE id = 'vendor-images';

-- السماح للجميع (authenticated + anon) برفع الصور
DROP POLICY IF EXISTS "Authenticated users can upload vendor images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload vendor images" ON storage.objects;
CREATE POLICY "Anyone can upload vendor images"
  ON storage.objects 
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (bucket_id = 'vendor-images');

-- السماح للجميع بتحديث الصور
DROP POLICY IF EXISTS "Authenticated users can update vendor images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update vendor images" ON storage.objects;
CREATE POLICY "Anyone can update vendor images"
  ON storage.objects 
  FOR UPDATE
  TO authenticated, anon
  USING (bucket_id = 'vendor-images')
  WITH CHECK (bucket_id = 'vendor-images');

-- السماح للجميع بحذف الصور
DROP POLICY IF EXISTS "Authenticated users can delete vendor images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete vendor images" ON storage.objects;
CREATE POLICY "Anyone can delete vendor images"
  ON storage.objects 
  FOR DELETE
  TO authenticated, anon
  USING (bucket_id = 'vendor-images');

-- السماح للجميع بقراءة الصور (للعرض)
DROP POLICY IF EXISTS "Anyone can view vendor images" ON storage.objects;
CREATE POLICY "Anyone can view vendor images"
  ON storage.objects 
  FOR SELECT
  TO authenticated, anon
  USING (bucket_id = 'vendor-images');
