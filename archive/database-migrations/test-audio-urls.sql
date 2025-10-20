-- Test uploaded audio URLs for accessibility
-- Run this in your Supabase SQL Editor

-- Check audio URLs format and accessibility
SELECT 
  m.id,
  m.title,
  m.file_url,
  CASE 
    WHEN m.file_url IS NULL THEN 'NULL URL'
    WHEN m.file_url = '' THEN 'Empty URL'
    WHEN m.file_url LIKE 'https://%' THEN 'HTTPS URL'
    WHEN m.file_url LIKE 'http://%' THEN 'HTTP URL'
    ELSE 'Invalid URL Format'
  END as url_status,
  CASE 
    WHEN m.file_url LIKE '%supabase%' THEN 'Supabase URL'
    WHEN m.file_url LIKE 'https://%' THEN 'External URL'
    ELSE 'Unrecognized Domain'
  END as domain_status
FROM mixes m
WHERE m.created_at > NOW() - INTERVAL '7 days'
ORDER BY m.created_at DESC;

-- Check if there are CORS-friendly URLs
-- Supabase storage URLs should look like:
-- https://[project-id].supabase.co/storage/v1/object/public/mixes/[user-id]/[filename]
SELECT 
  m.title,
  m.file_url,
  CASE 
    WHEN m.file_url LIKE '%/storage/v1/object/public/%' THEN 'Direct Public URL'
    WHEN m.file_url LIKE '%/storage/v1/object/public/mixes/%' THEN 'Mixes Bucket Public URL'
    ELSE 'May require authentication or has CORS issues'
  END as cors_status
FROM mixes m
WHERE m.file_url IS NOT NULL
  AND m.created_at > NOW() - INTERVAL '7 days';
