-- Check community IDs in database
-- Run this in your Supabase SQL Editor to verify the community IDs

-- Check if communities exist with the correct UUIDs
SELECT id, name, description, member_count 
FROM communities 
WHERE id IN (
  'aa00a0aa-1111-1111-1111-111111111111',
  'bb11b1bb-2222-2222-2222-222222222222', 
  'cc22c2cc-3333-3333-3333-333333333333',
  'dd33d3dd-4444-4444-4444-444444444444',
  'ee44e4ee-5555-5555-5555-555555555555'
)
ORDER BY name;

-- If the communities don't exist, create them
INSERT INTO communities (id, name, description, member_count, created_by) 
VALUES 
  ('dd33d3dd-4444-4444-4444-444444444444', 'Deep House Vibes', 'Deep house enthusiasts and producers', 678, (SELECT id FROM user_profiles LIMIT 1)),
  ('ee44e4ee-5555-5555-5555-555555555555', 'Berlin Electronic', 'Berlin''s electronic music community', 2341, (SELECT id FROM user_profiles LIMIT 1))
ON CONFLICT (id) DO NOTHING;

-- Add current user to these communities
INSERT INTO community_members (community_id, user_id, role) 
SELECT 
  'dd33d3dd-4444-4444-4444-444444444444',
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
