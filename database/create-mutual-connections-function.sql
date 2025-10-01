-- Database function for getting mutual connections
-- Run this in your Supabase SQL editor after creating the connections system

CREATE OR REPLACE FUNCTION get_mutual_connections(user1_id UUID, user2_id UUID)
RETURNS TABLE (
  mutual_user_id UUID,
  mutual_user_name VARCHAR,
  mutual_user_dj_name VARCHAR,
  mutual_user_profile_image TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c1.following_id as mutual_user_id,
    up.full_name as mutual_user_name,
    up.dj_name as mutual_user_dj_name,
    up.profile_image_url as mutual_user_profile_image
  FROM connections c1
  JOIN connections c2 ON c1.following_id = c2.following_id
  JOIN user_profiles up ON c1.following_id = up.id
  WHERE c1.follower_id = user1_id 
    AND c2.follower_id = user2_id
    AND c1.following_id != user1_id 
    AND c1.following_id != user2_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_mutual_connections TO authenticated;
