-- Fix get_user_connections RPC function type mismatch
-- Run this in your Supabase SQL Editor

-- Drop the existing function
DROP FUNCTION IF EXISTS get_user_connections(UUID, VARCHAR);

-- Recreate with explicit TEXT casting
CREATE OR REPLACE FUNCTION get_user_connections(user_uuid UUID)
RETURNS TABLE (
  connected_user_id UUID,
  connected_user_name TEXT,
  connected_user_image TEXT,
  connection_status TEXT,
  initiated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN c.user_id_1 = user_uuid THEN c.user_id_2
      ELSE c.user_id_1
    END as connected_user_id,
    CASE 
      WHEN c.user_id_1 = user_uuid THEN COALESCE(up2.dj_name, up2.full_name, 'Unknown User')::TEXT
      ELSE COALESCE(up1.dj_name, up1.full_name, 'Unknown User')::TEXT
    END as connected_user_name,
    CASE 
      WHEN c.user_id_1 = user_uuid THEN up2.profile_image_url::TEXT
      ELSE up1.profile_image_url::TEXT
    END as connected_user_image,
    c.status::TEXT as connection_status,
    c.initiated_by,
    c.created_at,
    c.accepted_at
  FROM connections c
  LEFT JOIN user_profiles up1 ON c.user_id_1 = up1.id
  LEFT JOIN user_profiles up2 ON c.user_id_2 = up2.id
  WHERE c.user_id_1 = user_uuid OR c.user_id_2 = user_uuid
  ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the function
SELECT * FROM get_user_connections('64ee29a2-dfd1-4c0a-824a-81b15398ff32'::UUID);

COMMENT ON FUNCTION get_user_connections IS 'Fixed function to get user connections with proper TEXT types';
