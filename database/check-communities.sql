-- Query to check all communities in the database
-- Run this in your Supabase SQL Editor

-- Get all communities with their details
SELECT 
  c.id,
  c.name,
  c.description,
  c.member_count,
  c.created_at,
  c.created_by,
  up.dj_name as created_by_name,
  COUNT(cm.user_id) as actual_members
FROM communities c
LEFT JOIN user_profiles up ON c.created_by = up.id
LEFT JOIN community_members cm ON c.id = cm.community_id
GROUP BY c.id, c.name, c.description, c.member_count, c.created_at, c.created_by, up.dj_name
ORDER BY c.member_count DESC, c.name;

-- Get community membership details
SELECT 
  c.name as community_name,
  up.dj_name as member_name,
  cm.role,
  cm.joined_at
FROM communities c
JOIN community_members cm ON c.id = cm.community_id
JOIN user_profiles up ON cm.user_id = up.id
ORDER BY c.name, cm.joined_at DESC;

-- Count total communities
SELECT COUNT(*) as total_communities FROM communities;

-- Count total community memberships
SELECT COUNT(*) as total_memberships FROM community_members;
