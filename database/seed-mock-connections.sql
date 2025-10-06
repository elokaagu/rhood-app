-- Seed Mock Connections between DJs
-- Run this AFTER seed-mock-users.sql and create-connections-table.sql
-- This creates a network of connections between the mock DJs

-- Helper: Get user IDs by DJ name
DO $$
DECLARE
  maya_id UUID;
  james_id UUID;
  aisha_id UUID;
  luca_id UUID;
  sophie_id UUID;
  marcus_id UUID;
  yasmin_id UUID;
  oliver_id UUID;
  fatima_id UUID;
  connor_id UUID;
  nina_id UUID;
  ben_id UUID;
  main_user_id UUID; -- The actual logged-in user
BEGIN
  -- Get mock user IDs
  SELECT id INTO maya_id FROM user_profiles WHERE dj_name = 'Maya Chen';
  SELECT id INTO james_id FROM user_profiles WHERE dj_name = 'DJ Smooth';
  SELECT id INTO aisha_id FROM user_profiles WHERE dj_name = 'Aisha T';
  SELECT id INTO luca_id FROM user_profiles WHERE dj_name = 'Luca Romano';
  SELECT id INTO sophie_id FROM user_profiles WHERE dj_name = 'Sophie A';
  SELECT id INTO marcus_id FROM user_profiles WHERE dj_name = 'DJ Marcus';
  SELECT id INTO yasmin_id FROM user_profiles WHERE dj_name = 'Yasmin Patel';
  SELECT id INTO oliver_id FROM user_profiles WHERE dj_name = 'Olly T';
  SELECT id INTO fatima_id FROM user_profiles WHERE dj_name = 'Fatima H';
  SELECT id INTO connor_id FROM user_profiles WHERE dj_name = 'Connor OB';
  SELECT id INTO nina_id FROM user_profiles WHERE dj_name = 'Nina R';
  SELECT id INTO ben_id FROM user_profiles WHERE dj_name = 'Ben Clarke';
  
  -- Try to get the main user (Eloka Agu or first user created)
  SELECT id INTO main_user_id FROM user_profiles 
  WHERE dj_name = 'Eloka Agu' OR dj_name = 'Eloka' 
  ORDER BY created_at ASC 
  LIMIT 1;
  
  -- If no main user found, skip connections to main user
  IF main_user_id IS NOT NULL THEN
    -- Create connections between main user and mock DJs (accepted)
    INSERT INTO connections (user_id_1, user_id_2, status, initiated_by, accepted_at)
    VALUES
      (LEAST(main_user_id, maya_id), GREATEST(main_user_id, maya_id), 'accepted', maya_id, NOW() - INTERVAL '2 months'),
      (LEAST(main_user_id, aisha_id), GREATEST(main_user_id, aisha_id), 'accepted', main_user_id, NOW() - INTERVAL '1 month'),
      (LEAST(main_user_id, sophie_id), GREATEST(main_user_id, sophie_id), 'accepted', sophie_id, NOW() - INTERVAL '3 months'),
      (LEAST(main_user_id, yasmin_id), GREATEST(main_user_id, yasmin_id), 'accepted', main_user_id, NOW() - INTERVAL '15 days'),
      (LEAST(main_user_id, oliver_id), GREATEST(main_user_id, oliver_id), 'accepted', oliver_id, NOW() - INTERVAL '1 week')
    ON CONFLICT (user_id_1, user_id_2) DO NOTHING;
    
    -- Create some pending connection requests to main user
    INSERT INTO connections (user_id_1, user_id_2, status, initiated_by)
    VALUES
      (LEAST(main_user_id, james_id), GREATEST(main_user_id, james_id), 'pending', james_id),
      (LEAST(main_user_id, luca_id), GREATEST(main_user_id, luca_id), 'pending', luca_id)
    ON CONFLICT (user_id_1, user_id_2) DO NOTHING;
  END IF;
  
  -- Create connections between mock DJs (realistic network)
  INSERT INTO connections (user_id_1, user_id_2, status, initiated_by, accepted_at)
  VALUES
    -- London techno scene connections
    (LEAST(maya_id, yasmin_id), GREATEST(maya_id, yasmin_id), 'accepted', maya_id, NOW() - INTERVAL '4 months'),
    (LEAST(maya_id, luca_id), GREATEST(maya_id, luca_id), 'accepted', luca_id, NOW() - INTERVAL '2 months'),
    (LEAST(yasmin_id, luca_id), GREATEST(yasmin_id, luca_id), 'accepted', yasmin_id, NOW() - INTERVAL '1 month'),
    
    -- Sophie knows everyone (well-connected)
    (LEAST(sophie_id, maya_id), GREATEST(sophie_id, maya_id), 'accepted', sophie_id, NOW() - INTERVAL '6 months'),
    (LEAST(sophie_id, aisha_id), GREATEST(sophie_id, aisha_id), 'accepted', aisha_id, NOW() - INTERVAL '3 months'),
    (LEAST(sophie_id, nina_id), GREATEST(sophie_id, nina_id), 'accepted', sophie_id, NOW() - INTERVAL '5 months'),
    (LEAST(sophie_id, oliver_id), GREATEST(sophie_id, oliver_id), 'accepted', oliver_id, NOW() - INTERVAL '4 months'),
    
    -- R&B / Soul DJs network
    (LEAST(james_id, fatima_id), GREATEST(james_id, fatima_id), 'accepted', james_id, NOW() - INTERVAL '2 months'),
    (LEAST(james_id, marcus_id), GREATEST(james_id, marcus_id), 'accepted', marcus_id, NOW() - INTERVAL '3 months'),
    (LEAST(fatima_id, aisha_id), GREATEST(fatima_id, aisha_id), 'accepted', fatima_id, NOW() - INTERVAL '1 month'),
    
    -- Northern DJs network
    (LEAST(connor_id, marcus_id), GREATEST(connor_id, marcus_id), 'accepted', connor_id, NOW() - INTERVAL '2 months'),
    (LEAST(connor_id, james_id), GREATEST(connor_id, james_id), 'accepted', james_id, NOW() - INTERVAL '4 months'),
    (LEAST(oliver_id, nina_id), GREATEST(oliver_id, nina_id), 'accepted', nina_id, NOW() - INTERVAL '6 months'),
    
    -- House music connections
    (LEAST(ben_id, luca_id), GREATEST(ben_id, luca_id), 'accepted', ben_id, NOW() - INTERVAL '1 month'),
    (LEAST(ben_id, marcus_id), GREATEST(ben_id, marcus_id), 'accepted', marcus_id, NOW() - INTERVAL '2 months'),
    
    -- Cross-genre connections
    (LEAST(aisha_id, marcus_id), GREATEST(aisha_id, marcus_id), 'accepted', aisha_id, NOW() - INTERVAL '5 days'),
    (LEAST(nina_id, yasmin_id), GREATEST(nina_id, yasmin_id), 'accepted', nina_id, NOW() - INTERVAL '3 weeks')
  ON CONFLICT (user_id_1, user_id_2) DO NOTHING;
  
  -- Create some pending requests between mock DJs
  INSERT INTO connections (user_id_1, user_id_2, status, initiated_by)
  VALUES
    (LEAST(ben_id, sophie_id), GREATEST(ben_id, sophie_id), 'pending', ben_id),
    (LEAST(connor_id, yasmin_id), GREATEST(connor_id, yasmin_id), 'pending', connor_id),
    (LEAST(fatima_id, luca_id), GREATEST(fatima_id, luca_id), 'pending', fatima_id)
  ON CONFLICT (user_id_1, user_id_2) DO NOTHING;
  
END $$;

-- Verify connections created
SELECT 
  up1.dj_name as user_1,
  up2.dj_name as user_2,
  c.status,
  up3.dj_name as initiated_by,
  c.accepted_at
FROM connections c
JOIN user_profiles up1 ON up1.id = c.user_id_1
JOIN user_profiles up2 ON up2.id = c.user_id_2
JOIN user_profiles up3 ON up3.id = c.initiated_by
ORDER BY c.created_at DESC
LIMIT 20;

-- Count connections by status
SELECT 
  status,
  COUNT(*) as count
FROM connections
GROUP BY status;

