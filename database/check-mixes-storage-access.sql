-- Check if mixes storage bucket is properly configured for public access
-- Run this in your Supabase SQL Editor

-- Check if the mixes bucket exists and is public
SELECT 
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets 
WHERE name = 'mixes';

-- Check storage policies for the mixes bucket
SELECT 
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

-- Check if there are any files in the mixes bucket
SELECT 
  name,
  bucket_id,
  owner,
  created_at,
  updated_at,
  last_accessed_at,
  metadata
FROM storage.objects 
WHERE bucket_id = 'mixes'
ORDER BY created_at DESC
LIMIT 10;

-- Test if we can access a file (replace with actual file path)
-- SELECT 
--   name,
--   bucket_id,
--   CASE 
--     WHEN public THEN 'Public'
--     ELSE 'Private'
--   END as access_level
-- FROM storage.objects 
-- WHERE bucket_id = 'mixes' 
-- AND name LIKE '%mp3%'
-- LIMIT 5;
