-- Update daily application limit from 5 → 3 in all Supabase RPC functions.
-- Run this in the Supabase SQL editor.

-- Combined stats function (primary path used by the app)
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
BEGIN
  SELECT COUNT(*)
    INTO v_count
    FROM applications
   WHERE user_id = user_uuid
     AND created_at >= CURRENT_DATE;

  RETURN QUERY SELECT
    v_count,
    GREATEST(0, v_limit - v_count)::BIGINT,
    v_count < v_limit;
END;
$$;

-- Individual count function (fallback path)
CREATE OR REPLACE FUNCTION get_daily_application_count(user_uuid UUID)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
      FROM applications
     WHERE user_id = user_uuid
       AND created_at >= CURRENT_DATE
  );
END;
$$;

-- Individual remaining function (fallback path)
CREATE OR REPLACE FUNCTION get_remaining_daily_applications(user_uuid UUID)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count BIGINT;
  v_limit CONSTANT INTEGER := 3;
BEGIN
  SELECT COUNT(*)
    INTO v_count
    FROM applications
   WHERE user_id = user_uuid
     AND created_at >= CURRENT_DATE;

  RETURN GREATEST(0, v_limit - v_count);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_user_daily_application_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_application_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_remaining_daily_applications(UUID) TO authenticated;
