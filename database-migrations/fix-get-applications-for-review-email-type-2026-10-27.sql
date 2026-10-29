-- user_profiles.email is varchar but the function declares applicant_email text,
-- so every call failed with "structure of query does not match function result
-- type" (Profile → Booking Requests and Admin → Applications came back empty).
CREATE OR REPLACE FUNCTION public.get_applications_for_review(organizer_user_id uuid DEFAULT auth.uid())
 RETURNS TABLE(application_id uuid, applicant_user_id uuid, applicant_name character varying, applicant_email text, opportunity_title character varying, application_message text, application_status character varying, applied_at timestamp with time zone, applicant_profile_url text, is_boosted boolean, boost_expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
    up.email::text AS applicant_email,
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
$function$;
