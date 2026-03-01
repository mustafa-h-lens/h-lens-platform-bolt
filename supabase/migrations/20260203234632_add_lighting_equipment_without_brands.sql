/*
  # إضافة معدات الإضاءة بدون علامات تجارية

  ## الهدف
  إضافة نوعين من معدات الإضاءة في كتالوج المعدات:
  - Tube (أنبوب إضاءة)
  - Speed Light (فلاش)

  ## التفاصيل
  1. إضافة المعدات إلى جدول equipment_catalog
  2. هذه المعدات لا تحتاج إلى علامات تجارية (brand_id = NULL)
  3. ربطها بتصنيف الإضاءة فقط

  ## الأمان
  - استخدام ON CONFLICT DO NOTHING لتجنب التكرار
  - العملية آمنة تماماً
*/

-- إضافة معدات الإضاءة بدون علامات تجارية
DO $$
DECLARE
  lighting_category_id uuid;
BEGIN
  -- الحصول على معرف تصنيف الإضاءة
  SELECT id INTO lighting_category_id
  FROM equipment_categories
  WHERE name = 'إضاءة' OR name_en = 'Lighting'
  LIMIT 1;

  -- التحقق من وجود التصنيف
  IF lighting_category_id IS NOT NULL THEN
    -- إضافة Tube
    INSERT INTO equipment_catalog (name, name_en, category_id, brand_id, is_active)
    VALUES ('أنبوب إضاءة', 'Tube', lighting_category_id, NULL, true)
    ON CONFLICT DO NOTHING;

    -- إضافة Speed Light
    INSERT INTO equipment_catalog (name, name_en, category_id, brand_id, is_active)
    VALUES ('فلاش', 'Speed Light', lighting_category_id, NULL, true)
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'تم إضافة معدات الإضاءة بنجاح';
  ELSE
    RAISE NOTICE 'تصنيف الإضاءة غير موجود';
  END IF;
END $$;

-- إضافة تعليق توضيحي
COMMENT ON TABLE equipment_catalog IS 'كتالوج المعدات - يمكن أن تكون بعض المعدات بدون علامات تجارية (مثل معدات الإضاءة)';
