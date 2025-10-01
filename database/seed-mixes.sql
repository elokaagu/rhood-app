-- Seed sample mixes for R/HOOD
-- Run this in your Supabase SQL editor

-- Note: Replace the user_id values with actual user IDs from your auth.users table
-- To get user IDs, run: SELECT id, email FROM auth.users;

-- Note: First check what columns exist in your table by running:
-- database/check-mixes-columns.sql

-- This is a MINIMAL insert with only the most basic required columns
-- Run check-mixes-columns.sql first to see what columns actually exist!

-- Insert sample mixes (bare minimum - only required fields)
INSERT INTO mixes (
  title,
  file_url,
  user_id
) VALUES
-- Mix 1: Midnight Warehouse Vibes
(
  'Midnight Warehouse Vibes - Techno',
  'https://example.com/mixes/midnight-warehouse-vibes.mp3',
  (SELECT id FROM auth.users LIMIT 1) -- Replace with actual user_id
),
-- Mix 2: Sunset Rooftop Sessions
(
  'Sunset Rooftop Sessions - Deep House',
  'https://example.com/mixes/sunset-rooftop-sessions.mp3',
  (SELECT id FROM auth.users LIMIT 1)
),
-- Mix 3: Underground Energy
(
  'Underground Energy - Drum & Bass',
  'https://example.com/mixes/underground-energy.mp3',
  (SELECT id FROM auth.users LIMIT 1)
),
-- Mix 4: Beach Festival Highlights
(
  'Beach Festival Highlights - Progressive',
  'https://example.com/mixes/beach-festival-highlights.mp3',
  (SELECT id FROM auth.users LIMIT 1)
),
-- Mix 5: Industrial Soundscapes
(
  'Industrial Soundscapes - Industrial',
  'https://example.com/mixes/industrial-soundscapes.mp3',
  (SELECT id FROM auth.users LIMIT 1)
),
-- Mix 6: Neon City Nights
(
  'Neon City Nights - Synthwave',
  'https://example.com/mixes/neon-city-nights.mp3',
  (SELECT id FROM auth.users LIMIT 1)
);

-- Verify the insertions
SELECT 
  id, 
  title,
  file_url,
  user_id,
  created_at
FROM mixes
ORDER BY created_at DESC;

-- Note: These are sample records with placeholder file URLs
-- Replace the file_url values with actual URLs from your Supabase Storage bucket
-- when users upload real mixes through the app

-- After insertion, you can UPDATE individual records to add more details:
-- UPDATE mixes SET description = 'Your description', genre = 'Techno' WHERE title = 'Mix Title';

