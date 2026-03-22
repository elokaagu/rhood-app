-- Add applicant_user_id to get_applications_for_review so clients can notify
-- without an extra applications table lookup. Run in Supabase SQL editor.
--
-- PostgreSQL does not allow CREATE OR REPLACE when the OUT/RETURNS TABLE row
-- type changes — you must DROP the old signature first (see error 42P13).

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
BEGIN
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
  WHERE o.organizer_id = organizer_user_id
  ORDER BY
    CASE WHEN a.is_boosted = true AND a.boost_expires_at > NOW() THEN 0 ELSE 1 END,
    a.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restore RPC access (DROP removes the function; grants do not carry over)
GRANT EXECUTE ON FUNCTION public.get_applications_for_review(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_applications_for_review(uuid) TO service_role;
