-- Insert ALL mock opportunities into Supabase
-- Run this in your Supabase SQL editor

-- Insert the mock opportunities from the app
INSERT INTO opportunities (
  id,
  title,
  description,
  location,
  organizer_name,
  image_url,
  is_active,
  created_at,
  updated_at
) VALUES 
(
  '550e8400-e29b-41d4-a716-446655440001',
  'Friday Night Rave',
  'Join us for an electrifying night of underground electronic music. We''re looking for DJs who can bring high-energy sets and keep the crowd moving all night long. This is a premier venue with state-of-the-art sound system and lighting.',
  'Brooklyn, NY',
  'Underground Warehouse',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop',
  true,
  NOW(),
  NOW()
),
(
  '550e8400-e29b-41d4-a716-446655440002',
  'Sunset Sessions',
  'Perfect for DJs who specialize in deep house, progressive, and ambient electronic music. This rooftop venue offers stunning city views and a sophisticated crowd.',
  'Los Angeles, CA',
  'The Loft',
  'https://images.unsplash.com/photo-1571266028243-d220c0b0b0c4?w=400&h=400&fit=crop',
  true,
  NOW(),
  NOW()
),
(
  '550e8400-e29b-41d4-a716-446655440003',
  'Neon Dreams',
  'High-energy electronic music event featuring the best in techno, trance, and progressive house. State-of-the-art lighting and sound system.',
  'Austin, TX',
  'Electric Garden',
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=400&fit=crop',
  true,
  NOW(),
  NOW()
),
(
  '550e8400-e29b-41d4-a716-446655440004',
  'Cloud Nine',
  'Elevated electronic music experience with panoramic city views. Perfect for DJs who create atmospheric and immersive soundscapes.',
  'Chicago, IL',
  'Sky Lounge',
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop',
  true,
  NOW(),
  NOW()
),
(
  '550e8400-e29b-41d4-a716-446655440005',
  'Midnight Sessions',
  'Late-night underground electronic music event. Looking for DJs who can maintain high energy and keep the crowd dancing until dawn.',
  'Seattle, WA',
  'The Underground',
  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=400&fit=crop',
  true,
  NOW(),
  NOW()
);

-- Verify the insertions
SELECT id, title, organizer_name FROM opportunities WHERE id IN (
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440003',
  '550e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440005'
);
