-- PART 2: Check URL patterns and storage objects
-- This shows if both uploads use the same URL format

-- ============================================
-- Check URL patterns for all mixes
-- ============================================
SELECT 
  title,
  CASE 
    WHEN file_url LIKE '%/storage/v1/object/public/mixes/%' THEN 'PUBLIC URL ✅'
    WHEN file_url LIKE '%/storage/v1/object/sign/mixes/%' THEN 'SIGNED URL ⚠️'
    ELSE 'OTHER FORMAT ❌'
  END as url_type,
  CASE 
    WHEN file_url LIKE '%/mixes/%/%' THEN 'HAS USER FOLDER ✅'
    ELSE 'NO USER FOLDER ⚠️'
  END as path_structure,
  created_at
FROM mixes
ORDER BY created_at DESC
LIMIT 5;

-- ============================================
-- Check storage objects for audio files
-- ============================================
SELECT 
  name as file_path,
  (metadata->>'size')::bigint as size_bytes,
  ROUND((metadata->>'size')::bigint / 1024.0 / 1024.0, 2) as size_mb,
  metadata->>'mimetype' as mime_type,
  metadata->>'cacheControl' as cache_control,
  created_at
FROM storage.objects
WHERE bucket_id = 'mixes'
  AND name NOT LIKE '%artwork%'
ORDER BY created_at DESC
LIMIT 5;

