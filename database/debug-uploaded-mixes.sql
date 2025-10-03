-- Debug uploaded mixes to check URLs and artwork
-- Run this in your Supabase SQL Editor

-- Check all uploaded mixes with their URLs
SELECT 
  id,
  title,
  artist,
  genre,
  file_url,
  artwork_url,
  user_id,
  created_at,
  CASE 
    WHEN file_url IS NOT NULL AND file_url != '' THEN 'Has Audio URL'
    ELSE 'Missing Audio URL'
  END as audio_status,
  CASE 
    WHEN artwork_url IS NOT NULL AND artwork_url != '' THEN 'Has Artwork URL'
    ELSE 'Missing Artwork URL'
  END as artwork_status
FROM mixes 
WHERE created_at > NOW() - INTERVAL '7 days'  -- Recent uploads
ORDER BY created_at DESC;

-- Check if uploaded files exist in storage
SELECT 
  m.title,
  m.file_url,
  CASE 
    WHEN o.name IS NOT NULL THEN 'File exists in storage'
    ELSE 'File missing from storage'
  END as storage_status,
  o.name as storage_filename,
  o.metadata->>'size' as file_size_bytes
FROM mixes m
LEFT JOIN storage.objects o ON o.name = SUBSTRING(m.file_url FROM '/([^/]+)$') -- Extract filename from URL
WHERE m.created_at > NOW() - INTERVAL '7 days'
ORDER BY m.created_at DESC;

-- Check artwork files in storage
SELECT 
  m.title,
  m.artwork_url,
  CASE 
    WHEN o.name IS NOT NULL THEN 'Artwork exists in storage'
    ELSE 'Artwork missing from storage'
  END as artwork_storage_status,
  o.name as artwork_filename,
  o.metadata->>'size' as artwork_size_bytes
FROM mixes m
LEFT JOIN storage.objects o ON o.name = SUBSTRING(m.artwork_url FROM '/([^/]+)$') -- Extract filename from URL
WHERE m.created_at > NOW() - INTERVAL '7 days'
  AND m.artwork_url IS NOT NULL 
  AND m.artwork_url != ''
ORDER BY m.created_at DESC;
