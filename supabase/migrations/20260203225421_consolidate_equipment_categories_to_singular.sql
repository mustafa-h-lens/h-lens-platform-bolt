/*
  # توحيد تصنيفات المعدات إلى صيغة المفرد

  هذا التحديث يقوم بتوحيد التصنيفات لاستخدام صيغة المفرد فقط وإلغاء التكرار:
  
  ## التغييرات:
  
  1. **نقل المعدات من التصنيفات الجمع إلى المفرد:**
     - "كاميرات" (64 معدة) → "كاميرا"
     - "عدسات" (59 معدة) → "عدسة"
     - "درونز" (7 معدات) → "درون"
  
  2. **نقل علاقات العلامات التجارية:**
     - نقل جميع العلاقات من التصنيفات الجمع إلى المفرد
     - تجنب التكرار في العلاقات
  
  3. **حذف التصنيفات الجمع:**
     - حذف "كاميرات"، "عدسات"، "درونز"
  
  ## ملاحظات:
  - يتم الحفاظ على جميع البيانات
  - لا يتم فقدان أي معدات أو علاقات
  - تصبح التصنيفات موحدة بصيغة المفرد
*/

-- الحصول على معرفات التصنيفات
DO $$
DECLARE
  camera_singular_id uuid;
  camera_plural_id uuid;
  lens_singular_id uuid;
  lens_plural_id uuid;
  drone_singular_id uuid;
  drone_plural_id uuid;
BEGIN
  -- الحصول على معرفات التصنيفات المفرد
  SELECT id INTO camera_singular_id FROM equipment_categories WHERE name = 'كاميرا' LIMIT 1;
  SELECT id INTO lens_singular_id FROM equipment_categories WHERE name = 'عدسة' LIMIT 1;
  SELECT id INTO drone_singular_id FROM equipment_categories WHERE name = 'درون' LIMIT 1;
  
  -- الحصول على معرفات التصنيفات الجمع
  SELECT id INTO camera_plural_id FROM equipment_categories WHERE name = 'كاميرات' LIMIT 1;
  SELECT id INTO lens_plural_id FROM equipment_categories WHERE name = 'عدسات' LIMIT 1;
  SELECT id INTO drone_plural_id FROM equipment_categories WHERE name = 'درونز' LIMIT 1;
  
  -- نقل المعدات من "كاميرات" إلى "كاميرا"
  IF camera_plural_id IS NOT NULL AND camera_singular_id IS NOT NULL THEN
    UPDATE equipment_catalog
    SET category_id = camera_singular_id
    WHERE category_id = camera_plural_id;
    
    -- نقل علاقات العلامات التجارية (تجنب التكرار)
    INSERT INTO brand_categories (category_id, brand_id)
    SELECT camera_singular_id, brand_id
    FROM brand_categories
    WHERE category_id = camera_plural_id
    ON CONFLICT DO NOTHING;
    
    -- حذف العلاقات القديمة
    DELETE FROM brand_categories WHERE category_id = camera_plural_id;
    
    -- حذف التصنيف الجمع
    DELETE FROM equipment_categories WHERE id = camera_plural_id;
  END IF;
  
  -- نقل المعدات من "عدسات" إلى "عدسة"
  IF lens_plural_id IS NOT NULL AND lens_singular_id IS NOT NULL THEN
    UPDATE equipment_catalog
    SET category_id = lens_singular_id
    WHERE category_id = lens_plural_id;
    
    -- نقل علاقات العلامات التجارية (تجنب التكرار)
    INSERT INTO brand_categories (category_id, brand_id)
    SELECT lens_singular_id, brand_id
    FROM brand_categories
    WHERE category_id = lens_plural_id
    ON CONFLICT DO NOTHING;
    
    -- حذف العلاقات القديمة
    DELETE FROM brand_categories WHERE category_id = lens_plural_id;
    
    -- حذف التصنيف الجمع
    DELETE FROM equipment_categories WHERE id = lens_plural_id;
  END IF;
  
  -- نقل المعدات من "درونز" إلى "درون"
  IF drone_plural_id IS NOT NULL AND drone_singular_id IS NOT NULL THEN
    UPDATE equipment_catalog
    SET category_id = drone_singular_id
    WHERE category_id = drone_plural_id;
    
    -- نقل علاقات العلامات التجارية (تجنب التكرار)
    INSERT INTO brand_categories (category_id, brand_id)
    SELECT drone_singular_id, brand_id
    FROM brand_categories
    WHERE category_id = drone_plural_id
    ON CONFLICT DO NOTHING;
    
    -- حذف العلاقات القديمة
    DELETE FROM brand_categories WHERE category_id = drone_plural_id;
    
    -- حذف التصنيف الجمع
    DELETE FROM equipment_categories WHERE id = drone_plural_id;
  END IF;
END $$;
