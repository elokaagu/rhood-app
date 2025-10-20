-- PART 1: Compare Bag Mix with app-uploaded mixes
-- Run this to see side-by-side comparison

-- ============================================
-- Bag Mix (Studio Upload)
-- ============================================
SELECT 
  'BAG MIX (STUDIO)' as source,
  id,
  user_id,
  title,
  genre,
  duration,
  SUBSTRING(file_url, 1, 80) as file_url_preview,
  LENGTH(file_url) as url_length,
  file_size,
  CASE 
    WHEN artwork_url IS NOT NULL THEN SUBSTRING(artwork_url, 1, 80)
    ELSE 'NO ARTWORK'
  END as artwork_preview,
  play_count,
  is_public,
  created_at
FROM mixes
WHERE title LIKE '%Bag%'
ORDER BY created_at DESC
LIMIT 1;

-- ============================================
-- Recent App Uploads
-- ============================================
SELECT 
  'APP UPLOAD' as source,
  id,
  user_id,
  title,
  genre,
  duration,
  SUBSTRING(file_url, 1, 80) as file_url_preview,
  LENGTH(file_url) as url_length,
  file_size,
  CASE 
    WHEN artwork_url IS NOT NULL THEN SUBSTRING(artwork_url, 1, 80)
    ELSE 'NO ARTWORK'
  END as artwork_preview,
  play_count,
  is_public,
  created_at
FROM mixes
WHERE title NOT LIKE '%Bag%'
ORDER BY created_at DESC
LIMIT 3;

