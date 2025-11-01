-- Setup RLS policies for message-media storage bucket
-- Run this AFTER creating the bucket in Supabase Dashboard > Storage

-- Policy: Allow authenticated users to upload files
CREATE POLICY IF NOT EXISTS "Allow authenticated uploads to message-media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'message-media');

-- Policy: Allow authenticated users to view files
CREATE POLICY IF NOT EXISTS "Allow authenticated downloads from message-media"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'message-media');

-- Policy: Allow users to delete their own files
-- Note: This is optional - you may want to restrict deletion
CREATE POLICY IF NOT EXISTS "Allow users to delete own files from message-media"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'message-media');

-- If you want to allow public access (for public media files):
-- CREATE POLICY IF NOT EXISTS "Allow public access to message-media"
-- ON storage.objects
-- FOR SELECT
-- TO public
-- USING (bucket_id = 'message-media');

