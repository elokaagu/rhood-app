-- Seed Mock User Profiles for R/HOOD Connections
-- Run this in your Supabase SQL Editor to create sample DJs

-- Note: This creates user profiles without authentication
-- In production, these would be created through the signup flow

-- Insert mock DJ profiles
INSERT INTO user_profiles (
  id,
  dj_name,
  full_name,
  username,
  instagram,
  soundcloud,
  city,
  genres,
  bio,
  profile_image_url,
  rating,
  gigs_completed,
  credits,
  is_verified,
  created_at,
  updated_at
) VALUES 
-- DJ 1: Maya Chen
(
  gen_random_uuid(),
  'Maya Chen',
  'Maya Chen',
  'mayachen',
  '@mayachenmusic',
  'soundcloud.com/mayachen',
  'London',
  ARRAY['Techno', 'House', 'Electronic'],
  'Techno DJ and producer from London. Resident at Fabric. Known for hard-hitting sets and underground vibes.',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
  4.9,
  28,
  420,
  true,
  NOW() - INTERVAL '6 months',
  NOW()
),

-- DJ 2: James Martinez
(
  gen_random_uuid(),
  'DJ Smooth',
  'James Martinez',
  'djsmooth',
  '@djsmoothofficial',
  'soundcloud.com/djsmooth',
  'Manchester',
  ARRAY['R&B', 'Soul', 'Hip-Hop'],
  'Manchester-based R&B selector. Specializing in 90s classics and modern soul. Available for weddings and private events.',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
  4.7,
  15,
  250,
  false,
  NOW() - INTERVAL '4 months',
  NOW()
),

-- DJ 3: Aisha Thompson
(
  gen_random_uuid(),
  'Aisha T',
  'Aisha Thompson',
  'aishat',
  '@aishatmusic',
  'soundcloud.com/aishat',
  'Birmingham',
  ARRAY['Afrobeats', 'Dancehall', 'Hip-Hop'],
  'Bringing Afrobeats energy to Birmingham nightlife. 5+ years experience spinning at clubs and festivals across the UK.',
  'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=400&fit=crop',
  4.8,
  22,
  380,
  true,
  NOW() - INTERVAL '8 months',
  NOW()
),

-- DJ 4: Luca Romano
(
  gen_random_uuid(),
  'Luca Romano',
  'Luca Romano',
  'lucaromano',
  '@lucaromanomusic',
  'soundcloud.com/lucaromano',
  'London',
  ARRAY['Deep House', 'Tech House', 'Progressive House'],
  'Italian DJ bringing Mediterranean vibes to London. Deep house enthusiast with a passion for melodic journeys.',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
  4.6,
  12,
  180,
  false,
  NOW() - INTERVAL '3 months',
  NOW()
),

-- DJ 5: Sophie Anderson
(
  gen_random_uuid(),
  'Sophie A',
  'Sophie Anderson',
  'sophiea',
  '@sophieamusic',
  'soundcloud.com/sophiea',
  'Bristol',
  ARRAY['Drum & Bass', 'Jungle', 'Breakbeat'],
  'Bristol DnB selector. Fast-paced, high-energy sets for the ravers. Resident at Motion.',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop',
  5.0,
  35,
  550,
  true,
  NOW() - INTERVAL '1 year',
  NOW()
),

-- DJ 6: Marcus Williams
(
  gen_random_uuid(),
  'DJ Marcus',
  'Marcus Williams',
  'djmarcus',
  '@marcuswilliamsmusic',
  'soundcloud.com/djmarcus',
  'Leeds',
  ARRAY['House', 'Disco', 'Funk'],
  'Funk and disco lover from Leeds. Bringing the groove back to the dancefloor. 10+ years in the game.',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop',
  4.7,
  18,
  290,
  false,
  NOW() - INTERVAL '5 months',
  NOW()
),

-- DJ 7: Yasmin Patel
(
  gen_random_uuid(),
  'Yasmin Patel',
  'Yasmin Patel',
  'yasminpatel',
  '@yasminpatelmusic',
  'soundcloud.com/yasminpatel',
  'London',
  ARRAY['Trance', 'Progressive House', 'Melodic Techno'],
  'London trance DJ creating euphoric moments. Playing the classics and the freshest releases.',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop',
  4.9,
  26,
  410,
  true,
  NOW() - INTERVAL '7 months',
  NOW()
),

-- DJ 8: Oliver Taylor
(
  gen_random_uuid(),
  'Olly T',
  'Oliver Taylor',
  'ollyt',
  '@ollytmusic',
  'soundcloud.com/ollyt',
  'Glasgow',
  ARRAY['Techno', 'Minimal', 'Industrial'],
  'Glasgow underground techno. Dark, driving, hypnotic. Resident at Sub Club.',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
  4.8,
  20,
  340,
  true,
  NOW() - INTERVAL '9 months',
  NOW()
),

-- DJ 9: Fatima Hassan
(
  gen_random_uuid(),
  'Fatima H',
  'Fatima Hassan',
  'fatimah',
  '@fatimahassan',
  'soundcloud.com/fatimah',
  'London',
  ARRAY['R&B', 'Neo-Soul', 'Jazz'],
  'Neo-soul selector with a love for smooth grooves. Perfect for intimate venues and chill vibes.',
  'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=400&fit=crop',
  4.6,
  14,
  220,
  false,
  NOW() - INTERVAL '2 months',
  NOW()
),

-- DJ 10: Connor O''Brien
(
  gen_random_uuid(),
  'Connor OB',
  'Connor O''Brien',
  'connorob',
  '@connorobmusic',
  'soundcloud.com/connorob',
  'Liverpool',
  ARRAY['House', 'UK Garage', 'Bassline'],
  'Liverpool house and garage DJ. Bringing back the 2-step vibes. Available for bookings nationwide.',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop',
  4.7,
  16,
  260,
  false,
  NOW() - INTERVAL '4 months',
  NOW()
),

-- DJ 11: Nina Rodriguez
(
  gen_random_uuid(),
  'Nina R',
  'Nina Rodriguez',
  'ninar',
  '@ninarodriguez',
  'soundcloud.com/ninar',
  'Manchester',
  ARRAY['Techno', 'Tech House', 'Minimal'],
  'Techno purist from Manchester. Dark warehouse vibes. Long sets, deep journeys.',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
  4.9,
  30,
  480,
  true,
  NOW() - INTERVAL '10 months',
  NOW()
),

-- DJ 12: Ben Clarke
(
  gen_random_uuid(),
  'Ben Clarke',
  'Ben Clarke',
  'benclarke',
  '@benclarkemmusic',
  'soundcloud.com/benclarke',
  'Brighton',
  ARRAY['Deep House', 'Disco', 'Lounge'],
  'Brighton-based deep house DJ. Sunny beach vibes and sunset sessions. Also available for corporate events.',
  'https://images.unsplash.com/photo-1463453091185-61582044d556?w=400&h=400&fit=crop',
  4.5,
  11,
  170,
  false,
  NOW() - INTERVAL '3 months',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Add some completed gigs for realism
INSERT INTO gigs (dj_id, name, venue, event_date, payment, status, dj_rating, genre)
SELECT 
  id,
  'Summer Festival Set',
  'Hyde Park',
  CURRENT_DATE - INTERVAL '30 days',
  500.00,
  'completed',
  4.8,
  genres[1]
FROM user_profiles
WHERE dj_name IN ('Maya Chen', 'Sophie A', 'Yasmin Patel')
ON CONFLICT DO NOTHING;

-- Award some achievements automatically
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT id FROM user_profiles WHERE dj_name IN ('Maya Chen', 'Sophie A', 'Yasmin Patel', 'Olly T', 'Nina R') LOOP
        PERFORM check_and_award_achievements(user_record.id);
    END LOOP;
END $$;

-- Verify inserted data
SELECT 
  dj_name,
  city,
  ARRAY_TO_STRING(genres, ', ') as genres,
  rating,
  gigs_completed,
  is_verified,
  username
FROM user_profiles
WHERE dj_name IN ('Maya Chen', 'DJ Smooth', 'Aisha T', 'Luca Romano', 'Sophie A', 'DJ Marcus', 'Yasmin Patel', 'Olly T', 'Fatima H', 'Connor OB', 'Nina R', 'Ben Clarke')
ORDER BY created_at DESC;

