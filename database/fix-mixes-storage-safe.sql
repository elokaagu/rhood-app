-- Safe storage bucket fix - handles existing policies gracefully
-- Run this in your Supabase SQL Editor

-- 1. Update mixes bucket to be public
UPDATE storage.buckets 
SET public = true 
WHERE name = 'mixes';

-- 2. Drop ALL existing policies for mixes bucket to start clean
DO $$ 
DECLARE 
    pol RECORD;
BEGIN 
    FOR pol IN 
        SELECT policyname 
        FROM pg_lookup_policies 
        WHERE tablename = 'objects' 
        AND policyname LIKE '%mixes%'
    LOOP 
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON storage.objects';
    END LOOP;
END $$;

-- Alternative approach if above doesn't work - drop specific policies
DROP POLICY IF EXISTS "Authenticated users can upload mixes" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own mixes" ON storage.objects;
DROP POLICY IF EXISTS "Public can view mixes" ON storage.objects;
DROP POLICY IF EXISTS "Public can view all mixes" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own mixes" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own mixes" ON storage.objects;

-- 3. Create comprehensive storage policies with IF NOT EXISTS equivalent
-- Public read access for all mixes
CREATE POLICY "Mixes public read policy" 
ON storage.objects FOR SELECT 
TO public
USING (bucket_id = 'mixes');

-- Authenticated users can upload mixes
CREATE POLICY "Mixes upload policy" 
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'mixes' 
  AND auth.role() = 'authenticated'
);

-- Users can update their own mixes (files in their user folder)
CREATE POLICY "Mixes update policy" 
ON storage.objects FOR UPDATE 
TO authenticated
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

-- Users can delete their own mixes
CREATE POLICY "Mixes delete policy" 
ON storage.objects FOR DELETE 
TO authenticated
USING (
  bucket_id = 'mixes' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND auth.role() = 'authenticated'
);

-- 4. Ensure RLS is enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 5. Verify the setup
SELECT 
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets 
WHERE name = 'mixes';

-- Check policies were created
SELECT 
  policyname,
  permissive,
  roles,
  cmd
FROM pg_lookup_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%mixes%'
ORDER BY policyname;

-- Check for any remaining errors
SELECT 'Storage bucket configured successfully' as status;
