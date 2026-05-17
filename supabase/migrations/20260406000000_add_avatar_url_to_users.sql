-- Add avatar_url column to users table for profile pictures
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create user-avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-avatars', 'user-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for user-avatars
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'user-avatars');

DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
CREATE POLICY "Authenticated users can update avatars" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'user-avatars')
  WITH CHECK (bucket_id = 'user-avatars');

DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'user-avatars');
