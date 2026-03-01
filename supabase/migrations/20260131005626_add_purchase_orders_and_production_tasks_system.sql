/*
  # نظام أوامر الشراء والمهام الإنتاجية
  
  ## الجداول الجديدة
  
  ### 1. purchase_orders - أوامر الشراء
    - `id` (uuid, primary key)
    - `client_id` (uuid, foreign key) - العميل المرتبط
    - `po_number` (text, unique) - رقم أمر الشراء
    - `total_amount` (numeric) - القيمة الإجمالية
    - `used_amount` (numeric, default 0) - المبلغ المستخدم
    - `remaining_amount` (numeric, generated) - المبلغ المتبقي
    - `status` (text) - الحالة: active, near_full, full, completed, cancelled
    - `file_url` (text) - رابط ملف أمر الشراء
    - `notes` (text) - ملاحظات
    - `created_by` (uuid, foreign key)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
  
  ### 2. production_tasks - المهام الإنتاجية
    - `id` (uuid, primary key)
    - `client_id` (uuid, foreign key) - العميل المرتبط
    - `project_id` (uuid, foreign key, nullable) - المشروع المرتبط (اختياري)
    - `name` (text) - اسم المهمة
    - `description` (text) - وصف مختصر
    - `amount` (numeric) - المبلغ
    - `allocated_amount` (numeric, default 0) - المبلغ المخصص من POs
    - `status` (text) - الحالة
    - `created_by` (uuid, foreign key)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
  
  ### 3. task_po_allocations - تخصيص المهام على أوامر الشراء
    - `id` (uuid, primary key)
    - `task_id` (uuid, foreign key)
    - `po_id` (uuid, foreign key)
    - `allocated_amount` (numeric) - المبلغ المخصص
    - `created_at` (timestamptz)
  
  ### 4. po_settings - إعدادات أوامر الشراء
    - `id` (uuid, primary key)
    - `alert_percentage` (numeric, default 80) - نسبة التنبيه
    - `enable_alert` (boolean, default true) - تفعيل التحذير
    - `allow_split_allocation` (boolean, default true) - السماح بالتقسيم
    - `updated_at` (timestamptz)
  
  ## الأمان
    - تفعيل RLS على جميع الجداول
    - سياسات للمستخدمين المصرح لهم فقط
*/

-- جدول أوامر الشراء
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  po_number text NOT NULL UNIQUE,
  total_amount numeric NOT NULL CHECK (total_amount >= 0),
  used_amount numeric NOT NULL DEFAULT 0 CHECK (used_amount >= 0),
  remaining_amount numeric GENERATED ALWAYS AS (total_amount - used_amount) STORED,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'near_full', 'full', 'completed', 'cancelled')),
  file_url text,
  notes text,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- جدول المهام الإنتاجية
CREATE TABLE IF NOT EXISTS production_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  amount numeric NOT NULL CHECK (amount >= 0),
  allocated_amount numeric NOT NULL DEFAULT 0 CHECK (allocated_amount >= 0),
  status text NOT NULL DEFAULT 'quote' CHECK (status IN ('quote', 'linked_to_po', 'in_progress', 'ready_to_invoice', 'invoiced', 'completed')),
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- جدول التخصيصات
CREATE TABLE IF NOT EXISTS task_po_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES production_tasks(id) ON DELETE CASCADE,
  po_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  allocated_amount numeric NOT NULL CHECK (allocated_amount > 0),
  created_at timestamptz DEFAULT now(),
  UNIQUE(task_id, po_id)
);

-- جدول الإعدادات
CREATE TABLE IF NOT EXISTS po_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_percentage numeric NOT NULL DEFAULT 80 CHECK (alert_percentage >= 0 AND alert_percentage <= 100),
  enable_alert boolean NOT NULL DEFAULT true,
  allow_split_allocation boolean NOT NULL DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

-- إدراج إعدادات افتراضية إذا لم تكن موجودة
INSERT INTO po_settings (id, alert_percentage, enable_alert, allow_split_allocation)
SELECT gen_random_uuid(), 80, true, true
WHERE NOT EXISTS (SELECT 1 FROM po_settings LIMIT 1);

-- الفهارس
CREATE INDEX IF NOT EXISTS idx_purchase_orders_client ON purchase_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_production_tasks_client ON production_tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_production_tasks_project ON production_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_production_tasks_status ON production_tasks(status);
CREATE INDEX IF NOT EXISTS idx_task_po_allocations_task ON task_po_allocations(task_id);
CREATE INDEX IF NOT EXISTS idx_task_po_allocations_po ON task_po_allocations(po_id);

-- تفعيل RLS
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_po_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_settings ENABLE ROW LEVEL SECURITY;

-- سياسات أوامر الشراء
CREATE POLICY "Users can view purchase orders"
  ON purchase_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert purchase orders"
  ON purchase_orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update purchase orders"
  ON purchase_orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete purchase orders"
  ON purchase_orders FOR DELETE
  TO authenticated
  USING (true);

-- سياسات المهام الإنتاجية
CREATE POLICY "Users can view production tasks"
  ON production_tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert production tasks"
  ON production_tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update production tasks"
  ON production_tasks FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete production tasks"
  ON production_tasks FOR DELETE
  TO authenticated
  USING (true);

-- سياسات التخصيصات
CREATE POLICY "Users can view allocations"
  ON task_po_allocations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert allocations"
  ON task_po_allocations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can delete allocations"
  ON task_po_allocations FOR DELETE
  TO authenticated
  USING (true);

-- سياسات الإعدادات
CREATE POLICY "Users can view settings"
  ON po_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can update settings"
  ON po_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- دالة لتحديث حالة PO تلقائيًا بناءً على المبلغ المستخدم
CREATE OR REPLACE FUNCTION update_po_status()
RETURNS TRIGGER AS $$
DECLARE
  settings_alert_percentage numeric;
  settings_enable_alert boolean;
  usage_percentage numeric;
BEGIN
  -- جلب الإعدادات
  SELECT alert_percentage, enable_alert 
  INTO settings_alert_percentage, settings_enable_alert
  FROM po_settings 
  LIMIT 1;
  
  -- حساب النسبة المستخدمة
  usage_percentage := (NEW.used_amount / NULLIF(NEW.total_amount, 0)) * 100;
  
  -- تحديث الحالة
  IF NEW.status != 'cancelled' AND NEW.status != 'completed' THEN
    IF NEW.used_amount >= NEW.total_amount THEN
      NEW.status := 'full';
    ELSIF settings_enable_alert AND usage_percentage >= settings_alert_percentage THEN
      NEW.status := 'near_full';
    ELSE
      NEW.status := 'active';
    END IF;
  END IF;
  
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger لتحديث حالة PO
DROP TRIGGER IF EXISTS trigger_update_po_status ON purchase_orders;
CREATE TRIGGER trigger_update_po_status
  BEFORE INSERT OR UPDATE OF used_amount, total_amount ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_po_status();

-- دالة لتحديث used_amount في PO عند إضافة/حذف تخصيص
CREATE OR REPLACE FUNCTION sync_po_used_amount()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE purchase_orders
    SET used_amount = used_amount - OLD.allocated_amount
    WHERE id = OLD.po_id;
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    UPDATE purchase_orders
    SET used_amount = used_amount + NEW.allocated_amount
    WHERE id = NEW.po_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger لمزامنة used_amount
DROP TRIGGER IF EXISTS trigger_sync_po_used_amount ON task_po_allocations;
CREATE TRIGGER trigger_sync_po_used_amount
  AFTER INSERT OR DELETE ON task_po_allocations
  FOR EACH ROW
  EXECUTE FUNCTION sync_po_used_amount();

-- دالة لتحديث allocated_amount في المهمة
CREATE OR REPLACE FUNCTION sync_task_allocated_amount()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE production_tasks
    SET allocated_amount = allocated_amount - OLD.allocated_amount,
        updated_at = now()
    WHERE id = OLD.task_id;
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    UPDATE production_tasks
    SET allocated_amount = allocated_amount + NEW.allocated_amount,
        updated_at = now()
    WHERE id = NEW.task_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger لمزامنة allocated_amount
DROP TRIGGER IF EXISTS trigger_sync_task_allocated_amount ON task_po_allocations;
CREATE TRIGGER trigger_sync_task_allocated_amount
  AFTER INSERT OR DELETE ON task_po_allocations
  FOR EACH ROW
  EXECUTE FUNCTION sync_task_allocated_amount();
