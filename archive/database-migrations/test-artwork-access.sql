-- Test artwork URL accessibility
-- Run this to check if artwork files are publicly accessible

-- Check if specific artwork files exist and are accessible
SELECT 
  m.title,
  m.artwork_url,
  CASE 
    WHEN m.artwork_url LIKE '%supabase%' THEN 'Supabase Storage URL'
    WHEN m.artwork_url LIKE '%unsplash%' THEN 'Unsplash Fallback URL'
    ELSE 'Other URL'
  END as url_type,
  CASE 
    WHEN m.artwork_url LIKE '%artwork_%' THEN 'Uploaded Artwork'
    ELSE 'Default/Fallback Image'
  END as image_source
FROM mixes m
WHERE m.created_at > NOW() - INTERVAL '7 days'
ORDER BY m.created_at DESC;

-- Check if the bucket is public
SELECT 
  name,
  public,
  CASE 
    WHEN public THEN '✅ Bucket is PUBLIC'
    ELSE '❌ Bucket is PRIVATE - this is the problem!'
  END as bucket_status
FROM storage.buckets 
WHERE name = 'mixes';

-- Check if artwork files exist in storage
SELECT 
  o.name as filename,
  o.bucket_id,
  SUBSTRING(o.owner::text, 1, 12) as owner_id,
  o.metadata->>'size' as size_bytes,
  o.metadata->>'mimetype' as mime_type,
  CASE 
    WHEN o.name LIKE '%artwork_%' THEN 'Artwork File'
    ELSE 'Audio File'
  END as file_type
FROM storage.objects o
WHERE o.bucket_id = 'mixes'
  AND o.name LIKE '%artwork_%'
ORDER BY o.created_at DESC
LIMIT 10;
