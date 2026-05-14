/*
  # Fix vendor_documents constraint to support all travel document types

  1. Changes
    - Drop the existing CHECK constraint on vendor_documents.document_type
    - Add a new CHECK constraint that includes all travel document types:
      - passport (جواز سفر)
      - visa_usa (تأشيرة أمريكا)
      - visa_uk (تأشيرة بريطانيا)
      - visa_schengen (تأشيرة شنغن)
      - visa_japan (تأشيرة اليابان)
      - contract (عقد)
      - nda (اتفاقية سرية)
      - certificate (شهادة)
      - other (أخرى - يمكن أن يكون بصيغة "other:اسم_مخصص")

  2. Security
    - No changes to RLS policies

  3. Notes
    - This migration fixes the constraint violation when vendors upload travel documents
    - The document_type can now include specific visa types instead of just generic "visa"
*/

-- Drop the existing constraint
ALTER TABLE vendor_documents
DROP CONSTRAINT IF EXISTS vendor_documents_document_type_check;

-- Add the new constraint with all supported document types
ALTER TABLE vendor_documents DROP CONSTRAINT IF EXISTS vendor_documents_document_type_check;
ALTER TABLE vendor_documents ADD CONSTRAINT vendor_documents_document_type_check
CHECK (
  document_type IN (
    'passport',
    'visa_usa',
    'visa_uk',
    'visa_schengen',
    'visa_japan',
    'contract',
    'nda',
    'certificate'
  ) OR
  document_type LIKE 'other:%' OR
  document_type = 'other'
);