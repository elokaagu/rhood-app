-- Fix get_mutual_connections function to work with current connections schema
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_mutual_connections(user1_id UUID, user2_id UUID)
RETURNS TABLE (
  mutual_user_id UUID,
  mutual_user_name VARCHAR,
  mutual_user_dj_name VARCHAR,
  mutual_user_profile_image TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    up.id as mutual_user_id,
    up.full_name as mutual_user_name,
    up.dj_name as mutual_user_dj_name,
    up.profile_image_url as mutual_user_profile_image
  FROM connections c1
  JOIN connections c2 ON (
    -- Find the mutual user: someone connected to both user1 and user2
    -- Case 1: user1 is user_id_1 in c1, mutual is user_id_2
    (c1.user_id_1 = user1_id AND c2.user_id_1 = user2_id AND c1.user_id_2 = c2.user_id_2)
    -- Case 2: user1 is user_id_1 in c1, user2 is user_id_2 in c2
    OR (c1.user_id_1 = user1_id AND c2.user_id_2 = user2_id AND c1.user_id_2 = c2.user_id_1)
    -- Case 3: user1 is user_id_2 in c1, user2 is user_id_1 in c2
    OR (c1.user_id_2 = user1_id AND c2.user_id_1 = user2_id AND c1.user_id_1 = c2.user_id_2)
    -- Case 4: user1 is user_id_2 in c1, user2 is user_id_2 in c2
    OR (c1.user_id_2 = user1_id AND c2.user_id_2 = user2_id AND c1.user_id_1 = c2.user_id_1)
  )
  JOIN user_profiles up ON (
    -- Get the mutual user profile
    up.id = CASE 
      WHEN c1.user_id_1 = user1_id THEN c1.user_id_2
      ELSE c1.user_id_1
    END
  )
  WHERE 
    -- Only include accepted connections
    c1.status = 'accepted' 
    AND c2.status = 'accepted'
    -- Exclude the two users themselves
    AND up.id != user1_id 
    AND up.id != user2_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_mutual_connections TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_mutual_connections IS 'Returns mutual connections between two users (users connected to both user1 and user2)';

