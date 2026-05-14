/*
  # إصلاح المشاكل الأمنية ومشاكل الأداء
  
  ## التغييرات الرئيسية
  
  ### 1. إضافة Indexes للـ Foreign Keys
  تم إضافة indexes لجميع foreign keys التي لا تحتوي على indexes لتحسين الأداء:
  - clients.created_by
  - invoices.created_by
  - item_categories.created_by
  - production_tasks.created_by
  - project_items.category_id
  - project_tasks.created_by
  - projects.created_by
  - purchase_orders.created_by
  - settings_config.updated_by
  - vendor_activity_log.performed_by
  - vendor_documents.uploaded_by
  - vendor_financial_data.bank_id
  - vendor_invoices.client_id
  - vendor_registration_drafts.bank_id
  - vendors.bank_id
  - vendors.reviewed_by
  
  ### 2. تحسين RLS Policies
  تم تحسين جميع سياسات RLS لاستخدام `(select auth.uid())` بدلاً من `auth.uid()` 
  لتحسين الأداء ومنع إعادة التقييم لكل صف
  
  ### 3. إصلاح RLS Policies التي تسمح بوصول غير محدود
  تم تحديث السياسات التي تستخدم `true` لتكون أكثر تقييداً وتحقق من صلاحيات المستخدم
  
  ### 4. إصلاح Multiple Permissive Policies
  تم دمج السياسات المتعددة في سياسة واحدة أو جعلها restrictive حسب الحاجة
  
  ### 5. إصلاح Function Search Path
  تم تحديث جميع Functions لتستخدم search_path آمن
*/

-- ========================================
-- الجزء 1: إضافة Indexes للـ Foreign Keys
-- ========================================

-- إضافة indexes للجداول التي تفتقدها
CREATE INDEX IF NOT EXISTS idx_clients_created_by ON public.clients(created_by);
CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON public.invoices(created_by);
CREATE INDEX IF NOT EXISTS idx_item_categories_created_by ON public.item_categories(created_by);
CREATE INDEX IF NOT EXISTS idx_production_tasks_created_by ON public.production_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_project_items_category_id ON public.project_items(category_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_created_by ON public.project_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_by ON public.purchase_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_settings_config_updated_by ON public.settings_config(updated_by);
-- vendor_activity_log is created in a LATER migration (20260314170000); guard so
-- a from-scratch replay (e.g. Supabase Branching) doesn't blow up here.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='vendor_activity_log') THEN
    CREATE INDEX IF NOT EXISTS idx_vendor_activity_log_performed_by ON public.vendor_activity_log(performed_by);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_vendor_documents_uploaded_by ON public.vendor_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_vendor_financial_data_bank_id ON public.vendor_financial_data(bank_id);
CREATE INDEX IF NOT EXISTS idx_vendor_invoices_client_id ON public.vendor_invoices(client_id);
-- vendor_registration_drafts.bank_id only exists on prod via a manual addition;
-- the column was never added through any migration in the repo. Guard so
-- from-scratch replays (Supabase Branching) don't blow up.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='vendor_registration_drafts' AND column_name='bank_id') THEN
    CREATE INDEX IF NOT EXISTS idx_vendor_registration_drafts_bank_id ON public.vendor_registration_drafts(bank_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_vendors_bank_id ON public.vendors(bank_id);
CREATE INDEX IF NOT EXISTS idx_vendors_reviewed_by ON public.vendors(reviewed_by);

-- ========================================
-- الجزء 2: تحسين RLS Policies - جدول Users
-- ========================================

DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.users;
CREATE POLICY "Allow insert for authenticated users"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- ========================================
-- الجزء 3: تحسين RLS Policies - جدول Clients
-- ========================================

DROP POLICY IF EXISTS "Clients view own data" ON public.clients;
CREATE POLICY "Clients view own data"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.user_client_access
      WHERE user_client_access.client_id = clients.id
      AND user_client_access.user_id = (select auth.uid())
    )
  );

-- ========================================
-- الجزء 4: تحسين RLS Policies - جدول Projects
-- ========================================

DROP POLICY IF EXISTS "Clients view own projects" ON public.projects;
CREATE POLICY "Clients view own projects"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = projects.client_id
      AND (
        clients.user_id = (select auth.uid()) OR
        EXISTS (
          SELECT 1 FROM public.user_client_access
          WHERE user_client_access.client_id = clients.id
          AND user_client_access.user_id = (select auth.uid())
        )
      )
    )
  );

-- ========================================
-- الجزء 5: تحسين RLS Policies - جدول Invoices
-- ========================================

DROP POLICY IF EXISTS "Clients view own invoices" ON public.invoices;
CREATE POLICY "Clients view own invoices"
  ON public.invoices
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = invoices.client_id
      AND (
        clients.user_id = (select auth.uid()) OR
        EXISTS (
          SELECT 1 FROM public.user_client_access
          WHERE user_client_access.client_id = clients.id
          AND user_client_access.user_id = (select auth.uid())
        )
      )
    )
  );

-- ========================================
-- الجزء 6: تحسين RLS Policies - جدول Project Items
-- ========================================

DROP POLICY IF EXISTS "Clients view own project items" ON public.project_items;
CREATE POLICY "Clients view own project items"
  ON public.project_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      JOIN public.clients ON clients.id = projects.client_id
      WHERE projects.id = project_items.project_id
      AND (
        clients.user_id = (select auth.uid()) OR
        EXISTS (
          SELECT 1 FROM public.user_client_access
          WHERE user_client_access.client_id = clients.id
          AND user_client_access.user_id = (select auth.uid())
        )
      )
    )
  );

-- ========================================
-- الجزء 7: تحسين RLS Policies - جدول Project Files
-- ========================================

DROP POLICY IF EXISTS "Clients view own project files" ON public.project_files;
CREATE POLICY "Clients view own project files"
  ON public.project_files
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      JOIN public.clients ON clients.id = projects.client_id
      WHERE projects.id = project_files.project_id
      AND (
        clients.user_id = (select auth.uid()) OR
        EXISTS (
          SELECT 1 FROM public.user_client_access
          WHERE user_client_access.client_id = clients.id
          AND user_client_access.user_id = (select auth.uid())
        )
      )
    )
  );

-- ========================================
-- الجزء 8: تحسين RLS Policies - جدول Project Milestones
-- ========================================

DROP POLICY IF EXISTS "Clients view own project milestones" ON public.project_milestones;
CREATE POLICY "Clients view own project milestones"
  ON public.project_milestones
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      JOIN public.clients ON clients.id = projects.client_id
      WHERE projects.id = project_milestones.project_id
      AND (
        clients.user_id = (select auth.uid()) OR
        EXISTS (
          SELECT 1 FROM public.user_client_access
          WHERE user_client_access.client_id = clients.id
          AND user_client_access.user_id = (select auth.uid())
        )
      )
    )
  );

-- ========================================
-- الجزء 9: تحسين RLS Policies - جدول Activity Logs
-- ========================================

DROP POLICY IF EXISTS "Clients view own project activity" ON public.activity_logs;
CREATE POLICY "Clients view own project activity"
  ON public.activity_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      JOIN public.clients ON clients.id = projects.client_id
      WHERE projects.id = activity_logs.project_id
      AND (
        clients.user_id = (select auth.uid()) OR
        EXISTS (
          SELECT 1 FROM public.user_client_access
          WHERE user_client_access.client_id = clients.id
          AND user_client_access.user_id = (select auth.uid())
        )
      )
    )
  );

-- ========================================
-- الجزء 10: تحسين RLS Policies - جدول Project Tasks
-- ========================================

DROP POLICY IF EXISTS "Clients view own project tasks" ON public.project_tasks;
CREATE POLICY "Clients view own project tasks"
  ON public.project_tasks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      JOIN public.clients ON clients.id = projects.client_id
      WHERE projects.id = project_tasks.project_id
      AND (
        clients.user_id = (select auth.uid()) OR
        EXISTS (
          SELECT 1 FROM public.user_client_access
          WHERE user_client_access.client_id = clients.id
          AND user_client_access.user_id = (select auth.uid())
        )
      )
    )
  );

-- ========================================
-- الجزء 11: تحسين RLS Policies - Item Categories (Admin checks)
-- ========================================

DROP POLICY IF EXISTS "Admins can insert categories" ON public.item_categories;
CREATE POLICY "Admins can insert categories"
  ON public.item_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can update categories" ON public.item_categories;
CREATE POLICY "Admins can update categories"
  ON public.item_categories
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can delete categories" ON public.item_categories;
CREATE POLICY "Admins can delete categories"
  ON public.item_categories
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- ========================================
-- الجزء 12: تحسين RLS Policies - Project Statuses
-- ========================================

DROP POLICY IF EXISTS "Admins can insert project statuses" ON public.project_statuses;
CREATE POLICY "Admins can insert project statuses"
  ON public.project_statuses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can update project statuses" ON public.project_statuses;
CREATE POLICY "Admins can update project statuses"
  ON public.project_statuses
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can delete project statuses" ON public.project_statuses;
CREATE POLICY "Admins can delete project statuses"
  ON public.project_statuses
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- ========================================
-- الجزء 13: تحسين RLS Policies - Supplier Fields
-- ========================================

DROP POLICY IF EXISTS "Admins can insert supplier fields" ON public.supplier_fields;
CREATE POLICY "Admins can insert supplier fields"
  ON public.supplier_fields
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can update supplier fields" ON public.supplier_fields;
CREATE POLICY "Admins can update supplier fields"
  ON public.supplier_fields
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can delete supplier fields" ON public.supplier_fields;
CREATE POLICY "Admins can delete supplier fields"
  ON public.supplier_fields
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- ========================================
-- الجزء 14: تحسين RLS Policies - Equipment Categories
-- ========================================

DROP POLICY IF EXISTS "Admins can insert equipment categories" ON public.equipment_categories;
CREATE POLICY "Admins can insert equipment categories"
  ON public.equipment_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can update equipment categories" ON public.equipment_categories;
CREATE POLICY "Admins can update equipment categories"
  ON public.equipment_categories
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can delete equipment categories" ON public.equipment_categories;
CREATE POLICY "Admins can delete equipment categories"
  ON public.equipment_categories
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- ========================================
-- الجزء 15: تحسين RLS Policies - Equipment Catalog
-- ========================================

DROP POLICY IF EXISTS "Admins can insert equipment catalog" ON public.equipment_catalog;
CREATE POLICY "Admins can insert equipment catalog"
  ON public.equipment_catalog
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can update equipment catalog" ON public.equipment_catalog;
CREATE POLICY "Admins can update equipment catalog"
  ON public.equipment_catalog
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can delete equipment catalog" ON public.equipment_catalog;
CREATE POLICY "Admins can delete equipment catalog"
  ON public.equipment_catalog
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- ========================================
-- الجزء 16: تحسين RLS Policies - Purchase Orders
-- ========================================

DROP POLICY IF EXISTS "Users can insert purchase orders" ON public.purchase_orders;
CREATE POLICY "Users can insert purchase orders"
  ON public.purchase_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Users can update purchase orders" ON public.purchase_orders;
CREATE POLICY "Users can update purchase orders"
  ON public.purchase_orders
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Users can delete purchase orders" ON public.purchase_orders;
CREATE POLICY "Users can delete purchase orders"
  ON public.purchase_orders
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- ========================================
-- الجزء 17: تحسين RLS Policies - Production Tasks
-- ========================================

DROP POLICY IF EXISTS "Users can insert production tasks" ON public.production_tasks;
CREATE POLICY "Users can insert production tasks"
  ON public.production_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Users can update production tasks" ON public.production_tasks;
CREATE POLICY "Users can update production tasks"
  ON public.production_tasks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Users can delete production tasks" ON public.production_tasks;
CREATE POLICY "Users can delete production tasks"
  ON public.production_tasks
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- ========================================
-- الجزء 18: تحسين RLS Policies - Vendor Notifications
-- ========================================

DROP POLICY IF EXISTS "الموردون يمكنهم قراءة إشعاراتهم ا" ON public.vendor_notifications;
CREATE POLICY "الموردون يمكنهم قراءة إشعاراتهم ا"
  ON public.vendor_notifications
  FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.vendors
      WHERE vendors.id = vendor_notifications.vendor_id
      AND vendors.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "الموردون يمكنهم تحديث حالة القراء" ON public.vendor_notifications;
CREATE POLICY "الموردون يمكنهم تحديث حالة القراء"
  ON public.vendor_notifications
  FOR UPDATE
  TO authenticated
  USING (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.vendors
      WHERE vendors.id = vendor_notifications.vendor_id
      AND vendors.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.vendors
      WHERE vendors.id = vendor_notifications.vendor_id
      AND vendors.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "المسؤولون يمكنهم قراءة جميع الإشع" ON public.vendor_notifications;
CREATE POLICY "المسؤولون يمكنهم قراءة جميع الإشع"
  ON public.vendor_notifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "المسؤولون يمكنهم إنشاء إشعارات" ON public.vendor_notifications;
CREATE POLICY "المسؤولون يمكنهم إنشاء إشعارات"
  ON public.vendor_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- ========================================
-- الجزء 19: تحسين RLS Policies - Vendor Fields
-- ========================================

DROP POLICY IF EXISTS "Admins can manage vendor fields" ON public.vendor_fields;
CREATE POLICY "Admins can manage vendor fields"
  ON public.vendor_fields
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- ========================================
-- الجزء 20: تحسين RLS Policies - Vendor Selected Fields
-- ========================================

DROP POLICY IF EXISTS "Vendors can view own selected fields" ON public.vendor_selected_fields;
CREATE POLICY "Vendors can view own selected fields"
  ON public.vendor_selected_fields
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vendors
      WHERE vendors.id = vendor_selected_fields.vendor_id
      AND vendors.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can manage vendor selected fields" ON public.vendor_selected_fields;
CREATE POLICY "Admins can manage vendor selected fields"
  ON public.vendor_selected_fields
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- ========================================
-- الجزء 21: تحسين RLS Policies - Vendor Registration Drafts
-- ========================================

DROP POLICY IF EXISTS "Users can read own drafts by session" ON public.vendor_registration_drafts;
CREATE POLICY "Users can read own drafts by session"
  ON public.vendor_registration_drafts
  FOR SELECT
  USING (session_id = current_setting('request.headers', true)::json->>'x-session-id');

DROP POLICY IF EXISTS "Users can update own drafts by session" ON public.vendor_registration_drafts;
CREATE POLICY "Users can update own drafts by session"
  ON public.vendor_registration_drafts
  FOR UPDATE
  USING (session_id = current_setting('request.headers', true)::json->>'x-session-id')
  WITH CHECK (session_id = current_setting('request.headers', true)::json->>'x-session-id');

-- ========================================
-- الجزء 22: إصلاح Policies التي تسمح بوصول غير محدود - Vendors
-- ========================================

DROP POLICY IF EXISTS "Users can insert vendors" ON public.vendors;
CREATE POLICY "Users can insert vendors"
  ON public.vendors
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Users can update vendors" ON public.vendors;
CREATE POLICY "Users can update vendors"
  ON public.vendors
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    ) OR
    user_id = (select auth.uid())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    ) OR
    user_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete vendors" ON public.vendors;
CREATE POLICY "Users can delete vendors"
  ON public.vendors
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- ========================================
-- الجزء 23: إصلاح Policies - Vendor Equipment
-- ========================================

DROP POLICY IF EXISTS "Users can insert vendor equipment" ON public.vendor_equipment;
CREATE POLICY "Users can insert vendor equipment"
  ON public.vendor_equipment
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    ) OR
    EXISTS (
      SELECT 1 FROM public.vendors
      WHERE vendors.id = vendor_equipment.vendor_id
      AND vendors.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update vendor equipment" ON public.vendor_equipment;
CREATE POLICY "Users can update vendor equipment"
  ON public.vendor_equipment
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    ) OR
    EXISTS (
      SELECT 1 FROM public.vendors
      WHERE vendors.id = vendor_equipment.vendor_id
      AND vendors.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    ) OR
    EXISTS (
      SELECT 1 FROM public.vendors
      WHERE vendors.id = vendor_equipment.vendor_id
      AND vendors.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete vendor equipment" ON public.vendor_equipment;
CREATE POLICY "Users can delete vendor equipment"
  ON public.vendor_equipment
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    ) OR
    EXISTS (
      SELECT 1 FROM public.vendors
      WHERE vendors.id = vendor_equipment.vendor_id
      AND vendors.user_id = (select auth.uid())
    )
  );

-- ========================================
-- الجزء 24: إصلاح Policies - Vendor Financial Data
-- ========================================

DROP POLICY IF EXISTS "Users can insert vendor financial data" ON public.vendor_financial_data;
CREATE POLICY "Users can insert vendor financial data"
  ON public.vendor_financial_data
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    ) OR
    EXISTS (
      SELECT 1 FROM public.vendors
      WHERE vendors.id = vendor_financial_data.vendor_id
      AND vendors.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update vendor financial data" ON public.vendor_financial_data;
CREATE POLICY "Users can update vendor financial data"
  ON public.vendor_financial_data
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    ) OR
    EXISTS (
      SELECT 1 FROM public.vendors
      WHERE vendors.id = vendor_financial_data.vendor_id
      AND vendors.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    ) OR
    EXISTS (
      SELECT 1 FROM public.vendors
      WHERE vendors.id = vendor_financial_data.vendor_id
      AND vendors.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete vendor financial data" ON public.vendor_financial_data;
CREATE POLICY "Users can delete vendor financial data"
  ON public.vendor_financial_data
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- ========================================
-- الجزء 25: إصلاح Policies - Vendor Documents
-- ========================================

DROP POLICY IF EXISTS "Users can insert vendor documents" ON public.vendor_documents;
CREATE POLICY "Users can insert vendor documents"
  ON public.vendor_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Users can update vendor documents" ON public.vendor_documents;
CREATE POLICY "Users can update vendor documents"
  ON public.vendor_documents
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Users can delete vendor documents" ON public.vendor_documents;
CREATE POLICY "Users can delete vendor documents"
  ON public.vendor_documents
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- ========================================
-- الجزء 26: إصلاح Policies - Vendor Travel Documents
-- ========================================

DROP POLICY IF EXISTS "Users can insert vendor travel documents" ON public.vendor_travel_documents;
CREATE POLICY "Users can insert vendor travel documents"
  ON public.vendor_travel_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    ) OR
    EXISTS (
      SELECT 1 FROM public.vendors
      WHERE vendors.id = vendor_travel_documents.vendor_id
      AND vendors.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update vendor travel documents" ON public.vendor_travel_documents;
CREATE POLICY "Users can update vendor travel documents"
  ON public.vendor_travel_documents
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    ) OR
    EXISTS (
      SELECT 1 FROM public.vendors
      WHERE vendors.id = vendor_travel_documents.vendor_id
      AND vendors.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    ) OR
    EXISTS (
      SELECT 1 FROM public.vendors
      WHERE vendors.id = vendor_travel_documents.vendor_id
      AND vendors.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete vendor travel documents" ON public.vendor_travel_documents;
CREATE POLICY "Users can delete vendor travel documents"
  ON public.vendor_travel_documents
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- ========================================
-- الجزء 27: إصلاح Policies - Vendor Invoices
-- ========================================

DROP POLICY IF EXISTS "Users can insert vendor invoices" ON public.vendor_invoices;
CREATE POLICY "Users can insert vendor invoices"
  ON public.vendor_invoices
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Users can update vendor invoices" ON public.vendor_invoices;
CREATE POLICY "Users can update vendor invoices"
  ON public.vendor_invoices
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Users can delete vendor invoices" ON public.vendor_invoices;
CREATE POLICY "Users can delete vendor invoices"
  ON public.vendor_invoices
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- ========================================
-- الجزء 28: إصلاح Policies - Task PO Allocations
-- ========================================

DROP POLICY IF EXISTS "Users can insert task allocations" ON public.task_po_allocations;
CREATE POLICY "Users can insert task allocations"
  ON public.task_po_allocations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Users can update task allocations" ON public.task_po_allocations;
CREATE POLICY "Users can update task allocations"
  ON public.task_po_allocations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Users can delete task allocations" ON public.task_po_allocations;
CREATE POLICY "Users can delete task allocations"
  ON public.task_po_allocations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- ========================================
-- الجزء 29: إصلاح Policies - PO Settings
-- ========================================

DROP POLICY IF EXISTS "Users can update PO settings" ON public.po_settings;
CREATE POLICY "Users can update PO settings"
  ON public.po_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- ========================================
-- الجزء 30: إصلاح Policies - Settings Config
-- ========================================

DROP POLICY IF EXISTS "المستخدمون المصادق عليهم يمكنهم إ" ON public.settings_config;
CREATE POLICY "المستخدمون المصادق عليهم يمكنهم إ"
  ON public.settings_config
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "المستخدمون المصادق عليهم يمكنهم ت" ON public.settings_config;
CREATE POLICY "المستخدمون المصادق عليهم يمكنهم ت"
  ON public.settings_config
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- ========================================
-- الجزء 31: إصلاح Policies - Banks
-- ========================================

DROP POLICY IF EXISTS "المستخدمون المصادق عليهم يمكنهم إ" ON public.banks;
CREATE POLICY "المستخدمون المصادق عليهم يمكنهم إ"
  ON public.banks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "المستخدمون المصادق عليهم يمكنهم ت" ON public.banks;
CREATE POLICY "المستخدمون المصادق عليهم يمكنهم ت"
  ON public.banks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "المستخدمون المصادق عليهم يمكنهم ح" ON public.banks;
CREATE POLICY "المستخدمون المصادق عليهم يمكنهم ح"
  ON public.banks
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- ========================================
-- الجزء 32: إصلاح Policies - Brand Categories
-- ========================================

DROP POLICY IF EXISTS "Authenticated users can insert brand categories" ON public.brand_categories;
CREATE POLICY "Authenticated users can insert brand categories"
  ON public.brand_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Authenticated users can delete brand categories" ON public.brand_categories;
CREATE POLICY "Authenticated users can delete brand categories"
  ON public.brand_categories
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- ========================================
-- الجزء 33: إصلاح Policies - Cities
-- ========================================

DROP POLICY IF EXISTS "Authenticated users can insert cities" ON public.cities;
CREATE POLICY "Authenticated users can insert cities"
  ON public.cities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Authenticated users can update cities" ON public.cities;
CREATE POLICY "Authenticated users can update cities"
  ON public.cities
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- ========================================
-- الجزء 34: إصلاح Policies - Equipment Brands
-- ========================================

DROP POLICY IF EXISTS "Authenticated users can insert brands" ON public.equipment_brands;
CREATE POLICY "Authenticated users can insert brands"
  ON public.equipment_brands
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Authenticated users can update brands" ON public.equipment_brands;
CREATE POLICY "Authenticated users can update brands"
  ON public.equipment_brands
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Authenticated users can delete brands" ON public.equipment_brands;
CREATE POLICY "Authenticated users can delete brands"
  ON public.equipment_brands
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- ========================================
-- الجزء 35: إصلاح Policies - Activation Tokens
-- ========================================

DROP POLICY IF EXISTS "المسؤولون يمكنهم إنشاء رموز التفع" ON public.activation_tokens;
CREATE POLICY "المسؤولون يمكنهم إنشاء رموز التفع"
  ON public.activation_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "يمكن تحديث رموز التفعيل عند الاستخ" ON public.activation_tokens;
CREATE POLICY "يمكن تحديث رموز التفعيل عند الاستخ"
  ON public.activation_tokens
  FOR UPDATE
  USING (used = false AND expires_at > now())
  WITH CHECK (used = false AND expires_at > now());

-- ========================================
-- الجزء 36: إصلاح Policies - Vendor Activity Log
-- ========================================

-- vendor_activity_log is created in a LATER migration; guard for from-scratch replay.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='vendor_activity_log') THEN
    DROP POLICY IF EXISTS "المسؤولون يمكنهم إنشاء سجلات أنشط" ON public.vendor_activity_log;
    CREATE POLICY "المسؤولون يمكنهم إنشاء سجلات أنشط"
      ON public.vendor_activity_log
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = (select auth.uid())
          AND users.role IN ('admin', 'super_admin')
        )
      );
  END IF;
END $$;

-- ========================================
-- الجزء 37: إصلاح Policies - Vendor Registration Drafts (Public)
-- ========================================

DROP POLICY IF EXISTS "Anyone can create vendor registration drafts" ON public.vendor_registration_drafts;
CREATE POLICY "Anyone can create vendor registration drafts"
  ON public.vendor_registration_drafts
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete own drafts" ON public.vendor_registration_drafts;
CREATE POLICY "Users can delete own drafts"
  ON public.vendor_registration_drafts
  FOR DELETE
  USING (session_id = current_setting('request.headers', true)::json->>'x-session-id');

-- ========================================
-- الجزء 38: تحديث Functions مع Search Path الآمن
-- ========================================

CREATE OR REPLACE FUNCTION public.delete_expired_vendor_drafts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.vendor_registration_drafts
  WHERE expires_at < now();
END;
$$;

CREATE OR REPLACE FUNCTION public.update_po_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.remaining_amount <= 0 THEN
    NEW.status := 'full';
  ELSIF NEW.remaining_amount <= (NEW.total_amount * 0.2) THEN
    NEW.status := 'near_full';
  ELSE
    NEW.status := 'active';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_po_used_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.purchase_orders
  SET used_amount = (
    SELECT COALESCE(SUM(amount), 0)
    FROM public.task_po_allocations
    WHERE po_id = NEW.po_id
  )
  WHERE id = NEW.po_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_task_allocated_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.production_tasks
  SET allocated_amount = (
    SELECT COALESCE(SUM(amount), 0)
    FROM public.task_po_allocations
    WHERE task_id = NEW.task_id
  )
  WHERE id = NEW.task_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_activity(
  p_project_id uuid,
  p_action_type text,
  p_action_details jsonb DEFAULT NULL,
  p_old_value text DEFAULT NULL,
  p_new_value text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.activity_logs (project_id, user_id, action_type, action_details, old_value, new_value)
  VALUES (p_project_id, auth.uid(), p_action_type, p_action_details, p_old_value, p_new_value);
END;
$$;

CREATE OR REPLACE FUNCTION public.log_project_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.log_activity(
      NEW.id,
      'status_change',
      jsonb_build_object('from', OLD.status, 'to', NEW.status),
      OLD.status,
      NEW.status
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_project_item_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_activity(
      NEW.project_id,
      'item_added',
      jsonb_build_object('item_name', NEW.name, 'quantity', NEW.quantity, 'unit_price', NEW.unit_price)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_activity(
      NEW.project_id,
      'item_updated',
      jsonb_build_object('item_name', NEW.name, 'changes', jsonb_build_object('quantity', NEW.quantity, 'unit_price', NEW.unit_price))
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_activity(
      OLD.project_id,
      'item_removed',
      jsonb_build_object('item_name', OLD.name)
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.log_project_file_upload()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.log_activity(
    NEW.project_id,
    'file_uploaded',
    jsonb_build_object('file_name', NEW.file_name, 'file_type', NEW.file_type)
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_invoice_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.log_activity(
    NEW.project_id,
    'invoice_created',
    jsonb_build_object('invoice_number', NEW.invoice_number, 'amount', NEW.total_amount)
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  next_number integer;
  invoice_num text;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '[0-9]+$') AS integer)), 0) + 1
  INTO next_number
  FROM public.invoices;
  
  invoice_num := 'INV-' || LPAD(next_number::text, 6, '0');
  RETURN invoice_num;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_project_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  next_number integer;
  project_code text;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(project_code FROM '[0-9]+$') AS integer)), 0) + 1
  INTO next_number
  FROM public.projects;
  
  project_code := 'PRJ-' || LPAD(next_number::text, 6, '0');
  RETURN project_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_project_total_from_items()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.projects
  SET total_price = (
    SELECT COALESCE(SUM(total_price), 0)
    FROM public.project_items
    WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
  )
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;
