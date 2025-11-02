-- Check current mixes bucket configuration
-- Run this in Supabase SQL Editor to see the current file size limit

SELECT 
  name,
  public,
  file_size_limit,
  file_size_limit / (1024 * 1024) as file_size_limit_mb,
  allowed_mime_types,
  created_at
FROM storage.buckets
WHERE name = 'mixes';

-- If the file_size_limit is too low (less than 5120 MB), update it:
-- Note: You can also update this in Supabase Dashboard > Storage > mixes > Settings

-- To update via SQL (if you have permission):
-- UPDATE storage.buckets 
-- SET file_size_limit = 5368709120  -- 5GB in bytes (5120 * 1024 * 1024)
-- WHERE name = 'mixes';

-- Recommended: Update via Supabase Dashboard
-- 1. Go to Storage > mixes bucket
-- 2. Click Settings (gear icon)
-- 3. Update "File size limit" to 5120 MB (or 5368709120 bytes)
-- 4. Click Save

