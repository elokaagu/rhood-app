-- Fix avatar uploads for users who haven't confirmed their email yet.
-- During onboarding, signUp() returns a user but no session (email confirmation
-- is pending), so the Supabase client is unauthenticated (anon role).
-- Profile images are public content, so allowing anon uploads is safe.

-- Drop the existing authenticated-only policy
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;

-- Allow both anon (unconfirmed / onboarding) and authenticated users to upload
CREATE POLICY "Anyone can upload avatars"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'avatars');

-- Allow both roles to overwrite (upsert)
CREATE POLICY "Anyone can update avatars"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'avatars');

-- Ensure bucket accepts HEIC/HEIF explicitly (in case it was created without them)
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/gif'
]
WHERE id = 'avatars';
