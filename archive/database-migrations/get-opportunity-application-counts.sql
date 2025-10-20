-- Function to get user's daily application count and remaining applications
-- Run this in your Supabase SQL editor

-- Create a function to get user's daily application stats
CREATE OR REPLACE FUNCTION get_user_daily_application_stats(user_uuid UUID)
RETURNS TABLE (
  daily_count INTEGER,
  remaining_applications INTEGER,
  can_apply BOOLEAN
) AS $$
DECLARE
  daily_applications INTEGER;
  max_daily_applications INTEGER := 5;
BEGIN
  -- Count applications made by the user today
  SELECT COUNT(*)
  INTO daily_applications
  FROM applications
  WHERE user_id = user_uuid
    AND DATE(applied_at) = CURRENT_DATE;

  -- Return the stats
  RETURN QUERY
  SELECT 
    COALESCE(daily_applications, 0)::INTEGER as daily_count,
    (max_daily_applications - COALESCE(daily_applications, 0))::INTEGER as remaining_applications,
    (COALESCE(daily_applications, 0) < max_daily_applications)::BOOLEAN as can_apply;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_daily_application_stats(UUID) TO authenticated;

-- Test the function (replace with actual user UUID)
-- SELECT * FROM get_user_daily_application_stats('your-user-uuid-here');
