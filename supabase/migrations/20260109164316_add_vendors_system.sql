/*
  # إضافة نظام الموردين الكامل

  ## الجداول الجديدة
  
  ### 1. vendors (الموردين)
  - `id` (uuid, primary key)
  - `full_name` (text) - الاسم الكامل
  - `phone` (text) - رقم الجوال
  - `email` (text, optional) - البريد الإلكتروني
  - `profile_image` (text, optional) - صورة شخصية
  - `id_number` (text, optional) - رقم الهوية
  - `id_expiry_date` (date, optional) - تاريخ انتهاء الهوية
  - `nationality` (text, optional) - الجنسية
  - `primary_city` (text, optional) - مدينة العمل الأساسية
  - `available_other_cities` (boolean) - متاح للعمل في مدن أخرى
  - `other_cities` (text[], optional) - المدن الأخرى
  - `status` (text) - الحالة (active/inactive/blocked)
  - `internal_notes` (text, optional) - ملاحظات داخلية
  - `primary_field` (text, optional) - المجال الأساسي
  - `created_at` (timestamptz)
  - `created_by` (uuid, foreign key to users)
  - `updated_at` (timestamptz)

  ### 2. vendor_travel_documents (بيانات السفر)
  - `id` (uuid, primary key)
  - `vendor_id` (uuid, foreign key to vendors)
  - `document_type` (text) - passport/visa
  - `passport_number` (text, optional)
  - `passport_issuing_country` (text, optional)
  - `passport_issue_date` (date, optional)
  - `passport_expiry_date` (date, optional)
  - `passport_file` (text, optional)
  - `visa_country` (text, optional)
  - `visa_type` (text, optional)
  - `visa_start_date` (date, optional)
  - `visa_expiry_date` (date, optional)
  - `visa_file` (text, optional)
  - `visa_status` (text, optional) - valid/expired/expiring_soon
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. vendor_equipment (المعدات)
  - `id` (uuid, primary key)
  - `vendor_id` (uuid, foreign key to vendors)
  - `name` (text) - اسم المعدة
  - `type` (text) - النوع
  - `image` (text, optional) - صورة
  - `serial_number` (text, optional) - الرقم التسلسلي
  - `notes` (text, optional) - ملاحظات
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 4. vendor_financial_data (البيانات المالية)
  - `id` (uuid, primary key)
  - `vendor_id` (uuid, foreign key to vendors)
  - `payment_method` (text) - bank_transfer/cash/other
  - `price_includes_tax` (boolean) - السعر بضريبة أو بدون
  - `bank_name` (text, optional) - اسم البنك
  - `beneficiary_name` (text, optional) - اسم المستفيد
  - `iban` (text, optional) - رقم الآيبان
  - `account_number` (text, optional) - رقم الحساب
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 5. vendor_documents (المستندات)
  - `id` (uuid, primary key)
  - `vendor_id` (uuid, foreign key to vendors)
  - `document_type` (text) - contract/nda/certificate/other
  - `file_url` (text) - رابط الملف
  - `file_name` (text) - اسم الملف
  - `uploaded_by` (uuid, foreign key to users)
  - `created_at` (timestamptz)

  ### 6. vendor_invoices (فواتير الموردين)
  - `id` (uuid, primary key)
  - `vendor_id` (uuid, foreign key to vendors)
  - `project_id` (uuid, foreign key to projects)
  - `client_id` (uuid, foreign key to clients)
  - `amount_total` (decimal)
  - `amount_paid` (decimal)
  - `amount_remaining` (decimal)
  - `status` (text) - pending/partial/paid/overdue
  - `due_date` (date, optional)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## الأمان
  - تفعيل RLS لجميع الجداول
  - صلاحيات القراءة والكتابة للمستخدمين المصادق عليهم
*/

-- إنشاء جدول الموردين
CREATE TABLE IF NOT EXISTS vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  profile_image text,
  id_number text,
  id_expiry_date date,
  nationality text,
  primary_city text,
  available_other_cities boolean DEFAULT false,
  other_cities text[],
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  internal_notes text,
  primary_field text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id),
  updated_at timestamptz DEFAULT now()
);

-- إنشاء جدول بيانات السفر
CREATE TABLE IF NOT EXISTS vendor_travel_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendors(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('passport', 'visa')),
  passport_number text,
  passport_issuing_country text,
  passport_issue_date date,
  passport_expiry_date date,
  passport_file text,
  visa_country text,
  visa_type text,
  visa_start_date date,
  visa_expiry_date date,
  visa_file text,
  visa_status text CHECK (visa_status IN ('valid', 'expired', 'expiring_soon')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- إنشاء جدول المعدات
CREATE TABLE IF NOT EXISTS vendor_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendors(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL,
  image text,
  serial_number text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- إنشاء جدول البيانات المالية
CREATE TABLE IF NOT EXISTS vendor_financial_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendors(id) ON DELETE CASCADE,
  payment_method text DEFAULT 'bank_transfer' CHECK (payment_method IN ('bank_transfer', 'cash', 'other')),
  price_includes_tax boolean DEFAULT false,
  bank_name text,
  beneficiary_name text,
  iban text,
  account_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- إنشاء جدول المستندات
CREATE TABLE IF NOT EXISTS vendor_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendors(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('contract', 'nda', 'certificate', 'other')),
  file_url text NOT NULL,
  file_name text NOT NULL,
  uploaded_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- إنشاء جدول فواتير الموردين
CREATE TABLE IF NOT EXISTS vendor_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendors(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id),
  amount_total decimal(10, 2) DEFAULT 0,
  amount_paid decimal(10, 2) DEFAULT 0,
  amount_remaining decimal(10, 2) DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue')),
  due_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_travel_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_financial_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_invoices ENABLE ROW LEVEL SECURITY;

-- سياسات vendors
DROP POLICY IF EXISTS "Users can view all vendors" ON vendors;
CREATE POLICY "Users can view all vendors" ON vendors FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert vendors" ON vendors;
CREATE POLICY "Users can insert vendors" ON vendors FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update vendors" ON vendors;
CREATE POLICY "Users can update vendors" ON vendors FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can delete vendors" ON vendors;
CREATE POLICY "Users can delete vendors" ON vendors FOR DELETE
  TO authenticated
  USING (true);

-- سياسات vendor_travel_documents
DROP POLICY IF EXISTS "Users can view vendor travel documents" ON vendor_travel_documents;
CREATE POLICY "Users can view vendor travel documents" ON vendor_travel_documents FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert vendor travel documents" ON vendor_travel_documents;
CREATE POLICY "Users can insert vendor travel documents" ON vendor_travel_documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update vendor travel documents" ON vendor_travel_documents;
CREATE POLICY "Users can update vendor travel documents" ON vendor_travel_documents FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can delete vendor travel documents" ON vendor_travel_documents;
CREATE POLICY "Users can delete vendor travel documents" ON vendor_travel_documents FOR DELETE
  TO authenticated
  USING (true);

-- سياسات vendor_equipment
DROP POLICY IF EXISTS "Users can view vendor equipment" ON vendor_equipment;
CREATE POLICY "Users can view vendor equipment" ON vendor_equipment FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert vendor equipment" ON vendor_equipment;
CREATE POLICY "Users can insert vendor equipment" ON vendor_equipment FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update vendor equipment" ON vendor_equipment;
CREATE POLICY "Users can update vendor equipment" ON vendor_equipment FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can delete vendor equipment" ON vendor_equipment;
CREATE POLICY "Users can delete vendor equipment" ON vendor_equipment FOR DELETE
  TO authenticated
  USING (true);

-- سياسات vendor_financial_data
DROP POLICY IF EXISTS "Users can view vendor financial data" ON vendor_financial_data;
CREATE POLICY "Users can view vendor financial data" ON vendor_financial_data FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert vendor financial data" ON vendor_financial_data;
CREATE POLICY "Users can insert vendor financial data" ON vendor_financial_data FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update vendor financial data" ON vendor_financial_data;
CREATE POLICY "Users can update vendor financial data" ON vendor_financial_data FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can delete vendor financial data" ON vendor_financial_data;
CREATE POLICY "Users can delete vendor financial data" ON vendor_financial_data FOR DELETE
  TO authenticated
  USING (true);

-- سياسات vendor_documents
DROP POLICY IF EXISTS "Users can view vendor documents" ON vendor_documents;
CREATE POLICY "Users can view vendor documents" ON vendor_documents FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert vendor documents" ON vendor_documents;
CREATE POLICY "Users can insert vendor documents" ON vendor_documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update vendor documents" ON vendor_documents;
CREATE POLICY "Users can update vendor documents" ON vendor_documents FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can delete vendor documents" ON vendor_documents;
CREATE POLICY "Users can delete vendor documents" ON vendor_documents FOR DELETE
  TO authenticated
  USING (true);

-- سياسات vendor_invoices
DROP POLICY IF EXISTS "Users can view vendor invoices" ON vendor_invoices;
CREATE POLICY "Users can view vendor invoices" ON vendor_invoices FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert vendor invoices" ON vendor_invoices;
CREATE POLICY "Users can insert vendor invoices" ON vendor_invoices FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update vendor invoices" ON vendor_invoices;
CREATE POLICY "Users can update vendor invoices" ON vendor_invoices FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can delete vendor invoices" ON vendor_invoices;
CREATE POLICY "Users can delete vendor invoices" ON vendor_invoices FOR DELETE
  TO authenticated
  USING (true);

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors(status);
CREATE INDEX IF NOT EXISTS idx_vendors_created_by ON vendors(created_by);
CREATE INDEX IF NOT EXISTS idx_vendor_travel_documents_vendor_id ON vendor_travel_documents(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_equipment_vendor_id ON vendor_equipment(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_financial_data_vendor_id ON vendor_financial_data(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_documents_vendor_id ON vendor_documents(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_invoices_vendor_id ON vendor_invoices(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_invoices_project_id ON vendor_invoices(project_id);
