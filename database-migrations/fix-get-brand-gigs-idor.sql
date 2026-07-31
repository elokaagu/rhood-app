-- ============================================================================
-- HIGH: get_brand_gigs IDOR — leaks any brand's gig payment/status data to
-- any authenticated user
-- ----------------------------------------------------------------------------
-- Same shape as get_applications_for_review: `brand_user_id` is a caller-
-- supplied parameter with no check it matches the caller, and the function
-- is SECURITY DEFINER, so it bypasses gigs/opportunities RLS. Any
-- authenticated user can call:
--   supabase.rpc('get_brand_gigs', { brand_user_id: '<any other brand>' })
-- and get that brand's full gig list — payment, currency, payment_status,
-- DJ name/photo. The app (components/BrandGigsPortal.js) only ever calls
-- this with the caller's own id, so ignoring the passed value and always
-- using the real auth.uid() internally has zero legitimate breakage risk.
--
-- Run in Supabase SQL Editor. Safe to run multiple times (idempotent).
-- ============================================================================

CREATE OR REPLACE FUNCTION get_brand_gigs(brand_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  id UUID,
  dj_id UUID,
  opportunity_id UUID,
  name VARCHAR,
  venue VARCHAR,
  location VARCHAR,
  event_date DATE,
  start_time TIME,
  end_time TIME,
  payment DECIMAL,
  currency VARCHAR,
  payment_status VARCHAR,
  status VARCHAR,
  dj_rating DECIMAL,
  venue_rating DECIMAL,
  description TEXT,
  genre VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  dj_name VARCHAR,
  dj_profile_image_url TEXT
) AS $$
DECLARE
  effective_brand_id UUID := auth.uid();
BEGIN
  IF effective_brand_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    g.id,
    g.dj_id,
    g.opportunity_id,
    g.name,
    g.venue,
    g.location,
    g.event_date,
    g.start_time,
    g.end_time,
    g.payment,
    g.currency,
    g.payment_status,
    g.status,
    g.dj_rating,
    g.venue_rating,
    g.description,
    g.genre,
    g.created_at,
    g.updated_at,
    g.completed_at,
    up.dj_name,
    up.profile_image_url as dj_profile_image_url
  FROM gigs g
  INNER JOIN opportunities o ON g.opportunity_id = o.id
  INNER JOIN user_profiles up ON g.dj_id = up.id
  WHERE o.created_by = effective_brand_id
  ORDER BY g.event_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_brand_gigs(UUID) TO authenticated;

COMMENT ON FUNCTION get_brand_gigs(UUID) IS
  'Get all gigs for a brand/organizer. brand_user_id is ignored in favor of the caller''s own auth.uid() — see fix-get-brand-gigs-idor.sql.';

-- Verify: sign in as a brand that owns zero gigs and run (should return 0
-- rows, not another brand's gigs):
--   SELECT * FROM get_brand_gigs('<some other brand uuid>');
