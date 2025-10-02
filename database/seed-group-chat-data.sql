-- Sample Group Chat Data for R/HOOD App
-- Run this in your Supabase SQL Editor AFTER running create-group-chat-system.sql

-- 1. First, let's add the current user to some communities
-- (Replace with actual user IDs from your user_profiles table)
INSERT INTO community_members (community_id, user_id, role) 
SELECT 
  'aa00a0aa-1111-1111-1111-111111111111',
  id,
  'member'
FROM user_profiles 
LIMIT 3
ON CONFLICT (community_id, user_id) DO NOTHING;

INSERT INTO community_members (community_id, user_id, role) 
SELECT 
  'bb11b1bb-2222-2222-2222-222222222222',
  id,
  'member'
FROM user_profiles 
LIMIT 2
ON CONFLICT (community_id, user_id) DO NOTHING;

INSERT INTO community_members (community_id, user_id, role) 
SELECT 
  'cc22c2cc-3333-3333-3333-333333333333',
  id,
  'member'
FROM user_profiles 
LIMIT 2
ON CONFLICT (community_id, user_id) DO NOTHING;

-- 2. Add sample group messages for Underground DJs community
INSERT INTO group_messages (community_id, sender_id, content, created_at) 
SELECT 
  'aa00a0aa-1111-1111-1111-111111111111',
  (SELECT id FROM user_profiles LIMIT 1),
  'Welcome to Underground DJs! 🎧 Let''s connect and share some sick beats!',
  NOW() - INTERVAL '2 hours'
WHERE EXISTS (SELECT 1 FROM user_profiles LIMIT 1);

INSERT INTO group_messages (community_id, sender_id, content, created_at) 
SELECT 
  'aa00a0aa-1111-1111-1111-111111111111',
  (SELECT id FROM user_profiles OFFSET 1 LIMIT 1),
  'Anyone up for a collab session this weekend? I''ve got some fresh tracks to work on',
  NOW() - INTERVAL '1 hour 30 minutes'
WHERE EXISTS (SELECT 1 FROM user_profiles OFFSET 1 LIMIT 1);

INSERT INTO group_messages (community_id, sender_id, content, created_at) 
SELECT 
  'aa00a0aa-1111-1111-1111-111111111111',
  (SELECT id FROM user_profiles LIMIT 1),
  'Count me in! What genre are you thinking?',
  NOW() - INTERVAL '1 hour'
WHERE EXISTS (SELECT 1 FROM user_profiles LIMIT 1);

INSERT INTO group_messages (community_id, sender_id, content, created_at) 
SELECT 
  'aa00a0aa-1111-1111-1111-111111111111',
  (SELECT id FROM user_profiles OFFSET 2 LIMIT 1),
  'Just dropped a new underground mix on SoundCloud 🔥 Check it out!',
  NOW() - INTERVAL '45 minutes'
WHERE EXISTS (SELECT 1 FROM user_profiles OFFSET 2 LIMIT 1);

-- 3. Add sample group messages for Techno Collective community
INSERT INTO group_messages (community_id, sender_id, content, created_at) 
SELECT 
  'bb11b1bb-2222-2222-2222-222222222222',
  (SELECT id FROM user_profiles LIMIT 1),
  'New techno track dropped! Check it out 🔥',
  NOW() - INTERVAL '30 minutes'
WHERE EXISTS (SELECT 1 FROM user_profiles LIMIT 1);

INSERT INTO group_messages (community_id, sender_id, content, created_at) 
SELECT 
  'bb11b1bb-2222-2222-2222-222222222222',
  (SELECT id FROM user_profiles OFFSET 1 LIMIT 1),
  'That bassline is insane! What DAW did you use?',
  NOW() - INTERVAL '25 minutes'
WHERE EXISTS (SELECT 1 FROM user_profiles OFFSET 1 LIMIT 1);

INSERT INTO group_messages (community_id, sender_id, content, created_at) 
SELECT 
  'bb11b1bb-2222-2222-2222-222222222222',
  (SELECT id FROM user_profiles LIMIT 1),
  'Ableton Live with some custom Serum patches. The secret is in the modulation!',
  NOW() - INTERVAL '20 minutes'
WHERE EXISTS (SELECT 1 FROM user_profiles LIMIT 1);

-- 4. Add sample group messages for Miami Music Scene community
INSERT INTO group_messages (community_id, sender_id, content, created_at) 
SELECT 
  'cc22c2cc-3333-3333-3333-333333333333',
  (SELECT id FROM user_profiles LIMIT 1),
  'Miami crew! Who''s playing at Space this weekend?',
  NOW() - INTERVAL '15 minutes'
WHERE EXISTS (SELECT 1 FROM user_profiles LIMIT 1);

INSERT INTO group_messages (community_id, sender_id, content, created_at) 
SELECT 
  'cc22c2cc-3333-3333-3333-333333333333',
  (SELECT id FROM user_profiles OFFSET 1 LIMIT 1),
  'I''ll be there! Playing a deep house set from 2-4 AM',
  NOW() - INTERVAL '10 minutes'
WHERE EXISTS (SELECT 1 FROM user_profiles OFFSET 1 LIMIT 1);

INSERT INTO group_messages (community_id, sender_id, content, created_at) 
SELECT 
  'cc22c2cc-3333-3333-3333-333333333333',
  (SELECT id FROM user_profiles LIMIT 1),
  'Nice! I''ll definitely check it out. See you there!',
  NOW() - INTERVAL '5 minutes'
WHERE EXISTS (SELECT 1 FROM user_profiles LIMIT 1);

-- 5. Update community member counts
UPDATE communities SET member_count = (
  SELECT COUNT(*) FROM community_members WHERE community_id = communities.id
);

-- 6. Verify the data was inserted correctly
SELECT 
  c.name as community_name,
  COUNT(cm.user_id) as member_count,
  COUNT(gm.id) as message_count
FROM communities c
LEFT JOIN community_members cm ON c.id = cm.community_id
LEFT JOIN group_messages gm ON c.id = gm.community_id
GROUP BY c.id, c.name
ORDER BY c.name;
