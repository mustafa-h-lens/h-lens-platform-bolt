/*
  # إضافة نظام التخصيصات المالية وإعدادات أوامر الشراء

  ## 1. الجداول الجديدة
    
    ### `task_po_allocations` - تخصيصات المهام على أوامر الشراء
    - `id` (uuid, primary key) - معرف التخصيص
    - `task_id` (uuid, foreign key → production_tasks.id) - المهمة الإنتاجية
    - `po_id` (uuid, foreign key → purchase_orders.id) - أمر الشراء
    - `amount` (numeric) - المبلغ المخصص بالريال
    - `notes` (text) - ملاحظات اختيارية
    - `created_at` (timestamptz) - تاريخ الإنشاء
    - `updated_at` (timestamptz) - تاريخ آخر تحديث

    ### `po_settings` - إعدادات أوامر الشراء
    - `id` (uuid, primary key) - معرف الإعدادات
    - `warning_threshold` (numeric) - نسبة التنبيه (مثلاً 80%)
    - `allow_split_task` (boolean) - السماح بتقسيم المهمة على أكثر من PO
    - `allow_po_exceed` (boolean) - السماح بتجاوز قيمة PO
    - `created_at` (timestamptz) - تاريخ الإنشاء
    - `updated_at` (timestamptz) - تاريخ آخر تحديث

  ## 2. التحديثات على الجداول الموجودة
    
    ### `purchase_orders`
    - إضافة عمود `status` (حالة أمر الشراء: active, near_complete, completed, cancelled)
    
    ### `production_tasks`
    - إضافة عمود `amount` (المبلغ المقدر للمهمة)

  ## 3. الأمان (RLS)
    - تمكين RLS على الجداول الجديدة
    - إضافة سياسات للمستخدمين المصادقين فقط
    
  ## 4. الفهارس (Indexes)
    - فهرس على task_id و po_id لتحسين الأداء
    - فهرس على حالة PO
*/

-- حذف الجداول إذا كانت موجودة (للإعادة الصحيحة)
DROP TABLE IF EXISTS task_po_allocations CASCADE;
DROP TABLE IF EXISTS po_settings CASCADE;

-- إنشاء جدول تخصيصات المهام على أوامر الشراء
CREATE TABLE task_po_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES production_tasks(id) ON DELETE CASCADE,
  po_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0 CHECK (amount >= 0),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(task_id, po_id)
);

-- إنشاء جدول إعدادات أوامر الشراء
CREATE TABLE po_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warning_threshold numeric NOT NULL DEFAULT 80 CHECK (warning_threshold >= 0 AND warning_threshold <= 100),
  allow_split_task boolean NOT NULL DEFAULT true,
  allow_po_exceed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- إدراج إعدادات افتراضية
INSERT INTO po_settings (warning_threshold, allow_split_task, allow_po_exceed)
VALUES (80, true, false);

-- إضافة عمود الحالة لأوامر الشراء
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'status'
  ) THEN
    ALTER TABLE purchase_orders 
    ADD COLUMN status text NOT NULL DEFAULT 'active' 
    CHECK (status IN ('active', 'near_complete', 'completed', 'cancelled'));
  END IF;
END $$;

-- إضافة عمود المبلغ للمهام الإنتاجية
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_tasks' AND column_name = 'amount'
  ) THEN
    ALTER TABLE production_tasks ADD COLUMN amount numeric DEFAULT 0 CHECK (amount >= 0);
  END IF;
END $$;

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX idx_task_po_allocations_task_id ON task_po_allocations(task_id);
CREATE INDEX idx_task_po_allocations_po_id ON task_po_allocations(po_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);

-- تفعيل RLS على الجداول الجديدة
ALTER TABLE task_po_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_settings ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان لجدول task_po_allocations
CREATE POLICY "Users can view task allocations"
  ON task_po_allocations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert task allocations"
  ON task_po_allocations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update task allocations"
  ON task_po_allocations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete task allocations"
  ON task_po_allocations FOR DELETE
  TO authenticated
  USING (true);

-- سياسات الأمان لجدول po_settings
CREATE POLICY "Users can view PO settings"
  ON po_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update PO settings"
  ON po_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق الدالة على الجداول الجديدة
CREATE TRIGGER update_task_po_allocations_updated_at
  BEFORE UPDATE ON task_po_allocations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_po_settings_updated_at
  BEFORE UPDATE ON po_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();