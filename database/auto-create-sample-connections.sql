-- Auto-create sample connections using existing users
-- This script will create connections between your existing users automatically

-- First, let's see what users we have
SELECT id, dj_name, city FROM user_profiles ORDER BY created_at LIMIT 5;

-- Then create connections between them (this will work with any number of users)
WITH user_pairs AS (
  SELECT 
    u1.id as user1_id,
    u2.id as user2_id,
    ROW_NUMBER() OVER (ORDER BY u1.created_at, u2.created_at) as pair_num
  FROM user_profiles u1
  CROSS JOIN user_profiles u2
  WHERE u1.id != u2.id
  LIMIT 10  -- Create up to 10 connections
)
INSERT INTO connections (follower_id, following_id)
SELECT user1_id, user2_id FROM user_pairs
WHERE pair_num <= 5  -- Limit to 5 connections to start
ON CONFLICT (follower_id, following_id) DO NOTHING;

-- Check the results
SELECT 
  c.*,
  f.dj_name as follower_name,
  fl.dj_name as following_name
FROM connections c
JOIN user_profiles f ON c.follower_id = f.id
JOIN user_profiles fl ON c.following_id = fl.id
ORDER BY c.created_at DESC;
