-- Compare Bag Mix (studio upload) with app-uploaded mixes
-- This will help us identify any differences in how they're stored

-- ============================================
-- PART 1: Check the Bag Mix structure
-- ============================================
SELECT 
  'BAG MIX (STUDIO)' as source,
  id,
  user_id,
  title,
  description,
  genre,
  duration,
  file_url,
  LENGTH(file_url) as url_length,
  file_size,
  artwork_url,
  LENGTH(artwork_url) as artwork_url_length,
  play_count,
  likes_count,
  is_public,
  created_at,
  updated_at
FROM mixes
WHERE title LIKE '%Bag%'
ORDER BY created_at DESC
LIMIT 1;

-- ============================================
-- PART 2: Check recent app-uploaded mixes
-- ============================================
SELECT 
  'APP UPLOAD' as source,
  id,
  user_id,
  title,
  description,
  genre,
  duration,
  file_url,
  LENGTH(file_url) as url_length,
  file_size,
  artwork_url,
  LENGTH(artwork_url) as artwork_url_length,
  play_count,
  likes_count,
  is_public,
  created_at,
  updated_at
FROM mixes
WHERE title NOT LIKE '%Bag%'
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 3;

-- ============================================
-- PART 3: Compare storage objects
-- ============================================

-- Bag Mix audio file
SELECT 
  'BAG MIX AUDIO' as file_type,
  name,
  bucket_id,
  (metadata->>'size')::bigint as size_bytes,
  metadata->>'mimetype' as mime_type,
  metadata->>'cacheControl' as cache_control,
  created_at
FROM storage.objects
WHERE bucket_id = 'mixes'
  AND name LIKE '%1759125570022%'
ORDER BY created_at DESC
LIMIT 1;

-- Recent app-uploaded audio files
SELECT 
  'APP UPLOAD AUDIO' as file_type,
  name,
  bucket_id,
  (metadata->>'size')::bigint as size_bytes,
  metadata->>'mimetype' as mime_type,
  metadata->>'cacheControl' as cache_control,
  created_at
FROM storage.objects
WHERE bucket_id = 'mixes'
  AND name NOT LIKE '%1759125570022%'
  AND name NOT LIKE '%artwork%'
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 3;

-- ============================================
-- PART 4: Check URL accessibility patterns
-- ============================================

-- Check if URLs follow the same pattern
SELECT 
  title,
  CASE 
    WHEN file_url LIKE 'https://%.supabase.co/storage/v1/object/public/mixes/%' THEN 'PUBLIC URL'
    WHEN file_url LIKE 'https://%.supabase.co/storage/v1/object/sign/mixes/%' THEN 'SIGNED URL'
    ELSE 'OTHER FORMAT'
  END as url_type,
  file_url,
  created_at
FROM mixes
ORDER BY created_at DESC
LIMIT 5;

-- ============================================
-- PART 5: Check for any missing fields
-- ============================================

-- Find mixes with NULL values in important fields
SELECT 
  'MISSING DATA CHECK' as check_type,
  COUNT(*) FILTER (WHERE file_url IS NULL) as missing_file_url,
  COUNT(*) FILTER (WHERE user_id IS NULL) as missing_user_id,
  COUNT(*) FILTER (WHERE title IS NULL) as missing_title,
  COUNT(*) FILTER (WHERE duration IS NULL) as missing_duration,
  COUNT(*) FILTER (WHERE artwork_url IS NULL) as missing_artwork,
  COUNT(*) FILTER (WHERE file_size IS NULL OR file_size = 0) as missing_file_size
FROM mixes;

