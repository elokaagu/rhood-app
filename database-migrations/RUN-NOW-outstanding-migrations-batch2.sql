-- ============================================================================
-- BATCH: outstanding migrations flagged by audit-outstanding-migrations.sql
-- ----------------------------------------------------------------------------
-- 8 files, concatenated in the order below. Every one of them is independently
-- idempotent (DROP POLICY IF EXISTS / CREATE OR REPLACE) — safe to run this
-- whole thing even if some individual pieces already partially exist.
--
--   1. enable-rls-user-profiles.sql
--   2. fix-get-applications-for-review-idor.sql
--   3. fix-boost-application-idor.sql
--   4. fix-get-brand-gigs-idor.sql
--   5. fix-mutual-connections-and-daily-stats-idor.sql
--   6. enable-rls-matchmaking-and-social-tables.sql
--   7. harden-avatars-and-message-media-buckets.sql
--   8. disable-daily-nudge.sql
--
-- Run the whole thing in one go in the Supabase SQL Editor. After it
-- finishes, re-run audit-outstanding-migrations.sql to confirm everything
-- above now shows ✅.
--
-- NOTE on #1: your audit showed RLS already ON for user_profiles but the
-- user_profiles_select_authenticated policy MISSING — meaning some other,
-- differently-named SELECT policy (or none) is currently in place. This
-- reconciles it to the intended policy set without touching whatever's
-- already there that this doesn't conflict with.
-- ============================================================================

-- ============================================================================
-- CRITICAL: Enable RLS on public.user_profiles
-- ----------------------------------------------------------------------------
-- Found by a full security sweep: user_profiles — the core identity table,
-- holding email, credits, is_verified, is_rhood_approved_promoter — has NO
-- row level security at all. With the app's anon key (which ships inside the
-- mobile app and is public), anyone can currently:
--   PATCH /rest/v1/user_profiles?id=eq.<victim>  {"credits": 999999}
--   PATCH /rest/v1/user_profiles?id=eq.<victim>  {"is_verified": true}
--   GET   /rest/v1/user_profiles?select=email,full_name   (dumps every user)
-- with no login required at all.
--
-- This migration:
--   1. Blocks the anon role entirely (currently has full read/write).
--   2. Locks INSERT/UPDATE/DELETE to the row's own owner (auth.uid() = id) —
--      this is the fix for the credit-theft / fake-verification / unauth
--      defacement exploits above.
--   3. Leaves SELECT open to any authenticated user, unrestricted by row.
--
-- ⚠️ KNOWN RESIDUAL GAP (not fixed by this migration — read below):
-- SELECT stays broad-authenticated rather than owner-only because dozens of
-- legitimate features (Discover, Opportunities, Connections, Messages) read
-- OTHER users' dj_name/profile_image_url/bio/genres by design — RLS is row-
-- level, not column-level, so there is no way to "allow reading dj_name but
-- not email" with a policy alone. This means another authenticated user can
-- still read email/credits/phone via a crafted direct query even after this
-- migration, exactly like the app's own show_email/show_phone flags are only
-- enforced in client rendering code today, not at the database layer.
-- Properly closing that requires a public-safe VIEW (excluding email/credits/
-- phone) that every "view ANOTHER user's profile" call site would need to
-- switch to — a larger, separate follow-up, not something to do blind across
-- every call site in one pass. This migration closes the WRITE-side exploits
-- (theft, fake verification, defacement) and the unauthenticated (anon) read,
-- which are the critical/high severity ones; the authenticated-to-
-- authenticated read-of-sensitive-columns risk is lower severity and remains
-- open until that follow-up view exists.
--
-- Run in Supabase SQL Editor. Safe to run multiple times (idempotent).
-- ============================================================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_profiles_select_authenticated" ON public.user_profiles;
CREATE POLICY "user_profiles_select_authenticated" ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "user_profiles_insert_own" ON public.user_profiles;
CREATE POLICY "user_profiles_insert_own" ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "user_profiles_update_own" ON public.user_profiles;
CREATE POLICY "user_profiles_update_own" ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "user_profiles_delete_own" ON public.user_profiles;
CREATE POLICY "user_profiles_delete_own" ON public.user_profiles
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = id);

-- Verify: rowsecurity should be true, and 4 policies should be listed.
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'user_profiles';

SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_profiles'
ORDER BY policyname;

-- Smoke test after running — signup/onboarding/profile-editing must still
-- work: create a test account through the app and confirm the profile saves
-- and loads normally, and that opening another user's profile still shows
-- their dj_name/photo/bio (expected — see residual-gap note above).
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
-- ============================================================================
-- HIGH: Enable RLS across the matchmaking + social-graph table set
-- ----------------------------------------------------------------------------
-- A full security sweep found these actively-queried tables with NO row
-- level security at all: applications, connections, gigs, mixes,
-- community_members, dj_preferences, dj_availability,
-- dj_performance_history, match_feedback, matches, venue_profiles,
-- brief_templates. Column names below were derived from how lib/matchmaking.js
-- and lib/supabase/db.js actually query each table (no CREATE TABLE exists in
-- the repo for any of these — same pattern already seen for other tables this
-- session — so this is reverse-engineered from real query shapes, not
-- guessed).
--
-- Run in Supabase SQL Editor. Safe to run multiple times (idempotent).
-- After running, exercise: viewing your own gigs/mixes/matches, applying to
-- an opportunity, joining a community, and (if you have a brand/organizer
-- account) reviewing applications and marking a gig complete.
-- ============================================================================

-- ── applications: owned by the applicant; also readable by the opportunity's
--    organizer (components/AdminApplicationsScreen.js and
--    components/NotificationsScreen.js both read another user's application
--    row directly as the organizer, not just via the get_applications_for_review
--    RPC) ───────────────────────────────────────────────────────────────────
DO $$
DECLARE
  has_created_by BOOLEAN;
  has_organizer_id BOOLEAN;
  organizer_clause TEXT := '';
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'opportunities' AND column_name = 'created_by') INTO has_created_by;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'opportunities' AND column_name = 'organizer_id') INTO has_organizer_id;

  IF has_created_by THEN
    organizer_clause := organizer_clause || ' OR o.created_by = auth.uid()';
  END IF;
  IF has_organizer_id THEN
    organizer_clause := organizer_clause || ' OR o.organizer_id = auth.uid()';
  END IF;

  EXECUTE 'ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY';

  EXECUTE 'DROP POLICY IF EXISTS "applications_select_own_or_organizer" ON public.applications';
  EXECUTE format(
    'CREATE POLICY "applications_select_own_or_organizer" ON public.applications
       FOR SELECT TO authenticated
       USING (user_id = auth.uid() OR EXISTS (
         SELECT 1 FROM public.opportunities o
         WHERE o.id = applications.opportunity_id %s
       ))',
    organizer_clause
  );

  EXECUTE 'DROP POLICY IF EXISTS "applications_insert_own" ON public.applications';
  EXECUTE 'CREATE POLICY "applications_insert_own" ON public.applications
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid())';

  -- Organizer needs UPDATE to set status=approved/rejected
  -- (components/AdminApplicationsScreen.js); applicant needs none directly
  -- today, but boost_application (SECURITY DEFINER) bypasses this regardless.
  EXECUTE 'DROP POLICY IF EXISTS "applications_update_organizer" ON public.applications';
  EXECUTE format(
    'CREATE POLICY "applications_update_organizer" ON public.applications
       FOR UPDATE TO authenticated
       USING (EXISTS (
         SELECT 1 FROM public.opportunities o
         WHERE o.id = applications.opportunity_id %s
       ))',
    organizer_clause
  );

  EXECUTE 'DROP POLICY IF EXISTS "applications_delete_own" ON public.applications';
  EXECUTE 'CREATE POLICY "applications_delete_own" ON public.applications
    FOR DELETE TO authenticated USING (user_id = auth.uid())';
END $$;

-- ── connections: a genuinely multi-generation table — NOT a simple two-column
--    case like message_threads. Confirmed by reading actual query code, not
--    guessed: lib/supabase/db.js's connection-request flow uses
--    user_id_1/user_id_2/initiated_by ("production schema" per
--    components/NotificationsScreen.js:76's own comment); lib/connectionsService.js's
--    independent follow/unfollow flow uses follower_id/following_id on the
--    SAME table (confirmed by its realtime filter checking all four columns
--    at once: "or(follower_id.eq.X,following_id.eq.X,user_id_1.eq.X,user_id_2.eq.X)");
--    and docs/DATABASE_SCHEMA.md documents a third, older generation
--    (requester_id/connected_user_id) that components/NotificationsScreen.js:71
--    still defensively selects alongside user_id_1/user_id_2 — meaning those
--    columns may still physically exist even if superseded. A fixed two-column
--    policy would silently break whichever of these the policy doesn't check:
--    rows would either fail WITH CHECK on insert, or vanish from SELECT for
--    their own participants. Detect whichever column pairs actually exist and
--    build the policy from all of them, exactly like message_threads did for
--    its (smaller) two-way ambiguity. ─────────────────────────────────────────
DO $$
DECLARE
  has_v1 BOOLEAN; -- user_id_1 / user_id_2
  has_v2 BOOLEAN; -- follower_id / following_id
  has_v3 BOOLEAN; -- requester_id / connected_user_id
  clauses TEXT[] := ARRAY[]::TEXT[];
  owner_expr TEXT;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'connections' AND table_schema = 'public' AND column_name = 'user_id_1')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'connections' AND table_schema = 'public' AND column_name = 'user_id_2')
    INTO has_v1;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'connections' AND table_schema = 'public' AND column_name = 'follower_id')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'connections' AND table_schema = 'public' AND column_name = 'following_id')
    INTO has_v2;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'connections' AND table_schema = 'public' AND column_name = 'requester_id')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'connections' AND table_schema = 'public' AND column_name = 'connected_user_id')
    INTO has_v3;

  IF has_v1 THEN clauses := clauses || 'user_id_1 = auth.uid() OR user_id_2 = auth.uid()'; END IF;
  IF has_v2 THEN clauses := clauses || 'follower_id = auth.uid() OR following_id = auth.uid()'; END IF;
  IF has_v3 THEN clauses := clauses || 'requester_id = auth.uid() OR connected_user_id = auth.uid()'; END IF;

  IF array_length(clauses, 1) IS NULL THEN
    RAISE EXCEPTION 'connections table has none of the expected ownership column pairs — check the live schema before applying RLS.';
  END IF;

  owner_expr := array_to_string(clauses, ' OR ');

  EXECUTE 'ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY';

  EXECUTE 'DROP POLICY IF EXISTS "connections_select_participant" ON public.connections';
  EXECUTE format('CREATE POLICY "connections_select_participant" ON public.connections FOR SELECT TO authenticated USING (%s)', owner_expr);

  EXECUTE 'DROP POLICY IF EXISTS "connections_insert_participant" ON public.connections';
  EXECUTE format('CREATE POLICY "connections_insert_participant" ON public.connections FOR INSERT TO authenticated WITH CHECK (%s)', owner_expr);

  EXECUTE 'DROP POLICY IF EXISTS "connections_update_participant" ON public.connections';
  EXECUTE format('CREATE POLICY "connections_update_participant" ON public.connections FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)', owner_expr, owner_expr);

  -- Missing from the first draft of this migration — without a DELETE
  -- policy, RLS denies all deletes by default (no error, 0 rows affected),
  -- so unfollow/cancel-request/remove-connection would appear to succeed
  -- client-side while silently leaving the row in place. Real call sites:
  -- lib/connectionsService.js's unfollowUser(), lib/supabase/db.js's
  -- cancelConnectionRequest() and deleteConnection().
  EXECUTE 'DROP POLICY IF EXISTS "connections_delete_participant" ON public.connections';
  EXECUTE format('CREATE POLICY "connections_delete_participant" ON public.connections FOR DELETE TO authenticated USING (%s)', owner_expr);
END $$;

-- ── gigs: the performing DJ, or the opportunity's organizer ─────────────────
DO $$
DECLARE
  has_created_by BOOLEAN;
  has_organizer_id BOOLEAN;
  organizer_clause TEXT := '';
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'opportunities' AND column_name = 'created_by') INTO has_created_by;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'opportunities' AND column_name = 'organizer_id') INTO has_organizer_id;

  IF has_created_by THEN
    organizer_clause := organizer_clause || ' OR o.created_by = auth.uid()';
  END IF;
  IF has_organizer_id THEN
    organizer_clause := organizer_clause || ' OR o.organizer_id = auth.uid()';
  END IF;

  EXECUTE 'ALTER TABLE public.gigs ENABLE ROW LEVEL SECURITY';

  EXECUTE 'DROP POLICY IF EXISTS "gigs_select_dj_or_organizer" ON public.gigs';
  EXECUTE format(
    'CREATE POLICY "gigs_select_dj_or_organizer" ON public.gigs
       FOR SELECT TO authenticated
       USING (dj_id = auth.uid() OR EXISTS (
         SELECT 1 FROM public.opportunities o
         WHERE o.id = gigs.opportunity_id %s
       ))',
    organizer_clause
  );

  -- components/BrandGigsPortal.js updates gig status/ratings as the organizer.
  EXECUTE 'DROP POLICY IF EXISTS "gigs_update_dj_or_organizer" ON public.gigs';
  EXECUTE format(
    'CREATE POLICY "gigs_update_dj_or_organizer" ON public.gigs
       FOR UPDATE TO authenticated
       USING (dj_id = auth.uid() OR EXISTS (
         SELECT 1 FROM public.opportunities o
         WHERE o.id = gigs.opportunity_id %s
       ))',
    organizer_clause
  );
  -- No INSERT policy: gigs are created by the create_gig_from_approved_application
  -- trigger (SECURITY DEFINER), which bypasses RLS entirely — db.createGig has
  -- no direct caller in the app.
END $$;

-- ── mixes: public mixes readable by anyone; owner manages their own ─────────
ALTER TABLE public.mixes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mixes_select_public_or_own" ON public.mixes;
CREATE POLICY "mixes_select_public_or_own" ON public.mixes
  FOR SELECT TO authenticated
  USING (is_public = true OR user_id = auth.uid());

DROP POLICY IF EXISTS "mixes_insert_own" ON public.mixes;
CREATE POLICY "mixes_insert_own" ON public.mixes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "mixes_update_own" ON public.mixes;
CREATE POLICY "mixes_update_own" ON public.mixes
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "mixes_delete_own" ON public.mixes;
CREATE POLICY "mixes_delete_own" ON public.mixes
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ── community_members: membership lists are visible group info; joining
--    yourself is self-service, force-joining someone else is not ──────────
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_members_select_authenticated" ON public.community_members;
CREATE POLICY "community_members_select_authenticated" ON public.community_members
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "community_members_insert_self" ON public.community_members;
CREATE POLICY "community_members_insert_self" ON public.community_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "community_members_delete_self" ON public.community_members;
CREATE POLICY "community_members_delete_self" ON public.community_members
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ── dj_preferences / dj_availability / dj_performance_history / match_feedback
--    / matches: single-owner tables, owner-only for everything ──────────────
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['dj_preferences', 'dj_availability', 'dj_performance_history', 'match_feedback', 'matches']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS "%s_select_own" ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "%s_select_own" ON public.%I FOR SELECT TO authenticated USING (user_id = auth.uid())',
      t, t
    );

    EXECUTE format('DROP POLICY IF EXISTS "%s_insert_own" ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "%s_insert_own" ON public.%I FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid())',
      t, t
    );

    EXECUTE format('DROP POLICY IF EXISTS "%s_update_own" ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "%s_update_own" ON public.%I FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())',
      t, t
    );

    EXECUTE format('DROP POLICY IF EXISTS "%s_delete_own" ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "%s_delete_own" ON public.%I FOR DELETE TO authenticated USING (user_id = auth.uid())',
      t, t
    );
  END LOOP;
END $$;

-- ── venue_profiles / brief_templates: read-only reference data browsed by
--    anyone signed in; no app code writes to either, so no write policy is
--    added at all (RLS enabled + only a SELECT policy = writes denied by
--    default for every non-service-role caller) ─────────────────────────────
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['venue_profiles', 'brief_templates']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_select_authenticated" ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "%s_select_authenticated" ON public.%I FOR SELECT TO authenticated USING (true)',
      t, t
    );
  END LOOP;
END $$;

-- Verify: every table below should show rowsecurity = true.
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'applications', 'connections', 'gigs', 'mixes', 'community_members',
    'dj_preferences', 'dj_availability', 'dj_performance_history',
    'match_feedback', 'matches', 'venue_profiles', 'brief_templates'
  )
ORDER BY tablename;
-- ============================================================================
-- HIGH: avatars + message-media storage buckets have no ownership scoping
-- ----------------------------------------------------------------------------
-- avatars: "Anyone can upload avatars" / "Anyone can update avatars" check
-- only bucket_id, nothing else — this was intentionally opened to the anon
-- role earlier this session so unconfirmed-email users can set a photo
-- during onboarding (real Supabase constraint: signUp() has no session until
-- email is confirmed, so those requests carry no JWT at all — there is no
-- auth.uid() to check for that path, by design of the product's onboarding
-- flow). But it also means ANY signed-in user can overwrite ANY OTHER
-- signed-in user's avatar path, since there was no auth.uid() check for the
-- authenticated role either. This migration adds that check for authenticated
-- callers (whose real edits all go through EditProfileScreen.js, which
-- already embeds the user's own id in the path) while leaving the anon path
-- as-is, since it has no identity to scope against.
--
-- message-media: "Allow authenticated uploads/downloads/deletes" checks only
-- bucket_id — any authenticated user can view OR DELETE any other user's
-- private chat media, not just their own. Storage automatically records the
-- uploader as `owner` on every object; this migration scopes UPDATE/DELETE
-- to owner = auth.uid(). SELECT is intentionally left as a known residual
-- gap — see the comment below explaining why a full fix needs a bigger
-- change than a policy tweak.
--
-- Run in Supabase SQL Editor. Safe to run multiple times (idempotent).
-- ============================================================================

-- ── avatars: authenticated writes must be to the caller's own path ─────────
-- EditProfileScreen.js writes profile_images/profile_<user.id>_<ts>.jpg, so
-- this can check the path actually contains the caller's own id.
DROP POLICY IF EXISTS "Anyone can upload avatars" ON storage.objects;
CREATE POLICY "avatars_insert_anon_or_own" ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (
      auth.role() = 'anon'  -- onboarding, pre-email-confirmation — no identity to scope
      OR name LIKE 'profile_images/profile_' || auth.uid()::text || '_%'
    )
  );

DROP POLICY IF EXISTS "Anyone can update avatars" ON storage.objects;
CREATE POLICY "avatars_update_anon_or_own" ON storage.objects
  FOR UPDATE
  TO anon, authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      auth.role() = 'anon'
      OR name LIKE 'profile_images/profile_' || auth.uid()::text || '_%'
    )
  );

-- ⚠️ KNOWN RESIDUAL GAP (partially mitigated at the application layer — see
-- below, not fully closed): the "own path" check above only applies to
-- authenticated (post-onboarding) uploads — anon uploads remain scoped only
-- by bucket_id, same as before. This is an inherent limit of Supabase's
-- anon-until-email-confirmed flow: those requests carry no JWT at all, so
-- there is no auth.uid() to check against. lib/onboardingHelpers.js's
-- filename was changed in this same batch from profile_<Date.now()>.jpg
-- (enumerable) to profile_<Crypto.randomUUID()>.jpg (unguessable), so an
-- anon attacker can no longer overwrite a specific in-progress signup's
-- photo by guessing nearby timestamps — but this is obscurity, not real
-- authorization, since anon still has no identity for RLS to check.

-- ── message-media: only the uploader can modify/delete their own object ────
DROP POLICY IF EXISTS "Allow users to delete own files from message-media" ON storage.objects;
CREATE POLICY "message_media_delete_own" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'message-media' AND owner = auth.uid());

DROP POLICY IF EXISTS "message_media_update_own" ON storage.objects;
CREATE POLICY "message_media_update_own" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'message-media' AND owner = auth.uid());

-- ⚠️ KNOWN RESIDUAL GAP: SELECT ("Allow authenticated downloads from
-- message-media") is intentionally left as bucket_id-only below, not
-- narrowed to conversation participants. A correct fix requires knowing
-- which message thread each object belongs to, but the upload paths
-- (lib/multimediaUploadService.js: images/…, videos/…, audio/…) don't encode
-- thread_id at all, and messages.media_url only stores a full URL, not a
-- back-reference usable in a fast RLS policy. Separately: the bucket's own
-- setup instructions (database/create-message-media-bucket.sql) recommend
-- "Public: Yes (recommended for direct file access)" — if that's how the
-- bucket is actually configured, Supabase serves objects from a public CDN
-- URL that bypasses storage.objects RLS entirely, making any SELECT policy
-- here moot regardless. Properly closing this needs a product decision
-- (private bucket + signed URLs, and a path scheme that embeds thread_id) —
-- flagging rather than attempting a fragile partial fix blind.
DROP POLICY IF EXISTS "Allow authenticated downloads from message-media" ON storage.objects;
CREATE POLICY "message_media_select_authenticated" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'message-media');

-- Verify
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'objects'
  AND (policyname LIKE '%avatar%' OR policyname LIKE '%message_media%')
ORDER BY policyname;
-- ============================================================================
-- Disable the daily "open the app" nudge push — architecture kept intact
-- ----------------------------------------------------------------------------
-- Stops the daily broadcast from actually sending, without removing any of
-- the underlying implementation:
--   - supabase/functions/send-daily-nudge stays deployed (just never invoked)
--   - public.trigger_daily_nudge() stays defined (can still be called
--     manually for testing: SELECT public.trigger_daily_nudge();)
--   - public.daily_nudge_state stays as-is (last_sent_at just stops updating)
--
-- The only thing this does is unschedule the pg_cron job that was firing
-- trigger_daily_nudge() every day at 18:00 UTC.
--
-- To bring it back later: re-run database/daily-nudge-notifications.sql —
-- it re-creates this exact schedule (idempotent, already handles re-running
-- safely).
--
-- Run in Supabase SQL Editor. Safe to run multiple times (idempotent).
-- ============================================================================

DO $$
BEGIN
  PERFORM cron.unschedule('daily-nudge');
EXCEPTION WHEN OTHERS THEN
  NULL; -- already unscheduled, or was never scheduled — fine either way
END;
$$;

-- Verify: should return 0 rows (no active "daily-nudge" cron job).
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'daily-nudge';
