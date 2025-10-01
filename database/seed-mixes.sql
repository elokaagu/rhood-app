-- Seed sample mixes for R/HOOD
-- Run this in your Supabase SQL editor

-- Note: Replace the user_id values with actual user IDs from your auth.users table
-- To get user IDs, run: SELECT id, email FROM auth.users;

-- Note: First check what columns exist in your table by running:
-- database/check-mixes-columns.sql

-- This is a MINIMAL insert with only essential columns
-- Add more columns as needed based on your actual table structure

-- Insert sample mixes
INSERT INTO mixes (
  title,
  description,
  genre,
  file_url,
  is_public,
  user_id
) VALUES
-- Mix 1: Midnight Warehouse Vibes
(
  'Midnight Warehouse Vibes',
  'Dark, pulsing techno for late-night sessions. A journey through industrial soundscapes and hypnotic rhythms.',
  'Techno',
  'https://example.com/mixes/midnight-warehouse-vibes.mp3',
  true,
  (SELECT id FROM auth.users LIMIT 1) -- Replace with actual user_id
),
-- Mix 2: Sunset Rooftop Sessions
(
  'Sunset Rooftop Sessions',
  'Smooth deep house for golden hour moments. Perfect for sunset vibes and good times with friends.',
  'Deep House',
  'https://example.com/mixes/sunset-rooftop-sessions.mp3',
  true,
  (SELECT id FROM auth.users LIMIT 1)
),
-- Mix 3: Underground Energy
(
  'Underground Energy',
  'High-energy drum & bass to get your blood pumping. Fast-paced breaks and rolling basslines.',
  'Drum & Bass',
  'https://example.com/mixes/underground-energy.mp3',
  true,
  (SELECT id FROM auth.users LIMIT 1)
),
-- Mix 4: Beach Festival Highlights
(
  'Beach Festival Highlights',
  'Ethereal progressive house from the beach festival. Uplifting melodies and emotional journeys.',
  'Progressive',
  'https://example.com/mixes/beach-festival-highlights.mp3',
  true,
  (SELECT id FROM auth.users LIMIT 1)
),
-- Mix 5: Industrial Soundscapes
(
  'Industrial Soundscapes',
  'Raw industrial beats from the underground scene. Dark, aggressive, and uncompromising.',
  'Industrial',
  'https://example.com/mixes/industrial-soundscapes.mp3',
  true,
  (SELECT id FROM auth.users LIMIT 1)
),
-- Mix 6: Neon City Nights
(
  'Neon City Nights',
  'Retro-futuristic synthwave for cyberpunk vibes. 80s nostalgia meets modern production.',
  'Synthwave',
  'https://example.com/mixes/neon-city-nights.mp3',
  true,
  (SELECT id FROM auth.users LIMIT 1)
);

-- Verify the insertions
SELECT 
  id, 
  title, 
  genre,
  is_public,
  created_at
FROM mixes
ORDER BY created_at DESC;

-- Note: These are sample records with placeholder file URLs
-- Replace the file_url values with actual URLs from your Supabase Storage bucket
-- when users upload real mixes through the app

