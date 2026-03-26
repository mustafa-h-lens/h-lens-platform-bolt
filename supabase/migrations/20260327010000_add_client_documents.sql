-- ============================================================
-- Client Documents Management
-- Store and manage client documents (commercial registration,
-- tax certificate, national address, contracts, etc.)
-- ============================================================

-- 1. Create client_documents table
CREATE TABLE IF NOT EXISTS public.client_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  expiry_date date,
  notes text,
  uploaded_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_client_documents_client_id
ON public.client_documents(client_id);

-- 3. Enable RLS
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies
CREATE POLICY "Admins can view client documents"
  ON public.client_documents FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can manage client documents"
  ON public.client_documents FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5. Create storage bucket for client documents (reuse existing if available)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-documents',
  'client-documents',
  true,
  52428800,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip', 'application/x-rar-compressed',
    'text/plain', 'text/csv'
  ]
) ON CONFLICT (id) DO NOTHING;

-- 6. Storage policies
CREATE POLICY "Public read client documents"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'client-documents');

CREATE POLICY "Authenticated upload client documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'client-documents');

CREATE POLICY "Authenticated update client documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'client-documents');

CREATE POLICY "Authenticated delete client documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'client-documents');
