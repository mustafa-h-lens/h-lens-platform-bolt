/*
  # Remove duplicate banks

  1. Changes
    - Merge duplicate bank entries
    - Update foreign key references to point to the kept bank
    - Remove duplicate entries

  2. Notes
    - Keeps the older bank entries and removes the newer duplicates
    - Maintains data integrity by updating all foreign key references
*/

-- Update vendor_financial_data to use the original banks before deleting duplicates
-- Al Rajhi Bank: keep 6d76bbbb-9438-4f2f-8f35-5bcc538ba387, remove a80e26a9-46c6-4aa2-aea7-0e4b9158fb83
UPDATE vendor_financial_data 
SET bank_id = '6d76bbbb-9438-4f2f-8f35-5bcc538ba387' 
WHERE bank_id = 'a80e26a9-46c6-4aa2-aea7-0e4b9158fb83';

-- Riyad Bank: keep 0b188a8e-3d2d-45b8-ae8c-6c16bad13336, remove 9469d7d4-4926-430c-b9f1-ccda9d1c6dbd
UPDATE vendor_financial_data 
SET bank_id = '0b188a8e-3d2d-45b8-ae8c-6c16bad13336' 
WHERE bank_id = '9469d7d4-4926-430c-b9f1-ccda9d1c6dbd';

-- Alinma Bank: keep 6654a6f5-9ed8-4a5f-aaa0-6ca83d19c099, remove 1afb7713-eb44-45c5-a0ba-dc3ed6a1a01d
UPDATE vendor_financial_data 
SET bank_id = '6654a6f5-9ed8-4a5f-aaa0-6ca83d19c099' 
WHERE bank_id = '1afb7713-eb44-45c5-a0ba-dc3ed6a1a01d';

-- Bank Albilad: keep 49acad75-5aaf-4375-acee-1ecb58f8792b, remove 8946a33c-f303-4f8f-b7c5-e1ee96b9d1b5
UPDATE vendor_financial_data 
SET bank_id = '49acad75-5aaf-4375-acee-1ecb58f8792b' 
WHERE bank_id = '8946a33c-f303-4f8f-b7c5-e1ee96b9d1b5';

-- Bank Aljazira: keep a26a2d4c-23a4-41f4-bec6-cb78f3789585, remove 367a9373-eb5f-4153-9191-8b6641668db8
UPDATE vendor_financial_data 
SET bank_id = 'a26a2d4c-23a4-41f4-bec6-cb78f3789585' 
WHERE bank_id = '367a9373-eb5f-4153-9191-8b6641668db8';

-- Now delete the duplicate banks
DELETE FROM banks WHERE id IN (
  '483583b8-dece-4fc3-b9d6-190fd395acb9', -- SNB (duplicate of Al Ahli Bank)
  'a80e26a9-46c6-4aa2-aea7-0e4b9158fb83', -- Al Rajhi Bank duplicate
  '9469d7d4-4926-430c-b9f1-ccda9d1c6dbd', -- Riyad Bank duplicate
  '3bdf4048-808d-40fa-a312-2f4804322f90', -- SABB (new entry)
  '36b0af6d-36a2-4484-84c0-bc3e8d7f3e41', -- BSF (duplicate of Banque Saudi Fransi)
  '8946a33c-f303-4f8f-b7c5-e1ee96b9d1b5', -- Bank AlBilad duplicate
  '367a9373-eb5f-4153-9191-8b6641668db8', -- Bank AlJazira duplicate
  '1afb7713-eb44-45c5-a0ba-dc3ed6a1a01d', -- Alinma Bank duplicate
  'cecfd3f5-8477-4174-bfe7-264a809939c5', -- ANB (duplicate of Arab National Bank)
  '48d80212-d0f4-4267-8294-5f353ecd24b2', -- SAIB duplicate
  '4de9e4e6-f8ef-4af8-ac2f-1ec52f55ae19', -- GIB (new entry)
  '6d5425f1-131d-4328-b3d9-dfbdd384c242'  -- SAB First (duplicate)
);

-- Drop the duplicate policies
DROP POLICY IF EXISTS "Anyone can read banks" ON banks;
DROP POLICY IF EXISTS "Anyone can read vendor fields" ON vendor_fields;
