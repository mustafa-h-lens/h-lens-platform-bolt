/*
  # Allow anon to read equipment catalog tables

  The vendor portal uses the anon key (vendors authenticate via custom OTP sessions,
  not Supabase auth). They need to read the equipment catalog to add their equipment.

  1. Changes
    - Add SELECT policies for anon on equipment_categories, equipment_brands, equipment_catalog
    - Only active items are readable (enforced by app queries, not RLS, for simplicity)

  2. Security
    - Read-only access for anon
    - Write operations remain admin-only (authenticated users)
*/

-- equipment_categories: allow anon to read
DROP POLICY IF EXISTS "Anon can read equipment_categories" ON public.equipment_categories;
CREATE POLICY "Anon can read equipment_categories" ON public.equipment_categories FOR SELECT
  TO anon
  USING (true);

-- equipment_brands: allow anon to read
DROP POLICY IF EXISTS "Anon can read equipment_brands" ON public.equipment_brands;
CREATE POLICY "Anon can read equipment_brands" ON public.equipment_brands FOR SELECT
  TO anon
  USING (true);

-- equipment_catalog: allow anon to read
DROP POLICY IF EXISTS "Anon can read equipment_catalog" ON public.equipment_catalog;
CREATE POLICY "Anon can read equipment_catalog" ON public.equipment_catalog FOR SELECT
  TO anon
  USING (true);

-- brand_categories: allow anon to read (needed for filtering brands by category)
DROP POLICY IF EXISTS "Anon can read brand_categories" ON public.brand_categories;
CREATE POLICY "Anon can read brand_categories" ON public.brand_categories FOR SELECT
  TO anon
  USING (true);
