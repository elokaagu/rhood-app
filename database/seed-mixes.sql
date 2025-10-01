-- Seed sample mixes for R/HOOD
-- Run this in your Supabase SQL editor

-- Note: Replace the user_id values with actual user IDs from your auth.users table
-- To get user IDs, run: SELECT id, email FROM auth.users;

-- Note: If you get an error about artwork_url, run the migration first:
-- database/add-artwork-url-to-mixes.sql

-- Insert sample mixes
INSERT INTO mixes (
  title,
  description,
  genre,
  duration,
  file_url,
  file_size,
  play_count,
  is_public,
  user_id
) VALUES
-- Mix 1: Midnight Warehouse Vibes
(
  'Midnight Warehouse Vibes',
  'Dark, pulsing techno for late-night sessions. A journey through industrial soundscapes and hypnotic rhythms.',
  'Techno',
  3000, -- 50 minutes in seconds
  'https://example.com/mixes/midnight-warehouse-vibes.mp3',
  52428800, -- ~50MB
  1240,
  true,
  (SELECT id FROM auth.users LIMIT 1) -- Replace with actual user_id
),
-- Mix 2: Sunset Rooftop Sessions
(
  'Sunset Rooftop Sessions',
  'Smooth deep house for golden hour moments. Perfect for sunset vibes and good times with friends.',
  'Deep House',
  3600, -- 60 minutes
  'https://example.com/mixes/sunset-rooftop-sessions.mp3',
  62914560, -- ~60MB
  892,
  true,
  (SELECT id FROM auth.users LIMIT 1)
),
-- Mix 3: Underground Energy
(
  'Underground Energy',
  'High-energy drum & bass to get your blood pumping. Fast-paced breaks and rolling basslines.',
  'Drum & Bass',
  2700, -- 45 minutes
  'https://example.com/mixes/underground-energy.mp3',
  47185920, -- ~45MB
  2103,
  true,
  (SELECT id FROM auth.users LIMIT 1)
),
-- Mix 4: Beach Festival Highlights
(
  'Beach Festival Highlights',
  'Ethereal progressive house from the beach festival. Uplifting melodies and emotional journeys.',
  'Progressive',
  4200, -- 70 minutes
  'https://example.com/mixes/beach-festival-highlights.mp3',
  73400320, -- ~70MB
  1456,
  true,
  (SELECT id FROM auth.users LIMIT 1)
),
-- Mix 5: Industrial Soundscapes
(
  'Industrial Soundscapes',
  'Raw industrial beats from the underground scene. Dark, aggressive, and uncompromising.',
  'Industrial',
  3300, -- 55 minutes
  'https://example.com/mixes/industrial-soundscapes.mp3',
  57671680, -- ~55MB
  678,
  true,
  (SELECT id FROM auth.users LIMIT 1)
),
-- Mix 6: Neon City Nights
(
  'Neon City Nights',
  'Retro-futuristic synthwave for cyberpunk vibes. 80s nostalgia meets modern production.',
  'Synthwave',
  2400, -- 40 minutes
  'https://example.com/mixes/neon-city-nights.mp3',
  41943040, -- ~40MB
  934,
  true,
  (SELECT id FROM auth.users LIMIT 1)
);

-- Verify the insertions
SELECT 
  id, 
  title, 
  genre,
  duration,
  play_count,
  is_public
FROM mixes
ORDER BY created_at DESC;

-- Note: These are sample records with placeholder file URLs
-- Replace the file_url values with actual URLs from your Supabase Storage bucket
-- when users upload real mixes through the app

