-- ============================================================
-- Configurable Client Document Types
-- Admin can manage document types from Settings
-- ============================================================

-- 1. Create client_document_types table
CREATE TABLE IF NOT EXISTS public.client_document_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.client_document_types ENABLE ROW LEVEL SECURITY;

-- 3. Everyone can read active types
CREATE POLICY "Authenticated users can view client document types"
  ON public.client_document_types FOR SELECT
  TO authenticated
  USING (true);

-- 4. Only admins can manage
CREATE POLICY "Admins can manage client document types"
  ON public.client_document_types FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5. Seed default document types
INSERT INTO public.client_document_types (name, description, display_order) VALUES
  ('السجل التجاري', 'وثيقة تسجيل الشركة التجاري', 1),
  ('شهادة ضريبة القيمة المضافة', 'شهادة التسجيل في ضريبة القيمة المضافة', 2),
  ('العنوان الوطني', 'شهادة العنوان الوطني للمنشأة', 3),
  ('خطاب تفويض', 'خطاب تفويض الممثل المعتمد', 4),
  ('شهادة بنكية', 'شهادة الحساب البنكي للمنشأة', 5),
  ('عقد / اتفاقية', 'عقد أو اتفاقية موقعة', 6),
  ('اتفاقية سرية (NDA)', 'اتفاقية عدم الإفصاح', 7),
  ('أخرى', 'مستندات أخرى', 8)
ON CONFLICT (name) DO NOTHING;

-- 6. Migrate client_documents.document_type from text to FK
-- Add document_type_id column
ALTER TABLE public.client_documents
ADD COLUMN IF NOT EXISTS document_type_id uuid REFERENCES public.client_document_types(id) ON DELETE SET NULL;

-- 7. Updated_at trigger
CREATE TRIGGER client_document_types_updated_at
  BEFORE UPDATE ON public.client_document_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_roles_updated_at();
