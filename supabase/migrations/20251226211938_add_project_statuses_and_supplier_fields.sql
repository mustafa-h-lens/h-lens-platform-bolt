/*
  # إضافة جداول حالات المشاريع ومجالات الموردين

  1. جدول `project_statuses`
    - `id` (uuid, primary key)
    - `name` (text) - اسم الحالة بالعربية
    - `value` (text, unique) - القيمة الإنجليزية للحالة
    - `color` (text) - لون الحالة (hex code)
    - `is_default` (boolean) - هل هي الحالة الافتراضية
    - `sort_order` (integer) - ترتيب العرض
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  2. جدول `supplier_fields`
    - `id` (uuid, primary key)
    - `name` (text, unique) - اسم المجال
    - `description` (text) - وصف المجال
    - `is_active` (boolean) - هل المجال نشط
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  3. الأمان
    - تفعيل RLS على الجدولين
    - سياسات للقراءة للمستخدمين المصادقين
    - سياسات للكتابة للمسؤولين فقط

  4. البيانات الافتراضية
    - إضافة حالات المشاريع الأساسية
*/

-- إنشاء جدول حالات المشاريع
CREATE TABLE IF NOT EXISTS project_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  value text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT '#1B4FA9',
  is_default boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- إنشاء جدول مجالات الموردين
CREATE TABLE IF NOT EXISTS supplier_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE project_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_fields ENABLE ROW LEVEL SECURITY;

-- سياسات RLS لـ project_statuses
DROP POLICY IF EXISTS "Users can read project statuses" ON project_statuses;
CREATE POLICY "Users can read project statuses" ON project_statuses FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can insert project statuses" ON project_statuses;
CREATE POLICY "Admins can insert project statuses" ON project_statuses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can update project statuses" ON project_statuses;
CREATE POLICY "Admins can update project statuses" ON project_statuses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can delete project statuses" ON project_statuses;
CREATE POLICY "Admins can delete project statuses" ON project_statuses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- سياسات RLS لـ supplier_fields
DROP POLICY IF EXISTS "Users can read supplier fields" ON supplier_fields;
CREATE POLICY "Users can read supplier fields" ON supplier_fields FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can insert supplier fields" ON supplier_fields;
CREATE POLICY "Admins can insert supplier fields" ON supplier_fields FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can update supplier fields" ON supplier_fields;
CREATE POLICY "Admins can update supplier fields" ON supplier_fields FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can delete supplier fields" ON supplier_fields;
CREATE POLICY "Admins can delete supplier fields" ON supplier_fields FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- إدراج حالات المشاريع الافتراضية
INSERT INTO project_statuses (name, value, color, is_default, sort_order) VALUES
  ('طلب', 'request', '#6B7280', false, 1),
  ('عرض سعر', 'quoted', '#3B82F6', false, 2),
  ('فاتورة', 'invoiced', '#8B5CF6', false, 3),
  ('أمر شراء', 'po_issued', '#EC4899', false, 4),
  ('قيد التنفيذ', 'in_progress', '#F59E0B', true, 5),
  ('دفع جزئي', 'partial_paid', '#10B981', false, 6),
  ('مدفوع', 'paid', '#059669', false, 7),
  ('مكتمل', 'completed', '#22C55E', false, 8),
  ('مغلق', 'closed', '#64748B', false, 9),
  ('ملغي', 'cancelled', '#EF4444', false, 10)
ON CONFLICT (value) DO NOTHING;

-- إدراج مجالات الموردين الافتراضية
INSERT INTO supplier_fields (name, description, is_active) VALUES
  ('تصميم', 'خدمات التصميم الجرافيكي وتصميم الواجهات', true),
  ('برمجة', 'خدمات تطوير البرمجيات والتطبيقات', true),
  ('تسويق', 'خدمات التسويق الرقمي والإعلانات', true),
  ('استضافة', 'خدمات الاستضافة والخوادم', true),
  ('محتوى', 'كتابة المحتوى والترجمة', true)
ON CONFLICT (name) DO NOTHING;
