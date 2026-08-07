-- ============================================================================
-- Fix: "record application_record has no field is_boosted" on Boost
-- ----------------------------------------------------------------------------
-- boost_application() (fixed for IDOR earlier this session, and correctly
-- live) reads/writes applications.is_boosted / boost_expires_at /
-- boost_credits_cost — but the original migration that was supposed to add
-- those columns (database-migrations/add-application-boost.sql, an older
-- file, predates this session) was apparently never actually run against
-- this database. The function exists; the columns it depends on don't.
--
-- This is just Step 1 of that original file (the column additions + index)
-- — the function definitions themselves are already correctly live via
-- fix-boost-application-idor.sql / fix-get-applications-for-review-idor.sql,
-- so this migration only adds what's actually missing.
--
-- Run in Supabase SQL Editor. Safe to run multiple times (idempotent).
-- ============================================================================

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS is_boosted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS boost_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS boost_credits_cost INTEGER DEFAULT 10;

CREATE INDEX IF NOT EXISTS idx_applications_boosted
  ON public.applications(is_boosted, boost_expires_at)
  WHERE is_boosted = true;

-- get_applications_for_review (the currently-live, IDOR-fixed version) calls
-- this on every invocation — it comes from the same never-run migration as
-- the columns above, so it's very likely also missing, which would make
-- get_applications_for_review (AdminApplicationsScreen's applicant list for
-- brands/organizers) fail on every single call, not just Boost.
CREATE OR REPLACE FUNCTION public.expire_boosted_applications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE public.applications
  SET is_boosted = false,
      updated_at = NOW()
  WHERE is_boosted = true
    AND boost_expires_at IS NOT NULL
    AND boost_expires_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.expire_boosted_applications() TO authenticated;

-- Verify: all 3 columns should now show up.
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'applications'
  AND column_name IN ('is_boosted', 'boost_expires_at', 'boost_credits_cost')
ORDER BY column_name;
