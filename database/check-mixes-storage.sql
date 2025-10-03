-- Check if mixes storage bucket exists and is configured correctly
-- Run this in your Supabase SQL Editor

-- Check if the mixes bucket exists
SELECT name, public, file_size_limit, allowed_mime_types
FROM storage.buckets 
WHERE name = 'mixes';

-- Check storage policies for mixes bucket
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%mixes%'
ORDER BY policyname;

-- Check if mixes table exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'mixes'
) as mixes_table_exists;

-- If mixes table exists, check its structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'mixes'
ORDER BY ordinal_position;

-- Check if there are any existing mixes
SELECT COUNT(*) as total_mixes FROM mixes;
