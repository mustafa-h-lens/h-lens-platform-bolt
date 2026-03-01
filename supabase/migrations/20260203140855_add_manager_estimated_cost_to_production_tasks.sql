/*
  # إضافة حقل التكلفة المتوقعة من المدير للمهام الإنتاجية

  ## التغييرات
  
  1. حقول جديدة
     - `manager_estimated_cost` - التكلفة المتوقعة من المدير للمهمة الإنتاجية
  
  ## الملاحظات
  - الحقل اختياري ويقبل القيم الصفرية
  - يمكن للمدير إدخال تكلفة متوقعة تختلف عن المبلغ الفعلي للمهمة
*/

-- إضافة حقل التكلفة المتوقعة من المدير
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_tasks' AND column_name = 'manager_estimated_cost'
  ) THEN
    ALTER TABLE production_tasks 
    ADD COLUMN manager_estimated_cost numeric CHECK (manager_estimated_cost >= 0);
  END IF;
END $$;

-- إضافة comment للحقل
COMMENT ON COLUMN production_tasks.manager_estimated_cost IS 'التكلفة المتوقعة من المدير للمهمة';