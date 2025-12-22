-- Check all mixes and their artwork status
-- Run this in Supabase SQL Editor to see which mixes are missing artwork

-- Summary: Count mixes with and without artwork
SELECT 
  COUNT(*) as total_mixes,
  COUNT(artwork_url) FILTER (WHERE artwork_url IS NOT NULL AND artwork_url != '') as mixes_with_artwork,
  COUNT(*) FILTER (WHERE artwork_url IS NULL OR artwork_url = '') as mixes_without_artwork,
  ROUND(
    (COUNT(artwork_url) FILTER (WHERE artwork_url IS NOT NULL AND artwork_url != ''))::numeric / 
    COUNT(*)::numeric * 100, 
    2
  ) as percentage_with_artwork
FROM mixes
WHERE is_public = true;

-- Detailed list: All mixes with artwork status
SELECT 
  m.id,
  m.title,
  m.user_id,
  up.dj_name,
  up.full_name,
  up.username,
  m.artwork_url,
  m.image_url,
  CASE
    WHEN m.artwork_url IS NOT NULL AND m.artwork_url != '' THEN 'Has artwork_url'
    WHEN m.image_url IS NOT NULL AND m.image_url != '' THEN 'Has image_url (legacy)'
    ELSE 'No artwork'
  END AS artwork_status,
  m.created_at,
  m.updated_at
FROM mixes m
LEFT JOIN user_profiles up ON m.user_id = up.id
WHERE m.is_public = true
ORDER BY m.created_at DESC;

-- Mixes WITHOUT artwork (needs attention)
SELECT 
  m.id,
  m.title,
  m.user_id,
  up.dj_name,
  up.full_name,
  up.username,
  m.created_at
FROM mixes m
LEFT JOIN user_profiles up ON m.user_id = up.id
WHERE m.is_public = true
  AND (m.artwork_url IS NULL OR m.artwork_url = '')
  AND (m.image_url IS NULL OR m.image_url = '')
ORDER BY m.created_at DESC;

-- Mixes by user (to find Khadija and ddjw specifically)
SELECT 
  up.dj_name,
  up.full_name,
  up.username,
  COUNT(*) as total_mixes,
  COUNT(m.artwork_url) FILTER (WHERE m.artwork_url IS NOT NULL AND m.artwork_url != '') as mixes_with_artwork,
  COUNT(*) FILTER (WHERE m.artwork_url IS NULL OR m.artwork_url = '') as mixes_without_artwork
FROM mixes m
LEFT JOIN user_profiles up ON m.user_id = up.id
WHERE m.is_public = true
GROUP BY up.id, up.dj_name, up.full_name, up.username
ORDER BY total_mixes DESC;

