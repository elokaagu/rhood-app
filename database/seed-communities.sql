-- Create sample communities in the database
-- Run this in your Supabase SQL Editor

-- First, let's check if we have any users to create communities for
SELECT id, dj_name FROM user_profiles LIMIT 5;

-- Create sample communities
INSERT INTO communities (id, name, description, member_count, created_by) 
VALUES 
  ('aa00a0aa-1111-1111-1111-111111111111', 'Underground DJs', 'Connect with underground DJs worldwide', 1234, (SELECT id FROM user_profiles LIMIT 1)),
  ('bb11b1bb-2222-2222-2222-222222222222', 'Techno Collective', 'Share techno tracks and collaborate', 856, (SELECT id FROM user_profiles LIMIT 1)),
  ('cc22c2cc-3333-3333-3333-333333333333', 'Miami Music Scene', 'Local Miami DJs and producers', 432, (SELECT id FROM user_profiles LIMIT 1)),
  ('dd33d3dd-4444-4444-4444-444444444444', 'Deep House Vibes', 'Deep house enthusiasts and producers', 678, (SELECT id FROM user_profiles LIMIT 1)),
  ('ee44e4ee-5555-5555-5555-555555555555', 'Berlin Electronic', 'Berlin''s electronic music community', 2341, (SELECT id FROM user_profiles LIMIT 1))
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  member_count = EXCLUDED.member_count;

-- Add some sample members to communities
-- Add current user to a few communities
INSERT INTO community_members (community_id, user_id, role) 
SELECT 
  'aa00a0aa-1111-1111-1111-111111111111',
  id,
  'member'
FROM user_profiles 
LIMIT 1
ON CONFLICT (community_id, user_id) DO NOTHING;

INSERT INTO community_members (community_id, user_id, role) 
SELECT 
  'cc22c2cc-3333-3333-3333-333333333333',
  id,
  'member'
FROM user_profiles 
LIMIT 1
ON CONFLICT (community_id, user_id) DO NOTHING;

INSERT INTO community_members (community_id, user_id, role) 
SELECT 
  'ee44e4ee-5555-5555-5555-555555555555',
  id,
  'member'
FROM user_profiles 
LIMIT 1
ON CONFLICT (community_id, user_id) DO NOTHING;

-- Add some other users to communities to make them more realistic
INSERT INTO community_members (community_id, user_id, role) 
SELECT 
  'bb11b1bb-2222-2222-2222-222222222222',
  id,
  'member'
FROM user_profiles 
LIMIT 3
ON CONFLICT (community_id, user_id) DO NOTHING;

INSERT INTO community_members (community_id, user_id, role) 
SELECT 
  'dd33d3dd-4444-4444-4444-444444444444',
  id,
  'member'
FROM user_profiles 
LIMIT 2
ON CONFLICT (community_id, user_id) DO NOTHING;

-- Verify the communities were created
SELECT 
  c.id,
  c.name,
  c.description,
  c.member_count,
  COUNT(cm.user_id) as actual_members
FROM communities c
LEFT JOIN community_members cm ON c.id = cm.community_id
GROUP BY c.id, c.name, c.description, c.member_count
ORDER BY c.member_count DESC;
