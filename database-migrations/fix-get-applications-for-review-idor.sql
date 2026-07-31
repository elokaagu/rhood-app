-- ============================================================================
-- CRITICAL: get_applications_for_review IDOR — leaks any organizer's
-- applicant PII (email, name, application message) to any authenticated user
-- ----------------------------------------------------------------------------
-- The function takes `organizer_user_id` as a caller-supplied parameter,
-- defaulting to auth.uid() but never actually checked against it. Since it's
-- SECURITY DEFINER, any authenticated user can call:
--   supabase.rpc('get_applications_for_review', { organizer_user_id: '<any other organizer>' })
-- and receive every applicant's email/name/message/photo for an opportunity
-- they don't own. The app itself only ever calls this with the caller's own
-- id (components/AdminApplicationsScreen.js), so ignoring whatever the caller
-- passes and always using the real auth.uid() internally has zero legitimate
-- breakage risk while closing the hole completely.
--
-- Run in Supabase SQL Editor. Safe to run multiple times (idempotent).
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_applications_for_review(uuid);

CREATE OR REPLACE FUNCTION public.get_applications_for_review(
  organizer_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
  application_id UUID,
  applicant_user_id UUID,
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
DECLARE
  effective_organizer_id UUID := auth.uid();
BEGIN
  -- Ignore whatever organizer_user_id the caller passed — a direct RPC call
  -- can supply anyone's id, so the only trustworthy value is the caller's
  -- own authenticated identity.
  IF effective_organizer_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  PERFORM expire_boosted_applications();

  RETURN QUERY
  SELECT
    a.id AS application_id,
    a.user_id AS applicant_user_id,
    up.dj_name AS applicant_name,
    up.email AS applicant_email,
    o.title AS opportunity_title,
    a.message AS application_message,
    a.status AS application_status,
    a.created_at AS applied_at,
    up.profile_image_url AS applicant_profile_url,
    COALESCE(a.is_boosted, false) AS is_boosted,
    a.boost_expires_at
  FROM applications a
  JOIN user_profiles up ON a.user_id = up.id
  JOIN opportunities o ON a.opportunity_id = o.id
  WHERE o.organizer_id = effective_organizer_id
  ORDER BY
    CASE WHEN a.is_boosted = true AND a.boost_expires_at > NOW() THEN 0 ELSE 1 END,
    a.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_applications_for_review(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_applications_for_review(uuid) TO service_role;

-- Verify: the function should now ignore a spoofed organizer_user_id.
-- Sign in as a non-organizer test account and run (should return 0 rows,
-- not another organizer's applications):
--   SELECT * FROM get_applications_for_review('<some other organizer uuid>');
