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
