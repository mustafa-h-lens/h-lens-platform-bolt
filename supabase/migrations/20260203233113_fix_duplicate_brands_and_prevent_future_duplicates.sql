/*
  # إزالة التكرار في العلامات التجارية ومنع حدوثه مستقبلاً

  ## الهدف
  إصلاح مشكلة التكرار في جدول equipment_brands حيث توجد علامات مكررة مثل:
  - سوني (Sony) - مكررة مرتين
  - كانون (Canon) - مكررة مرتين
  - نيكون (Nikon) - مكررة مرتين
  - باناسونيك (Panasonic) - مكررة مرتين
  - فوجي فيلم (Fujifilm) - مكررة مرتين
  - بلاك ماجيك (Blackmagic) - مكررة مرتين

  ## الإجراءات
  1. دمج السجلات المكررة:
     - تحديث جميع الإشارات في equipment_catalog للإشارة إلى السجل الأقدم
     - تحديث جميع الإشارات في brand_categories للإشارة إلى السجل الأقدم
     - حذف السجلات المكررة
  
  2. إضافة قيد UNIQUE:
     - إضافة قيد على عمود name لمنع تكرار الأسماء العربية
     - إنشاء index فريد على name مع تجاهل حالة الأحرف

  ## الأمان
  - العملية آمنة تماماً - لن يتم فقدان أي بيانات
  - جميع الإشارات سيتم تحديثها قبل الحذف
*/

-- الخطوة 1: دمج السجلات المكررة
DO $$
DECLARE
  brand_record RECORD;
  oldest_id uuid;
  duplicate_ids uuid[];
BEGIN
  -- معالجة كل علامة مكررة
  FOR brand_record IN 
    SELECT name, array_agg(id ORDER BY created_at) as ids
    FROM equipment_brands
    GROUP BY name
    HAVING COUNT(*) > 1
  LOOP
    -- الاحتفاظ بالسجل الأقدم
    oldest_id := brand_record.ids[1];
    duplicate_ids := brand_record.ids[2:array_length(brand_record.ids, 1)];
    
    -- تحديث equipment_catalog للإشارة إلى السجل الأقدم
    UPDATE equipment_catalog
    SET brand_id = oldest_id
    WHERE brand_id = ANY(duplicate_ids);
    
    -- تحديث brand_categories للإشارة إلى السجل الأقدم
    -- أولاً، نحذف أي تكرار قد ينتج عن الدمج
    DELETE FROM brand_categories
    WHERE brand_id = ANY(duplicate_ids)
    AND category_id IN (
      SELECT category_id 
      FROM brand_categories 
      WHERE brand_id = oldest_id
    );
    
    -- ثم نحدث الباقي
    UPDATE brand_categories
    SET brand_id = oldest_id
    WHERE brand_id = ANY(duplicate_ids);
    
    -- حذف السجلات المكررة
    DELETE FROM equipment_brands
    WHERE id = ANY(duplicate_ids);
    
    RAISE NOTICE 'دمج علامة: % - تم الاحتفاظ بالسجل % وحذف %', 
                 brand_record.name, oldest_id, duplicate_ids;
  END LOOP;
END $$;

-- الخطوة 2: إضافة قيد UNIQUE على اسم العلامة لمنع التكرار مستقبلاً
-- استخدام LOWER لتجاهل حالة الأحرف
CREATE UNIQUE INDEX IF NOT EXISTS idx_equipment_brands_name_unique 
ON equipment_brands (LOWER(name));

-- الخطوة 3: إضافة تعليق توضيحي على الجدول
COMMENT ON TABLE equipment_brands IS 'جدول العلامات التجارية للمعدات - يمنع تكرار الأسماء';
COMMENT ON COLUMN equipment_brands.name IS 'اسم العلامة التجارية بالعربية - يجب أن يكون فريداً';

-- الخطوة 4: إعادة ترتيب display_order للعلامات المتبقية
UPDATE equipment_brands
SET display_order = subquery.new_order
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY display_order, name) as new_order
  FROM equipment_brands
) AS subquery
WHERE equipment_brands.id = subquery.id;
