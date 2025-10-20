-- Clean up user genres - Remove non-music genres from user_profiles
-- Run this in your Supabase SQL editor

-- List of valid music genres (case-insensitive)
-- This matches the genres used in the app
WITH valid_genres AS (
  SELECT unnest(ARRAY[
    'House', 'Techno', 'Trance', 'Dubstep', 'Drum & Bass', 
    'Hip Hop', 'R&B', 'Pop', 'Rock', 'Jazz', 'Funk', 
    'Disco', 'Ambient', 'Experimental', 'Electronic', 
    'Deep House', 'Progressive House', 'Tech House',
    'Breakbeat', 'Garage', 'Bass', 'Trap', 'Future Bass',
    'Minimal', 'Psytrance', 'Hardstyle', 'Drumstep',
    'Chillout', 'Downtempo', 'Nu Disco', 'Afro House'
  ]) AS genre
),

-- Find users with invalid genres
users_with_invalid_genres AS (
  SELECT 
    id,
    dj_name,
    genres,
    array_agg(invalid_genre) as invalid_genres
  FROM user_profiles,
    unnest(genres) as invalid_genre
  WHERE LOWER(invalid_genre) NOT IN (
    SELECT LOWER(genre) FROM valid_genres
  )
  GROUP BY id, dj_name, genres
)

-- Update users to remove invalid genres
UPDATE user_profiles 
SET 
  genres = array(
    SELECT genre 
    FROM unnest(user_profiles.genres) as genre
    WHERE LOWER(genre) IN (
      SELECT LOWER(valid_genre) 
      FROM unnest(ARRAY[
        'House', 'Techno', 'Trance', 'Dubstep', 'Drum & Bass', 
        'Hip Hop', 'R&B', 'Pop', 'Rock', 'Jazz', 'Funk', 
        'Disco', 'Ambient', 'Experimental', 'Electronic', 
        'Deep House', 'Progressive House', 'Tech House',
        'Breakbeat', 'Garage', 'Bass', 'Trap', 'Future Bass',
        'Minimal', 'Psytrance', 'Hardstyle', 'Drumstep',
        'Chillout', 'Downtempo', 'Nu Disco', 'Afro House'
      ]) as valid_genre
    )
  ),
  updated_at = NOW()
WHERE id IN (SELECT id FROM users_with_invalid_genres);

-- Show the results
SELECT 
  'Users cleaned' as action,
  COUNT(*) as count
FROM users_with_invalid_genres

UNION ALL

SELECT 
  'Invalid genres removed' as action,
  SUM(array_length(invalid_genres, 1)) as count
FROM users_with_invalid_genres;

-- Show remaining users with their cleaned genres
SELECT 
  dj_name,
  genres as cleaned_genres,
  array_length(genres, 1) as genre_count
FROM user_profiles 
WHERE array_length(genres, 1) > 0
ORDER BY dj_name;
