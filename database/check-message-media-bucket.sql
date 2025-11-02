-- Check if message-media storage bucket exists and is configured correctly
-- Run this in your Supabase SQL Editor

-- Check if the message-media bucket exists
SELECT 
  name, 
  public, 
  file_size_limit,
  allowed_mime_types,
  created_at,
  CASE 
    WHEN name = 'message-media' THEN '✅ Bucket exists'
    ELSE '❌ Bucket not found'
  END as status
FROM storage.buckets 
WHERE name = 'message-media';

-- Check storage policies for message-media bucket
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%message-media%'
ORDER BY policyname;

-- Check if there are any files in the message-media bucket
SELECT 
  name,
  bucket_id,
  owner,
  created_at,
  metadata->>'size' as file_size,
  metadata->>'mimetype' as mime_type
FROM storage.objects 
WHERE bucket_id = 'message-media'
ORDER BY created_at DESC
LIMIT 10;

-- Summary check
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM storage.buckets WHERE name = 'message-media'
    )
    THEN '✅ Bucket exists'
    ELSE '❌ Bucket missing - Create it in Dashboard > Storage'
  END as bucket_status,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%message-media%';

