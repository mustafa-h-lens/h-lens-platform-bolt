/*
  # نظام إدارة المشاريع المتكامل

  ## التحديثات الرئيسية

  ### 1. نظام المصادقة والصلاحيات
  - إضافة username للمستخدمين
  - إضافة حالة التفعيل (is_active)
  - دعم الأدوار الجديدة: super_admin, admin, client_user
  - جدول ربط المستخدمين بالعملاء (user_client_access)

  ### 2. كاتالوج البنود (Service Items)
  - جدول service_items: كاتالوج الخدمات
  - جدول project_items: البنود المرتبطة بالمشاريع
  - حساب تلقائي للإجمالي

  ### 3. ملفات المشروع
  - جدول project_files: تخزين معلومات الملفات
  - أنواع الملفات: عرض سعر، فاتورة، PO، خطة، عقد، غيره

  ### 4. المنجزات والروابط
  - جدول project_milestones: المنجزات والروابط

  ### 5. سجل النشاط
  - جدول activity_logs: تسجيل جميع الإجراءات
  - Triggers تلقائية لتسجيل التغييرات

  ### 6. تحديثات المشاريع
  - إضافة project_code
  - إضافة project_manager_id
  - إضافة internal_notes
  - تحديث workflow الحالات

  ### 7. الأمان
  - تفعيل RLS على جميع الجداول
  - سياسات أمان محكمة
*/

-- ================================================
-- 1. تحديث جدول المستخدمين
-- ================================================

-- إضافة حقول جديدة للمستخدمين
ALTER TABLE users ADD COLUMN IF NOT EXISTS username text UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- إنشاء فهارس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- تحديث قيد الأدوار
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check') THEN
    ALTER TABLE users DROP CONSTRAINT users_role_check;
  END IF;
END $$;

ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'super_admin', 'client', 'client_user'));

-- ================================================
-- 2. جدول ربط المستخدمين بالعملاء (للـ admin)
-- ================================================

CREATE TABLE IF NOT EXISTS user_client_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_user_client_access_user_id ON user_client_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_client_access_client_id ON user_client_access(client_id);

ALTER TABLE user_client_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage client access"
  ON user_client_access FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ================================================
-- 3. تحديث جدول المشاريع
-- ================================================

-- إضافة حقول جديدة
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_code text UNIQUE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_manager_id uuid REFERENCES users(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS internal_notes text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS activation_time timestamptz;

-- إنشاء فهارس
CREATE INDEX IF NOT EXISTS idx_projects_project_code ON projects(project_code);
CREATE INDEX IF NOT EXISTS idx_projects_project_manager_id ON projects(project_manager_id);

-- تحديث قيد الحالات
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_status_check') THEN
    ALTER TABLE projects DROP CONSTRAINT projects_status_check;
  END IF;
END $$;

ALTER TABLE projects ADD CONSTRAINT projects_status_check
  CHECK (status IN (
    'request', 'quoted', 'invoiced', 'po_issued',
    'partial_paid', 'paid', 'closed', 'cancelled',
    'pending', 'in_progress', 'completed'
  ));

-- دالة لتوليد رمز المشروع تلقائياً
CREATE OR REPLACE FUNCTION generate_project_code()
RETURNS text AS $$
DECLARE
  next_number integer;
  project_code_str text;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(project_code FROM '[0-9]+$') AS integer)), 0) + 1
  INTO next_number
  FROM projects
  WHERE project_code ~ '^PRJ-[0-9]+$';

  project_code_str := 'PRJ-' || LPAD(next_number::text, 6, '0');
  RETURN project_code_str;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 4. كاتالوج البنود (Service Items)
-- ================================================

CREATE TABLE IF NOT EXISTS service_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_number text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  default_quantity decimal(10, 2) DEFAULT 1,
  unit_price decimal(15, 2) NOT NULL,
  currency text DEFAULT 'ر.س',
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_items_item_number ON service_items(item_number);
CREATE INDEX IF NOT EXISTS idx_service_items_is_active ON service_items(is_active);
CREATE INDEX IF NOT EXISTS idx_service_items_created_by ON service_items(created_by);

ALTER TABLE service_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage service items"
  ON service_items FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "All authenticated users can view active items"
  ON service_items FOR SELECT
  TO authenticated
  USING (is_active = true);

-- ================================================
-- 5. بنود المشروع (Project Items)
-- ================================================

CREATE TABLE IF NOT EXISTS project_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  service_item_id uuid REFERENCES service_items(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  quantity decimal(10, 2) DEFAULT 1,
  unit_price decimal(15, 2) NOT NULL,
  total_price decimal(15, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  currency text DEFAULT 'ر.س',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_items_project_id ON project_items(project_id);
CREATE INDEX IF NOT EXISTS idx_project_items_service_item_id ON project_items(service_item_id);

ALTER TABLE project_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage project items"
  ON project_items FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Clients view own project items"
  ON project_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN clients c ON c.id = p.client_id
      WHERE p.id = project_items.project_id
      AND c.user_id = auth.uid()
    )
  );

-- Trigger لتحديث إجمالي المشروع عند تغيير البنود
CREATE OR REPLACE FUNCTION update_project_total_from_items()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE projects
  SET total_price = (
    SELECT COALESCE(SUM(total_price), 0)
    FROM project_items
    WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
  )
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_project_total_on_items_change ON project_items;
CREATE TRIGGER update_project_total_on_items_change
AFTER INSERT OR UPDATE OR DELETE ON project_items
FOR EACH ROW EXECUTE FUNCTION update_project_total_from_items();

-- ================================================
-- 6. ملفات المشروع (Project Files)
-- ================================================

CREATE TABLE IF NOT EXISTS project_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN (
    'quote', 'invoice', 'po', 'plan', 'contract', 'other'
  )),
  file_url text NOT NULL,
  file_size bigint,
  mime_type text,
  uploaded_by uuid REFERENCES users(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_file_type ON project_files(file_type);
CREATE INDEX IF NOT EXISTS idx_project_files_uploaded_by ON project_files(uploaded_by);

ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage project files"
  ON project_files FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Clients view own project files"
  ON project_files FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN clients c ON c.id = p.client_id
      WHERE p.id = project_files.project_id
      AND c.user_id = auth.uid()
    )
  );

-- ================================================
-- 7. منجزات المشروع (Milestones)
-- ================================================

CREATE TABLE IF NOT EXISTS project_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  link_url text NOT NULL,
  link_type text CHECK (link_type IN (
    'deliverable', 'video', 'design', 'documentation', 'other'
  )),
  description text,
  sort_order integer DEFAULT 0,
  created_by uuid REFERENCES users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_milestones_project_id ON project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_project_milestones_created_by ON project_milestones(created_by);

ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage milestones"
  ON project_milestones FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Clients view own project milestones"
  ON project_milestones FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN clients c ON c.id = p.client_id
      WHERE p.id = project_milestones.project_id
      AND c.user_id = auth.uid()
    )
  );

-- ================================================
-- 8. سجل النشاط (Activity Log)
-- ================================================

CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  action_details jsonb DEFAULT '{}'::jsonb,
  old_value text,
  new_value text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_project_id ON activity_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON activity_logs(action_type);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Clients view own project activity"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN clients c ON c.id = p.client_id
      WHERE p.id = activity_logs.project_id
      AND c.user_id = auth.uid()
    )
  );

-- دالة لتسجيل النشاط
CREATE OR REPLACE FUNCTION log_activity(
  p_project_id uuid,
  p_action_type text,
  p_action_details jsonb DEFAULT '{}'::jsonb,
  p_old_value text DEFAULT NULL,
  p_new_value text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO activity_logs (project_id, user_id, action_type, action_details, old_value, new_value)
  VALUES (p_project_id, auth.uid(), p_action_type, p_action_details, p_old_value, p_new_value);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger لتسجيل تغيير حالة المشروع
CREATE OR REPLACE FUNCTION log_project_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM log_activity(
      NEW.id,
      'status_changed',
      jsonb_build_object('from', OLD.status, 'to', NEW.status),
      OLD.status,
      NEW.status
    );
  END IF;

  IF (TG_OP = 'INSERT') THEN
    PERFORM log_activity(
      NEW.id,
      'project_created',
      jsonb_build_object('project_name', NEW.name, 'client_id', NEW.client_id::text)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS project_status_change_trigger ON projects;
CREATE TRIGGER project_status_change_trigger
AFTER INSERT OR UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION log_project_status_change();

-- Trigger لتسجيل إضافة/تعديل/حذف بنود المشروع
CREATE OR REPLACE FUNCTION log_project_item_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    PERFORM log_activity(
      NEW.project_id,
      'item_added',
      jsonb_build_object('item_name', NEW.name, 'quantity', NEW.quantity, 'unit_price', NEW.unit_price)
    );
  ELSIF (TG_OP = 'UPDATE') THEN
    PERFORM log_activity(
      NEW.project_id,
      'item_updated',
      jsonb_build_object('item_name', NEW.name, 'old_quantity', OLD.quantity, 'new_quantity', NEW.quantity)
    );
  ELSIF (TG_OP = 'DELETE') THEN
    PERFORM log_activity(
      OLD.project_id,
      'item_deleted',
      jsonb_build_object('item_name', OLD.name)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS project_item_changes_trigger ON project_items;
CREATE TRIGGER project_item_changes_trigger
AFTER INSERT OR UPDATE OR DELETE ON project_items
FOR EACH ROW EXECUTE FUNCTION log_project_item_changes();

-- Trigger لتسجيل رفع الملفات
CREATE OR REPLACE FUNCTION log_project_file_upload()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    PERFORM log_activity(
      NEW.project_id,
      'file_uploaded',
      jsonb_build_object('file_name', NEW.file_name, 'file_type', NEW.file_type)
    );
  ELSIF (TG_OP = 'DELETE') THEN
    PERFORM log_activity(
      OLD.project_id,
      'file_deleted',
      jsonb_build_object('file_name', OLD.file_name, 'file_type', OLD.file_type)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS project_file_upload_trigger ON project_files;
CREATE TRIGGER project_file_upload_trigger
AFTER INSERT OR DELETE ON project_files
FOR EACH ROW EXECUTE FUNCTION log_project_file_upload();

-- Trigger لتسجيل إنشاء الفواتير
CREATE OR REPLACE FUNCTION log_invoice_creation()
RETURNS TRIGGER AS $$
DECLARE
  v_project_id uuid;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    SELECT project_id INTO v_project_id FROM invoices WHERE id = NEW.id;

    IF v_project_id IS NOT NULL THEN
      PERFORM log_activity(
        v_project_id,
        'invoice_created',
        jsonb_build_object('invoice_number', NEW.invoice_number, 'total_amount', NEW.total_amount)
      );
    END IF;
  ELSIF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    SELECT project_id INTO v_project_id FROM invoices WHERE id = NEW.id;

    IF v_project_id IS NOT NULL THEN
      PERFORM log_activity(
        v_project_id,
        'invoice_status_changed',
        jsonb_build_object('invoice_number', NEW.invoice_number, 'from', OLD.status, 'to', NEW.status),
        OLD.status,
        NEW.status
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS invoice_creation_trigger ON invoices;
CREATE TRIGGER invoice_creation_trigger
AFTER INSERT OR UPDATE ON invoices
FOR EACH ROW EXECUTE FUNCTION log_invoice_creation();

-- ================================================
-- 9. جدول المهام (اختياري)
-- ================================================

CREATE TABLE IF NOT EXISTS project_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  due_date date,
  status text DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  sort_order integer DEFAULT 0,
  created_by uuid REFERENCES users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_tasks_project_id ON project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_assigned_to ON project_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_project_tasks_status ON project_tasks(status);
CREATE INDEX IF NOT EXISTS idx_project_tasks_due_date ON project_tasks(due_date);

ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage project tasks"
  ON project_tasks FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Clients view own project tasks"
  ON project_tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN clients c ON c.id = p.client_id
      WHERE p.id = project_tasks.project_id
      AND c.user_id = auth.uid()
    )
  );