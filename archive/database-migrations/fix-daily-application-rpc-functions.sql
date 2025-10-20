-- Fix daily application RPC functions to use applied_at instead of created_at
-- Run this in your Supabase SQL editor

-- Function to check if user can apply (hasn't exceeded daily limit)
CREATE OR REPLACE FUNCTION check_daily_application_limit(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  daily_count INTEGER;
  max_daily_applications INTEGER := 5;
BEGIN
  -- Count applications submitted today by this user
  SELECT COUNT(*)
  INTO daily_count
  FROM applications
  WHERE user_id = user_uuid
    AND DATE(applied_at) = CURRENT_DATE;
  
  -- Return true if under limit, false if at or over limit
  RETURN daily_count < max_daily_applications;
END;
$$ LANGUAGE plpgsql;

-- Function to get daily application count for a user
CREATE OR REPLACE FUNCTION get_daily_application_count(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  daily_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO daily_count
  FROM applications
  WHERE user_id = user_uuid
    AND DATE(applied_at) = CURRENT_DATE;
  
  RETURN daily_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get remaining applications for today
CREATE OR REPLACE FUNCTION get_remaining_daily_applications(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  daily_count INTEGER;
  max_daily_applications INTEGER := 5;
BEGIN
  SELECT COUNT(*)
  INTO daily_count
  FROM applications
  WHERE user_id = user_uuid
    AND DATE(applied_at) = CURRENT_DATE;
  
  RETURN GREATEST(0, max_daily_applications - daily_count);
END;
$$ LANGUAGE plpgsql;

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

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION check_daily_application_limit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_application_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_remaining_daily_applications(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_daily_application_stats(UUID) TO authenticated;

-- Test the functions (replace with actual user UUID)
-- SELECT * FROM get_user_daily_application_stats('your-user-uuid-here');
