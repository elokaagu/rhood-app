-- Comprehensive fix for mixes storage bucket
-- Run this in your Supabase SQL Editor to fix storage issues

-- 1. Update mixes bucket to be public
UPDATE storage.buckets 
SET public = true 
WHERE name = 'mixes';

-- 2. Drop existing policies to recreate them cleanly
DROP POLICY IF EXISTS "Users can upload mixes" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own mixes" ON storage.objects;
DROP POLICY IF EXISTS "Public can view mixes" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their mixes" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own mixes" ON storage.objects;

-- 3. Create comprehensive storage policies
CREATE POLICY "Public can view all mixes" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'mixes');

CREATE POLICY "Authenticated users can upload mixes" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'mixes' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own mixes" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'mixes' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'mixes' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own mixes" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'mixes' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND auth.role() = 'authenticated'
);

-- 4. Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 5. Check bucket configuration
SELECT 
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets 
WHERE name = 'mixes';

-- 6. Check policies were created
SELECT 
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%mixes%'
ORDER BY policyname;
