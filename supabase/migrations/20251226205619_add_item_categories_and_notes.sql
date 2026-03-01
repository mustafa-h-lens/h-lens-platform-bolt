/*
  # Add Item Categories and Notes to Project Items

  1. New Tables
    - `item_categories`
      - `id` (uuid, primary key)
      - `name` (text, unique) - Category name
      - `description` (text, nullable) - Category description
      - `is_active` (boolean, default true) - Whether category is active
      - `created_by` (uuid) - User who created the category
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Changes to Existing Tables
    - Add `category_id` (uuid, nullable) to `project_items` - References item_categories
    - Add `notes` (text, nullable) to `project_items` - Item-specific notes

  3. Security
    - Enable RLS on `item_categories` table
    - Add policies for authenticated admins to manage categories
    - Add policies for authenticated users to read categories

  4. Default Data
    - Add default item categories for common use cases
*/

-- Create item_categories table
CREATE TABLE IF NOT EXISTS item_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add category_id and notes to project_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_items' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE project_items ADD COLUMN category_id uuid REFERENCES item_categories(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_items' AND column_name = 'notes'
  ) THEN
    ALTER TABLE project_items ADD COLUMN notes text;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE item_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can read active categories" ON item_categories;
DROP POLICY IF EXISTS "Admins can insert categories" ON item_categories;
DROP POLICY IF EXISTS "Admins can update categories" ON item_categories;
DROP POLICY IF EXISTS "Admins can delete categories" ON item_categories;

-- Policies for item_categories

-- Authenticated users can read active categories
CREATE POLICY "Authenticated users can read active categories"
  ON item_categories FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Admins can insert categories
CREATE POLICY "Admins can insert categories"
  ON item_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Admins can update categories
CREATE POLICY "Admins can update categories"
  ON item_categories FOR UPDATE
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

-- Admins can delete categories
CREATE POLICY "Admins can delete categories"
  ON item_categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Insert default categories
-- Note: This will only insert if no categories exist yet
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Get first admin user
  SELECT id INTO admin_user_id
  FROM users
  WHERE role IN ('admin', 'super_admin')
  LIMIT 1;

  -- Only insert if we found an admin and no categories exist
  IF admin_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM item_categories LIMIT 1) THEN
    INSERT INTO item_categories (name, description, created_by) VALUES
      ('تطوير', 'بنود خاصة بالتطوير البرمجي', admin_user_id),
      ('تصميم', 'بنود خاصة بالتصميم الجرافيكي وواجهات المستخدم', admin_user_id),
      ('استضافة', 'بنود خاصة بالاستضافة والخوادم', admin_user_id),
      ('استشارات', 'بنود خاصة بالاستشارات والتخطيط', admin_user_id),
      ('صيانة', 'بنود خاصة بالصيانة والدعم الفني', admin_user_id),
      ('أخرى', 'بنود متنوعة', admin_user_id);
  END IF;
END $$;