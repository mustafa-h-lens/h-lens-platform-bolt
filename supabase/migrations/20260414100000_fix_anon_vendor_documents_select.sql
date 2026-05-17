/*
  # Fix anon SELECT on vendor_documents

  The old policy restricted reads to vendors with status = 'draft'.
  Vendors in revision_requested / active status could not see their own documents.

  1. Changes
    - Drop restrictive "during registration" SELECT policy
    - Add unrestricted anon SELECT policy on vendor_documents
*/

DROP POLICY IF EXISTS "Anon can view vendor documents during registration" ON public.vendor_documents;
DROP POLICY IF EXISTS "Anon can view vendor_documents" ON public.vendor_documents;
CREATE POLICY "Anon can view vendor_documents" ON public.vendor_documents FOR SELECT TO anon USING (true);
