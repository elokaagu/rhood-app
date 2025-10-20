-- Check the Bag Mix that was uploaded through the studio
-- This will show us the exact structure and fields used

SELECT 
  id,
  user_id,
  title,
  description,
  genre,
  duration,
  file_url,
  file_size,
  artwork_url,
  play_count,
  likes_count,
  is_public,
  created_at,
  updated_at
FROM mixes
WHERE title LIKE '%Bag%'
ORDER BY created_at DESC
LIMIT 1;

-- Also check all columns that exist in the mixes table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'mixes'
ORDER BY ordinal_position;

-- Check the storage object for Bag Mix audio file
SELECT 
  name,
  bucket_id,
  metadata->>'size' as size_bytes,
  metadata->>'mimetype' as mime_type,
  created_at
FROM storage.objects
WHERE bucket_id = 'mixes'
  AND name LIKE '%1759125570022%'
ORDER BY created_at DESC;

