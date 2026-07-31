-- ============================================================================
-- MEDIUM: get_mutual_connections + daily-application-stats RPCs — arbitrary
-- user_id/user_uuid parameters with no check the caller is actually involved
-- ----------------------------------------------------------------------------
-- get_mutual_connections(user1_id, user2_id): the app always calls this with
-- (currentUserId, otherProfileId) — components/ConnectionsListScreen.js — so
-- requiring the CALLER be one of the two named users (not necessarily both)
-- preserves "see mutual connections with a profile I'm viewing" while closing
-- the "query any two arbitrary strangers' mutual connections" hole.
--
-- get_user_daily_application_stats / get_daily_application_count /
-- get_remaining_daily_applications(user_uuid): self-service — the app only
-- ever calls these for the current user's own stats (hooks/useOpportunities.js,
-- lib/supabase/db.js) — so pinning the parameter to auth.uid() closes the
-- "check anyone's application count" info leak with zero legitimate behavior
-- change. Signatures below are copied exactly from
-- database/update-daily-application-limit-3.sql (BIGINT returns, not INTEGER)
-- so CREATE OR REPLACE doesn't fail on a return-type mismatch.
--
-- NOT fixed here — deferred, documented, not attempted blind:
-- cleanup_orphaned_auth_user(p_email) is called during SIGNUP, before any
-- session exists (genuinely anon, by design — it answers "can I sign up with
-- this email"), so there is no auth.uid() to pin it to. The email-enumeration
-- risk it carries is real but lower severity, and the actual fix (rate
-- limiting attempts per IP/email) needs new infrastructure — not something to
-- improvise as a SQL-only patch in this pass.
--
-- Run in Supabase SQL Editor. Safe to run multiple times (idempotent).
-- ============================================================================

CREATE OR REPLACE FUNCTION get_mutual_connections(user1_id UUID, user2_id UUID)
RETURNS TABLE (
  mutual_user_id UUID,
  mutual_user_name VARCHAR,
  mutual_user_dj_name VARCHAR,
  mutual_user_profile_image TEXT
) AS $$
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() != user1_id AND auth.uid() != user2_id) THEN
    RAISE EXCEPTION 'You can only look up mutual connections you are part of.';
  END IF;

  RETURN QUERY
  SELECT DISTINCT
    up.id as mutual_user_id,
    up.full_name as mutual_user_name,
    up.dj_name as mutual_user_dj_name,
    up.profile_image_url as mutual_user_profile_image
  FROM connections c1
  JOIN connections c2 ON (
    (c1.user_id_1 = user1_id AND c2.user_id_1 = user2_id AND c1.user_id_2 = c2.user_id_2)
    OR (c1.user_id_1 = user1_id AND c2.user_id_2 = user2_id AND c1.user_id_2 = c2.user_id_1)
    OR (c1.user_id_2 = user1_id AND c2.user_id_1 = user2_id AND c1.user_id_1 = c2.user_id_2)
    OR (c1.user_id_2 = user1_id AND c2.user_id_2 = user2_id AND c1.user_id_1 = c2.user_id_1)
  )
  JOIN user_profiles up ON (
    up.id = CASE
      WHEN c1.user_id_1 = user1_id THEN c1.user_id_2
      ELSE c1.user_id_1
    END
  )
  WHERE
    c1.status = 'accepted'
    AND c2.status = 'accepted'
    AND up.id != user1_id
    AND up.id != user2_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_mutual_connections TO authenticated;

-- ── Daily application stats: pin every variant to the caller's own identity ─

CREATE OR REPLACE FUNCTION get_user_daily_application_stats(user_uuid UUID)
RETURNS TABLE (
  daily_count BIGINT,
  remaining_applications BIGINT,
  can_apply BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count BIGINT;
  v_limit CONSTANT INTEGER := 3;
  effective_user_id UUID := auth.uid();
BEGIN
  IF effective_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COUNT(*)
    INTO v_count
    FROM applications
   WHERE user_id = effective_user_id
     AND created_at >= CURRENT_DATE;

  RETURN QUERY SELECT
    v_count,
    GREATEST(0, v_limit - v_count)::BIGINT,
    v_count < v_limit;
END;
$$;

CREATE OR REPLACE FUNCTION get_daily_application_count(user_uuid UUID)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  effective_user_id UUID := auth.uid();
BEGIN
  IF effective_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN (
    SELECT COUNT(*)
      FROM applications
     WHERE user_id = effective_user_id
       AND created_at >= CURRENT_DATE
  );
END;
$$;

CREATE OR REPLACE FUNCTION get_remaining_daily_applications(user_uuid UUID)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count BIGINT;
  v_limit CONSTANT INTEGER := 3;
  effective_user_id UUID := auth.uid();
BEGIN
  IF effective_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COUNT(*)
    INTO v_count
    FROM applications
   WHERE user_id = effective_user_id
     AND created_at >= CURRENT_DATE;

  RETURN GREATEST(0, v_limit - v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_daily_application_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_application_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_remaining_daily_applications(UUID) TO authenticated;

-- Verify: the app's own daily-limit UI (Opportunities screen counter) should
-- still show the correct remaining count after running this.
