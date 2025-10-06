-- ============================================
-- COMPLETE CONNECTIONS SETUP FOR R/HOOD
-- ============================================
-- This file will:
-- 1. Create user_profiles table if it doesn't exist
-- 2. Add all missing columns to user_profiles
-- 3. Create connections table
-- 4. Insert 12 mock DJ profiles
-- 5. Create connections between them
--
-- Run this SINGLE file in Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 0: Create user_profiles table if needed
-- ============================================

-- Create the base user_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dj_name VARCHAR(50) NOT NULL,
  city VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
  RAISE NOTICE '✅ user_profiles table exists (created if needed)';
END $$;

-- ============================================
-- STEP 1: Add all columns to user_profiles
-- ============================================

DO $$ 
BEGIN
    -- Add full_name
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'full_name'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN full_name VARCHAR(100);
        RAISE NOTICE '✅ Added full_name column';
    END IF;

    -- Add username
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'username'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN username VARCHAR(50);
        RAISE NOTICE '✅ Added username column';
    END IF;

    -- Add instagram
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'instagram'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN instagram VARCHAR(100);
        RAISE NOTICE '✅ Added instagram column';
    END IF;

    -- Add soundcloud
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'soundcloud'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN soundcloud VARCHAR(200);
        RAISE NOTICE '✅ Added soundcloud column';
    END IF;

    -- Add genres
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'genres'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN genres TEXT[] DEFAULT '{}';
        RAISE NOTICE '✅ Added genres column';
    END IF;

    -- Add bio
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'bio'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN bio TEXT;
        RAISE NOTICE '✅ Added bio column';
    END IF;

    -- Add profile_image_url
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'profile_image_url'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN profile_image_url TEXT;
        RAISE NOTICE '✅ Added profile_image_url column';
    END IF;

    -- Add rating
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'rating'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN rating DECIMAL(2,1) DEFAULT 0.0;
        RAISE NOTICE '✅ Added rating column';
    END IF;

    -- Add gigs_completed
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'gigs_completed'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN gigs_completed INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Added gigs_completed column';
    END IF;

    -- Add credits
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'credits'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN credits INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Added credits column';
    END IF;

    -- Add is_verified
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'is_verified'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN is_verified BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added is_verified column';
    END IF;

    -- Add updated_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '✅ Added updated_at column';
    END IF;

    RAISE NOTICE '==========================================';
    RAISE NOTICE '✅ user_profiles schema is ready!';
    RAISE NOTICE '==========================================';
END $$;

-- Add unique constraint to username if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_profiles_username_key'
    ) THEN
        ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_username_key UNIQUE (username);
        RAISE NOTICE '✅ Added unique constraint to username';
    END IF;
END $$;

-- ============================================
-- STEP 2: Create connections table
-- ============================================

-- Drop connections table if it exists (fresh start)
DROP TABLE IF EXISTS connections CASCADE;

CREATE TABLE connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id_1 UUID NOT NULL,
  user_id_2 UUID NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  initiated_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  CHECK (user_id_1 < user_id_2),
  UNIQUE(user_id_1, user_id_2)
);

-- Add foreign key constraints AFTER table creation
ALTER TABLE connections
  ADD CONSTRAINT connections_user_id_1_fkey
  FOREIGN KEY (user_id_1) REFERENCES user_profiles(id) ON DELETE CASCADE;

ALTER TABLE connections
  ADD CONSTRAINT connections_user_id_2_fkey
  FOREIGN KEY (user_id_2) REFERENCES user_profiles(id) ON DELETE CASCADE;

ALTER TABLE connections
  ADD CONSTRAINT connections_initiated_by_fkey
  FOREIGN KEY (initiated_by) REFERENCES user_profiles(id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX idx_connections_user_id_1 ON connections(user_id_1);
CREATE INDEX idx_connections_user_id_2 ON connections(user_id_2);
CREATE INDEX idx_connections_status ON connections(status);
CREATE INDEX idx_connections_initiated_by ON connections(initiated_by);

DO $$
BEGIN
  RAISE NOTICE '✅ connections table created with foreign keys';
END $$;

-- Enable Row Level Security
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own connections" ON connections;
DROP POLICY IF EXISTS "Users can create connections" ON connections;
DROP POLICY IF EXISTS "Users can update their connections" ON connections;
DROP POLICY IF EXISTS "Users can delete their connections" ON connections;

-- Create RLS policies
CREATE POLICY "Users can view their own connections"
  ON connections FOR SELECT
  USING (auth.uid()::text = user_id_1::text OR auth.uid()::text = user_id_2::text);

CREATE POLICY "Users can create connections"
  ON connections FOR INSERT
  WITH CHECK (auth.uid()::text = initiated_by::text);

CREATE POLICY "Users can update their connections"
  ON connections FOR UPDATE
  USING (auth.uid()::text = user_id_1::text OR auth.uid()::text = user_id_2::text);

CREATE POLICY "Users can delete their connections"
  ON connections FOR DELETE
  USING (auth.uid()::text = user_id_1::text OR auth.uid()::text = user_id_2::text);

-- ============================================
-- STEP 3: Create helper functions
-- ============================================

-- Function to normalize connection user IDs
CREATE OR REPLACE FUNCTION normalize_connection_user_ids()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id_1 > NEW.user_id_2 THEN
    DECLARE temp_id UUID;
    BEGIN
      temp_id := NEW.user_id_1;
      NEW.user_id_1 := NEW.user_id_2;
      NEW.user_id_2 := temp_id;
    END;
  END IF;
  
  IF NEW.user_id_1 = NEW.user_id_2 THEN
    RAISE EXCEPTION 'Cannot create connection with yourself';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER normalize_connection_trigger
BEFORE INSERT ON connections
FOR EACH ROW
EXECUTE FUNCTION normalize_connection_user_ids();

-- Function to update accepted_at
CREATE OR REPLACE FUNCTION update_connection_accepted_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    NEW.accepted_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_connection_accepted_at_trigger
BEFORE UPDATE ON connections
FOR EACH ROW
EXECUTE FUNCTION update_connection_accepted_at();

-- Function to get user connections
CREATE OR REPLACE FUNCTION get_user_connections(p_user_id UUID, p_status VARCHAR DEFAULT 'accepted')
RETURNS TABLE (
  connection_id UUID,
  connected_user_id UUID,
  connected_user_name VARCHAR,
  connected_user_username VARCHAR,
  connected_user_city VARCHAR,
  connected_user_genres TEXT[],
  connected_user_image TEXT,
  connected_user_rating DECIMAL,
  connected_user_gigs INTEGER,
  connected_user_verified BOOLEAN,
  connection_status VARCHAR,
  connected_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as connection_id,
    CASE 
      WHEN c.user_id_1 = p_user_id THEN c.user_id_2
      ELSE c.user_id_1
    END as connected_user_id,
    up.dj_name as connected_user_name,
    up.username as connected_user_username,
    up.city as connected_user_city,
    up.genres as connected_user_genres,
    up.profile_image_url as connected_user_image,
    up.rating as connected_user_rating,
    up.gigs_completed as connected_user_gigs,
    up.is_verified as connected_user_verified,
    c.status as connection_status,
    c.accepted_at as connected_at
  FROM connections c
  JOIN user_profiles up ON (
    CASE 
      WHEN c.user_id_1 = p_user_id THEN up.id = c.user_id_2
      ELSE up.id = c.user_id_1
    END
  )
  WHERE 
    (c.user_id_1 = p_user_id OR c.user_id_2 = p_user_id)
    AND (p_status IS NULL OR c.status = p_status)
  ORDER BY c.accepted_at DESC NULLS LAST, c.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  RAISE NOTICE '✅ Helper functions and triggers created';
END $$;

-- ============================================
-- STEP 4: Insert 12 mock DJ profiles
-- ============================================

INSERT INTO user_profiles (
  id, email, dj_name, first_name, full_name, username, instagram, soundcloud, city, genres, bio,
  profile_image_url, rating, gigs_completed, credits, is_verified, created_at, updated_at
) VALUES 
('11111111-1111-1111-1111-111111111111'::uuid, 'maya.chen@rhoodapp.com', 'Maya Chen', 'Maya', 'Maya Chen', 'mayachen', '@mayachenmusic', 'soundcloud.com/mayachen', 'London', 
  ARRAY['Techno', 'House', 'Electronic'], 'Techno DJ and producer from London. Resident at Fabric.',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400', 4.9, 28, 420, true, NOW() - INTERVAL '6 months', NOW()),
  
('22222222-2222-2222-2222-222222222222'::uuid, 'james.martinez@rhoodapp.com', 'DJ Smooth', 'James', 'James Martinez', 'djsmooth', '@djsmoothofficial', 'soundcloud.com/djsmooth', 'Manchester',
  ARRAY['R&B', 'Soul', 'Hip-Hop'], 'Manchester-based R&B selector. 90s classics specialist.',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', 4.7, 15, 250, false, NOW() - INTERVAL '4 months', NOW()),
  
('33333333-3333-3333-3333-333333333333'::uuid, 'aisha.thompson@rhoodapp.com', 'Aisha T', 'Aisha', 'Aisha Thompson', 'aishat', '@aishatmusic', 'soundcloud.com/aishat', 'Birmingham',
  ARRAY['Afrobeats', 'Dancehall', 'Hip-Hop'], 'Bringing Afrobeats energy to Birmingham nightlife.',
  'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400', 4.8, 22, 380, true, NOW() - INTERVAL '8 months', NOW()),
  
('44444444-4444-4444-4444-444444444444'::uuid, 'luca.romano@rhoodapp.com', 'Luca Romano', 'Luca', 'Luca Romano', 'lucaromano', '@lucaromanomusic', 'soundcloud.com/lucaromano', 'London',
  ARRAY['Deep House', 'Tech House'], 'Italian DJ bringing Mediterranean vibes to London.',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400', 4.6, 12, 180, false, NOW() - INTERVAL '3 months', NOW()),
  
('55555555-5555-5555-5555-555555555555'::uuid, 'sophie.anderson@rhoodapp.com', 'Sophie A', 'Sophie', 'Sophie Anderson', 'sophiea', '@sophieamusic', 'soundcloud.com/sophiea', 'Bristol',
  ARRAY['Drum & Bass', 'Jungle'], 'Bristol DnB selector. High-energy sets for the ravers.',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400', 5.0, 35, 550, true, NOW() - INTERVAL '1 year', NOW()),
  
('66666666-6666-6666-6666-666666666666'::uuid, 'marcus.williams@rhoodapp.com', 'DJ Marcus', 'Marcus', 'Marcus Williams', 'djmarcus', '@marcuswilliamsmusic', 'soundcloud.com/djmarcus', 'Leeds',
  ARRAY['House', 'Disco', 'Funk'], 'Funk and disco lover from Leeds. Bringing the groove back.',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400', 4.7, 18, 290, false, NOW() - INTERVAL '5 months', NOW()),
  
('77777777-7777-7777-7777-777777777777'::uuid, 'yasmin.patel@rhoodapp.com', 'Yasmin Patel', 'Yasmin', 'Yasmin Patel', 'yasminpatel', '@yasminpatelmusic', 'soundcloud.com/yasminpatel', 'London',
  ARRAY['Trance', 'Progressive House'], 'London trance DJ creating euphoric moments.',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400', 4.9, 26, 410, true, NOW() - INTERVAL '7 months', NOW()),
  
('88888888-8888-8888-8888-888888888888'::uuid, 'oliver.taylor@rhoodapp.com', 'Olly T', 'Oliver', 'Oliver Taylor', 'ollyt', '@ollytmusic', 'soundcloud.com/ollyt', 'Glasgow',
  ARRAY['Techno', 'Minimal'], 'Glasgow underground techno. Dark, driving, hypnotic.',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400', 4.8, 20, 340, true, NOW() - INTERVAL '9 months', NOW()),
  
('99999999-9999-9999-9999-999999999999'::uuid, 'fatima.hassan@rhoodapp.com', 'Fatima H', 'Fatima', 'Fatima Hassan', 'fatimah', '@fatimahassan', 'soundcloud.com/fatimah', 'London',
  ARRAY['R&B', 'Neo-Soul', 'Jazz'], 'Neo-soul selector with smooth grooves.',
  'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400', 4.6, 14, 220, false, NOW() - INTERVAL '2 months', NOW()),
  
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'connor.obrien@rhoodapp.com', 'Connor OB', 'Connor', 'Connor O''Brien', 'connorob', '@connorobmusic', 'soundcloud.com/connorob', 'Liverpool',
  ARRAY['House', 'UK Garage'], 'Liverpool house and garage DJ. 2-step vibes.',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400', 4.7, 16, 260, false, NOW() - INTERVAL '4 months', NOW()),
  
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'nina.rodriguez@rhoodapp.com', 'Nina R', 'Nina', 'Nina Rodriguez', 'ninar', '@ninarodriguez', 'soundcloud.com/ninar', 'Manchester',
  ARRAY['Techno', 'Tech House'], 'Techno purist from Manchester. Dark warehouse vibes.',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400', 4.9, 30, 480, true, NOW() - INTERVAL '10 months', NOW()),
  
('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'ben.clarke@rhoodapp.com', 'Ben Clarke', 'Ben', 'Ben Clarke', 'benclarke', '@benclarkemusic', 'soundcloud.com/benclarke', 'Brighton',
  ARRAY['Deep House', 'Disco'], 'Brighton deep house DJ. Sunny beach vibes.',
  'https://images.unsplash.com/photo-1463453091185-61582044d556?w=400', 4.5, 11, 170, false, NOW() - INTERVAL '3 months', NOW())
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
  inserted_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO inserted_count FROM user_profiles 
  WHERE id IN (
    '11111111-1111-1111-1111-111111111111'::uuid,
    '22222222-2222-2222-2222-222222222222'::uuid,
    '33333333-3333-3333-3333-333333333333'::uuid,
    '44444444-4444-4444-4444-444444444444'::uuid,
    '55555555-5555-5555-5555-555555555555'::uuid,
    '66666666-6666-6666-6666-666666666666'::uuid,
    '77777777-7777-7777-7777-777777777777'::uuid,
    '88888888-8888-8888-8888-888888888888'::uuid,
    '99999999-9999-9999-9999-999999999999'::uuid,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
    'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid
  );
  RAISE NOTICE '✅ Mock DJ profiles ready (% DJs)', inserted_count;
END $$;

-- ============================================
-- STEP 5: Create connections between DJs
-- ============================================

DO $$
DECLARE
  main_user_id UUID;
  maya_id UUID := '11111111-1111-1111-1111-111111111111'::uuid;
  james_id UUID := '22222222-2222-2222-2222-222222222222'::uuid;
  aisha_id UUID := '33333333-3333-3333-3333-333333333333'::uuid;
  luca_id UUID := '44444444-4444-4444-4444-444444444444'::uuid;
  sophie_id UUID := '55555555-5555-5555-5555-555555555555'::uuid;
  marcus_id UUID := '66666666-6666-6666-6666-666666666666'::uuid;
  yasmin_id UUID := '77777777-7777-7777-7777-777777777777'::uuid;
  oliver_id UUID := '88888888-8888-8888-8888-888888888888'::uuid;
  fatima_id UUID := '99999999-9999-9999-9999-999999999999'::uuid;
  connor_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;
  nina_id UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid;
  ben_id UUID := 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid;
BEGIN
  -- Get first real user (not mock)
  SELECT id INTO main_user_id 
  FROM user_profiles 
  WHERE id NOT IN (maya_id, james_id, aisha_id, luca_id, sophie_id, marcus_id, 
                   yasmin_id, oliver_id, fatima_id, connor_id, nina_id, ben_id)
  ORDER BY created_at ASC 
  LIMIT 1;
  
  -- Connect main user to 5 DJs if they exist
  IF main_user_id IS NOT NULL THEN
    INSERT INTO connections (user_id_1, user_id_2, status, initiated_by, accepted_at) VALUES
      (LEAST(main_user_id, maya_id), GREATEST(main_user_id, maya_id), 'accepted', maya_id, NOW() - INTERVAL '2 months'),
      (LEAST(main_user_id, aisha_id), GREATEST(main_user_id, aisha_id), 'accepted', main_user_id, NOW() - INTERVAL '1 month'),
      (LEAST(main_user_id, sophie_id), GREATEST(main_user_id, sophie_id), 'accepted', sophie_id, NOW() - INTERVAL '3 months'),
      (LEAST(main_user_id, yasmin_id), GREATEST(main_user_id, yasmin_id), 'accepted', main_user_id, NOW() - INTERVAL '15 days'),
      (LEAST(main_user_id, oliver_id), GREATEST(main_user_id, oliver_id), 'accepted', oliver_id, NOW() - INTERVAL '1 week')
    ON CONFLICT DO NOTHING;
    RAISE NOTICE '✅ Connected your account to 5 DJs';
  END IF;
  
  -- Create connections between mock DJs
  INSERT INTO connections (user_id_1, user_id_2, status, initiated_by, accepted_at) VALUES
    (LEAST(maya_id, yasmin_id), GREATEST(maya_id, yasmin_id), 'accepted', maya_id, NOW() - INTERVAL '4 months'),
    (LEAST(maya_id, luca_id), GREATEST(maya_id, luca_id), 'accepted', luca_id, NOW() - INTERVAL '2 months'),
    (LEAST(sophie_id, maya_id), GREATEST(sophie_id, maya_id), 'accepted', sophie_id, NOW() - INTERVAL '6 months'),
    (LEAST(sophie_id, aisha_id), GREATEST(sophie_id, aisha_id), 'accepted', aisha_id, NOW() - INTERVAL '3 months'),
    (LEAST(sophie_id, nina_id), GREATEST(sophie_id, nina_id), 'accepted', sophie_id, NOW() - INTERVAL '5 months'),
    (LEAST(james_id, fatima_id), GREATEST(james_id, fatima_id), 'accepted', james_id, NOW() - INTERVAL '2 months'),
    (LEAST(james_id, marcus_id), GREATEST(james_id, marcus_id), 'accepted', marcus_id, NOW() - INTERVAL '3 months'),
    (LEAST(connor_id, marcus_id), GREATEST(connor_id, marcus_id), 'accepted', connor_id, NOW() - INTERVAL '2 months'),
    (LEAST(oliver_id, nina_id), GREATEST(oliver_id, nina_id), 'accepted', nina_id, NOW() - INTERVAL '6 months'),
    (LEAST(ben_id, luca_id), GREATEST(ben_id, luca_id), 'accepted', ben_id, NOW() - INTERVAL '1 month')
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE '✅ Created connections between mock DJs';
END $$;

-- ============================================
-- FINAL: Show summary
-- ============================================

DO $$
DECLARE
  user_count INTEGER;
  connection_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM user_profiles;
  SELECT COUNT(*) INTO connection_count FROM connections;
  
  RAISE NOTICE '==========================================';
  RAISE NOTICE '🎉 SETUP COMPLETE!';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Total users: %', user_count;
  RAISE NOTICE 'Total connections: %', connection_count;
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Refresh your R/HOOD app to see connections!';
  RAISE NOTICE '==========================================';
END $$;

-- Show sample connections
SELECT 
  up1.dj_name || ' ↔ ' || up2.dj_name as connection,
  c.status,
  c.accepted_at
FROM connections c
JOIN user_profiles up1 ON up1.id = c.user_id_1
JOIN user_profiles up2 ON up2.id = c.user_id_2
ORDER BY c.created_at DESC
LIMIT 10;

