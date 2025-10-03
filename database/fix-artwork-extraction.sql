-- Better artwork file extraction and diagnostics
-- Run this to properly match artwork files in storage

-- Fix artwork filename extraction with better regex
SELECT 
  m.title,
  m.artwork_url,
  SUBSTRING(m.artwork_url FROM '([^/]+)$') as extracted_filename_simple,
  SUBSTRING(m.artwork_url FROM '/mixes/(.+)$') as extracted_path_with_prefix,
  CASE 
    WHEN SUBSTRING(m.artwork_url FROM '([^/]+)$') IS NOT NULL THEN 'Filename extracted'
    ELSE 'Could not extract filename'
  END as extraction_status
FROM mixes m
WHERE m.created_at > NOW() - INTERVAL '7 days'
  AND m.artwork_url IS NOT NULL 
  AND m.artwork_url != '';

-- Check actual files in storage that match artwork patterns
SELECT 
  m.title,
  m.artwork_url,
  o.name as storage_filename,
  CASE 
    WHEN o.name IS NOT NULL THEN 'MATCH FOUND'
    ELSE 'NO MATCH'
  END as match_status,
  o.metadata->>'size' as file_size_bytes,
  o.created_at as storage_created_at
FROM mixes m
LEFT JOIN storage.objects o ON (
  o.name LIKE '%artwork%' AND 
  o.bucket_id = 'mixes' AND
  SUBSTRING(o.owner::text FROM 1 FOR 8) = SUBSTRING(m.user_id::text FROM 1 FOR 8)
)
WHERE m.created_at > NOW() - INTERVAL '7 days'
  AND m.artwork_url IS NOT NULL 
  AND m.artwork_url != ''
ORDER BY m.created_at DESC;

-- List all files in mixes bucket for manual inspection
SELECT 
  name as filename,
  bucket_id,
  SUBSTRING(owner::text, 1, 8) as owner_prefix,
  metadata->>'size' as size_bytes,
  metadata->>'mimetype' as mime_type,
  created_at
FROM storage.objects 
WHERE bucket_id = 'mixes'
ORDER BY created_at DESC
LIMIT 20;
