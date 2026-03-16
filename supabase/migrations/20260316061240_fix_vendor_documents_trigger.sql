/*
  # Fix broken vendor_documents trigger

  ## Problem
  The trigger `vendor_document_changes_trigger` on `vendor_documents` inserts a null value
  into `vendor_activity_log.action`, which violates a NOT NULL constraint and blocks all
  document uploads/changes.

  ## Fix
  Drop the broken trigger. Activity logging for vendor documents can be re-added later
  with a correct implementation.
*/

DROP TRIGGER IF EXISTS vendor_document_changes_trigger ON public.vendor_documents;
