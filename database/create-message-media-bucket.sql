-- Create message-media storage bucket for multimedia sharing in messages
-- This bucket stores images, videos, audio files, and documents shared in chat

-- ==========================================
-- STEP 1: CREATE BUCKET VIA SUPABASE DASHBOARD
-- ==========================================
-- Storage buckets cannot be created via SQL in Supabase
-- You must create it through the Dashboard:
--
-- 1. Go to Supabase Dashboard > Storage
-- 2. Click "New Bucket"
-- 3. Configure:
--    - Name: message-media
--    - Public: Yes (recommended for direct file access)
--    - File size limit: 262144000 (250 MB in bytes)
--    - Allowed MIME types: Leave empty or specify:
--      * image/*, video/*, audio/*, application/pdf, application/msword, etc.
-- 4. Click "Create bucket"
--
-- ==========================================
-- STEP 2: RUN THIS SQL SCRIPT FOR RLS POLICIES
-- ==========================================
-- After creating the bucket, run this script to set up Row Level Security policies

-- Check if bucket exists first
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = 'message-media'
  ) THEN
    RAISE EXCEPTION 'Bucket "message-media" not found. Please create it in Supabase Dashboard > Storage first.';
  END IF;
END $$;

-- Drop existing policies if they exist (safe to run multiple times)
DROP POLICY IF EXISTS "Allow authenticated uploads to message-media" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated downloads from message-media" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own files from message-media" ON storage.objects;

-- Policy: Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads to message-media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'message-media');

-- Policy: Allow authenticated users to view/download files
CREATE POLICY "Allow authenticated downloads from message-media"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'message-media');

-- Policy: Allow authenticated users to delete files they uploaded
-- (Optional - you may want to restrict deletion further)
CREATE POLICY "Allow users to delete own files from message-media"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'message-media');

-- Optional: Allow public read access (if bucket is public)
-- Uncomment if you want public access to message media
-- DROP POLICY IF EXISTS "Allow public access to message-media" ON storage.objects;
-- CREATE POLICY "Allow public access to message-media"
-- ON storage.objects
-- FOR SELECT
-- TO public
-- USING (bucket_id = 'message-media');

-- ==========================================
-- VERIFICATION
-- ==========================================
-- After running this script, verify the setup:

-- Check if bucket exists
SELECT 
  name, 
  public, 
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets 
WHERE name = 'message-media';

-- Check if policies were created
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%message-media%'
ORDER BY policyname;

-- Expected result:
-- ✅ Bucket "message-media" exists
-- ✅ 3 policies created (INSERT, SELECT, DELETE for authenticated users)

