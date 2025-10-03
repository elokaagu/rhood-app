-- Quick storage check - see what's actually in your mixes bucket
-- Run this to see current state before making changes

-- Check bucket status
SELECT 
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  'BUCKET STATUS' as info
FROM storage.buckets 
WHERE name = 'mixes';

-- Check what files are currently in storage
SELECT 
  name as filename,
  bucket_id,
  SUBSTRING(owner::text, 1, 12) as owner_id,
  metadata->>'size' as size_bytes,
  metadata->>'mimetype' as mime_type,
  created_at,
  'STORAGE FILES' as info
FROM storage.objects 
WHERE bucket_id = 'mixes'
ORDER BY created_at DESC
LIMIT 10;

-- Check recent mixes in database
SELECT 
  id,
  title,
  artist,
  CASE 
    WHEN file_url IS NOT NULL THEN 'Has audio URL'
    ELSE 'Missing audio URL'
  END as audio_status,
  CASE 
    WHEN artwork_url IS NOT NULL THEN 'Has artwork URL'
    ELSE 'Missing artwork URL'
  END as artwork_status,
  created_at,
  'DATABASE MIXES' as info
FROM mixes 
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- Check current policies (without trying to modify them)
SELECT 
  policyname,
  cmd,
  permissive,
  'CURRENT POLICIES' as info
FROM pg_lookup_policies 
WHERE tablename = 'objects' 
ORDER BY policyname;
