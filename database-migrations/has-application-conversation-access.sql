-- ============================================================================
-- Allow a brand/organizer and a DJ to message while an application is pending
-- (before accept), and after — without requiring a Connections accept first.
--
-- Used by the mobile app (MessagesScreen) and R/HOOD Portal (Message DJ).
-- Safe to run multiple times (idempotent).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.has_application_conversation_access(
  other_user_id UUID
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me UUID := auth.uid();
  has_organizer_id BOOLEAN;
  has_created_by BOOLEAN;
  has_posted_by BOOLEAN;
  has_form_responses BOOLEAN;
  is_admin BOOLEAN;
  organizer_clause TEXT := 'FALSE';
  other_organizer_clause TEXT := 'FALSE';
  sql TEXT;
  allowed BOOLEAN := false;
BEGIN
  IF me IS NULL OR other_user_id IS NULL OR me = other_user_id THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'opportunities' AND column_name = 'organizer_id'
  ) INTO has_organizer_id;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'opportunities' AND column_name = 'created_by'
  ) INTO has_created_by;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'opportunities' AND column_name = 'posted_by'
  ) INTO has_posted_by;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'application_form_responses'
  ) INTO has_form_responses;

  IF has_organizer_id THEN
    organizer_clause := organizer_clause || ' OR o.organizer_id = $1';
    other_organizer_clause := other_organizer_clause || ' OR o.organizer_id = $2';
  END IF;
  IF has_created_by THEN
    organizer_clause := organizer_clause || ' OR o.created_by = $1';
    other_organizer_clause := other_organizer_clause || ' OR o.created_by = $2';
  END IF;
  IF has_posted_by THEN
    organizer_clause := organizer_clause || ' OR o.posted_by = $1';
    other_organizer_clause := other_organizer_clause || ' OR o.posted_by = $2';
  END IF;

  sql := format(
    'SELECT EXISTS (
       SELECT 1
       FROM public.applications a
       JOIN public.opportunities o ON o.id = a.opportunity_id
       WHERE (
         a.user_id = $2 AND (%s)
       ) OR (
         a.user_id = $1 AND (%s)
       )
     )',
    organizer_clause,
    other_organizer_clause
  );

  EXECUTE sql INTO allowed USING me, other_user_id;

  IF NOT COALESCE(allowed, false) AND has_form_responses THEN
    sql := format(
      'SELECT EXISTS (
         SELECT 1
         FROM public.application_form_responses a
         JOIN public.opportunities o ON o.id = a.opportunity_id
         WHERE (
           a.user_id = $2 AND (%s)
         ) OR (
           a.user_id = $1 AND (%s)
         )
       )',
      organizer_clause,
      other_organizer_clause
    );
    EXECUTE sql INTO allowed USING me, other_user_id;
  END IF;

  IF NOT COALESCE(allowed, false) THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = me AND role = 'admin'
    ) INTO is_admin;

    IF COALESCE(is_admin, false) THEN
      SELECT EXISTS (
        SELECT 1 FROM public.applications WHERE user_id = other_user_id
      ) INTO allowed;

      IF NOT COALESCE(allowed, false) AND has_form_responses THEN
        SELECT EXISTS (
          SELECT 1 FROM public.application_form_responses WHERE user_id = other_user_id
        ) INTO allowed;
      END IF;
    END IF;
  END IF;

  RETURN COALESCE(allowed, false);
END;
$$;

REVOKE ALL ON FUNCTION public.has_application_conversation_access(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_application_conversation_access(UUID) TO authenticated;

COMMENT ON FUNCTION public.has_application_conversation_access(UUID) IS
  'True when the caller and other_user_id share an opportunity application (either direction), so they may DM without an accepted connection.';
