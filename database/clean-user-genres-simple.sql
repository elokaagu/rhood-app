-- Simple script to clean up user genres - Remove non-music genres from user_profiles
-- This version works by using a simpler approach without complex CTEs

-- First, let's see what invalid genres we have
SELECT 
  dj_name,
  genres,
  array_agg(invalid_genre) as invalid_genres
FROM user_profiles,
  unnest(genres) as invalid_genre
WHERE LOWER(invalid_genre) NOT IN (
  SELECT LOWER(genre) FROM unnest(ARRAY[
    'House', 'Techno', 'Trance', 'Dubstep', 'Drum & Bass', 
    'Hip Hop', 'R&B', 'Pop', 'Rock', 'Jazz', 'Funk', 
    'Disco', 'Ambient', 'Experimental', 'Electronic', 
    'Deep House', 'Progressive House', 'Tech House',
    'Breakbeat', 'Garage', 'Bass', 'Trap', 'Future Bass',
    'Minimal', 'Psytrance', 'Hardstyle', 'Drumstep',
    'Chillout', 'Downtempo', 'Nu Disco', 'Afro House'
  ]) as genre
)
GROUP BY dj_name, genres
ORDER BY dj_name;

-- Now update users to remove invalid genres
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
WHERE EXISTS (
  SELECT 1 
  FROM unnest(user_profiles.genres) as genre
  WHERE LOWER(genre) NOT IN (
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
);

-- Show the results - users with cleaned genres
SELECT 
  dj_name,
  genres as cleaned_genres,
  array_length(genres, 1) as genre_count
FROM user_profiles 
WHERE array_length(genres, 1) > 0
ORDER BY dj_name;
