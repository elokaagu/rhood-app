-- ============================================================================
-- CRITICAL: boost_application — any authenticated user can spend ANY OTHER
-- user's credits by passing that user's application_id
-- ----------------------------------------------------------------------------
-- The function looks up the application, then deducts credits from
-- `application_record.user_id` (whoever the application actually belongs to)
-- — but never checks that the CALLER is that same user. Any authenticated
-- caller can pass a stranger's application_id (application ids are exposed to
-- organizers via get_applications_for_review) and:
--   supabase.rpc('boost_application', { application_id_param: '<someone else's application>' })
-- boosts THAT application while draining THAT PERSON's credit balance,
-- without their consent and at zero cost to the caller.
--
-- Fix: require the caller to actually own the application being boosted.
--
-- Run in Supabase SQL Editor. Safe to run multiple times (idempotent).
-- ============================================================================

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
  caller_id UUID := auth.uid();
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  SELECT a.*, up.credits
  INTO application_record
  FROM applications a
  JOIN user_profiles up ON a.user_id = up.id
  WHERE a.id = application_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found.';
  END IF;

  -- The fix: only the applicant who owns this application may boost it —
  -- and only their own credits are ever at stake.
  IF application_record.user_id != caller_id THEN
    RAISE EXCEPTION 'You can only boost your own applications.';
  END IF;

  user_credits := COALESCE(application_record.credits, 0);
  IF user_credits < credits_cost THEN
    RAISE EXCEPTION 'Insufficient credits. You need % credits to boost this application.', credits_cost;
  END IF;

  IF application_record.is_boosted = true AND application_record.boost_expires_at > NOW() THEN
    RAISE EXCEPTION 'Application is already boosted.';
  END IF;

  boost_expires := NOW() + (boost_duration_hours || ' hours')::INTERVAL;

  UPDATE user_profiles
  SET credits = credits - credits_cost,
      updated_at = NOW()
  WHERE id = application_record.user_id;

  UPDATE applications
  SET is_boosted = true,
      boost_expires_at = boost_expires,
      boost_credits_cost = credits_cost,
      updated_at = NOW()
  WHERE id = application_id_param;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION boost_application(UUID, INTEGER, INTEGER) TO authenticated;

-- Verify: sign in as a user who does NOT own application X and run
-- (should raise "You can only boost your own applications."):
--   SELECT boost_application('<some other user''s application id>');
