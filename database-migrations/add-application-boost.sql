-- Add Boost functionality to Applications
-- Run this in your Supabase SQL editor

-- ============================================
-- STEP 1: Add boost columns to applications table
-- ============================================
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS is_boosted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS boost_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS boost_credits_cost INTEGER DEFAULT 10;

-- Create index for faster boosted applications queries
CREATE INDEX IF NOT EXISTS idx_applications_boosted ON applications(is_boosted, boost_expires_at) WHERE is_boosted = true;

-- ============================================
-- STEP 2: Function to boost an application
-- ============================================
CREATE OR REPLACE FUNCTION boost_application(
  application_id_param UUID,
  boost_duration_hours INTEGER DEFAULT 24,
  credits_cost INTEGER DEFAULT 10
)
RETURNS BOOLEAN AS $$
DECLARE
  application_record RECORD;
  user_credits INTEGER;
  boost_expires TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get application details
  SELECT a.*, up.credits
  INTO application_record
  FROM applications a
  JOIN user_profiles up ON a.user_id = up.id
  WHERE a.id = application_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found.';
  END IF;
  
  -- Check if user has enough credits
  user_credits := COALESCE(application_record.credits, 0);
  IF user_credits < credits_cost THEN
    RAISE EXCEPTION 'Insufficient credits. You need % credits to boost this application.', credits_cost;
  END IF;
  
  -- Check if already boosted and not expired
  IF application_record.is_boosted = true AND application_record.boost_expires_at > NOW() THEN
    RAISE EXCEPTION 'Application is already boosted.';
  END IF;
  
  -- Calculate boost expiration time
  boost_expires := NOW() + (boost_duration_hours || ' hours')::INTERVAL;
  
  -- Deduct credits from user
  UPDATE user_profiles
  SET credits = credits - credits_cost,
      updated_at = NOW()
  WHERE id = application_record.user_id;
  
  -- Update application with boost
  UPDATE applications
  SET is_boosted = true,
      boost_expires_at = boost_expires,
      boost_credits_cost = credits_cost,
      updated_at = NOW()
  WHERE id = application_id_param;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 3: Function to check and expire boosts
-- ============================================
CREATE OR REPLACE FUNCTION expire_boosted_applications()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  -- Update expired boosts
  UPDATE applications
  SET is_boosted = false,
      updated_at = NOW()
  WHERE is_boosted = true 
    AND boost_expires_at IS NOT NULL 
    AND boost_expires_at < NOW();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 4: Update get_applications_for_review to sort by boost
-- ============================================
CREATE OR REPLACE FUNCTION get_applications_for_review(
  organizer_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
  application_id UUID,
  applicant_name VARCHAR(50),
  applicant_email TEXT,
  opportunity_title VARCHAR(200),
  application_message TEXT,
  application_status VARCHAR(20),
  applied_at TIMESTAMP WITH TIME ZONE,
  applicant_profile_url TEXT,
  is_boosted BOOLEAN,
  boost_expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- First, expire any boosted applications that have expired
  PERFORM expire_boosted_applications();
  
  RETURN QUERY
  SELECT 
    a.id as application_id,
    up.dj_name as applicant_name,
    up.email as applicant_email,
    o.title as opportunity_title,
    a.message as application_message,
    a.status as application_status,
    a.created_at as applied_at,
    up.profile_image_url as applicant_profile_url,
    COALESCE(a.is_boosted, false) as is_boosted,
    a.boost_expires_at
  FROM applications a
  JOIN user_profiles up ON a.user_id = up.id
  JOIN opportunities o ON a.opportunity_id = o.id
  WHERE o.organizer_id = organizer_user_id
  ORDER BY 
    -- Boosted applications first (active boosts only)
    CASE WHEN a.is_boosted = true AND a.boost_expires_at > NOW() THEN 0 ELSE 1 END,
    -- Then by application date (most recent first)
    a.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 5: Grant permissions
-- ============================================
GRANT EXECUTE ON FUNCTION boost_application(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION expire_boosted_applications() TO authenticated;

-- ============================================
-- STEP 6: Create a scheduled job to expire boosts (optional)
-- This would need to be set up in Supabase cron or external scheduler
-- ============================================
-- You can call expire_boosted_applications() periodically
-- or call it before fetching applications (as done in get_applications_for_review)

-- Success message
SELECT 'Application boost functionality added successfully!' as result;

