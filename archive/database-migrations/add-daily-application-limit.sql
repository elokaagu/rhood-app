-- Add daily application limit functionality
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

-- Add a trigger to prevent applications if daily limit is exceeded
CREATE OR REPLACE FUNCTION prevent_exceed_daily_limit()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user has exceeded daily limit
  IF NOT check_daily_application_limit(NEW.user_id) THEN
    RAISE EXCEPTION 'Daily application limit of 5 applications has been exceeded. Please try again tomorrow.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce daily limit
DROP TRIGGER IF EXISTS enforce_daily_application_limit ON applications;
CREATE TRIGGER enforce_daily_application_limit
  BEFORE INSERT ON applications
  FOR EACH ROW
  EXECUTE FUNCTION prevent_exceed_daily_limit();

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION check_daily_application_limit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_application_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_remaining_daily_applications(UUID) TO authenticated;
