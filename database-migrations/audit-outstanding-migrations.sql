-- ============================================================================
-- Audit: which recent migrations have actually been applied?
-- ----------------------------------------------------------------------------
-- Read-only — no mutations. Run this in the Supabase SQL Editor and read the
-- `status` column. Anything showing "MISSING" needs its migration file run;
-- everything else is already live.
--
-- Covers every migration touched in the last work cycle (security sweep,
-- user-submitted opportunities, daily nudge, credits-on-completion). Older
-- files under database/ and database-migrations/ aren't included — this app
-- has been running in production against them for a while, so they're
-- assumed already applied.
-- ============================================================================

WITH checks AS (

  -- ── add-user-submitted-opportunities.sql ──────────────────────────────────
  SELECT 'add-user-submitted-opportunities' AS migration,
         'opportunities.submitted_by column' AS check_item,
         EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'opportunities'
                   AND column_name = 'submitted_by') AS applied
  UNION ALL
  SELECT 'add-user-submitted-opportunities', 'opportunities.moderation_status column',
         EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'opportunities'
                   AND column_name = 'moderation_status')
  UNION ALL
  SELECT 'add-user-submitted-opportunities', 'approve_opportunity() function',
         EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                 WHERE n.nspname = 'public' AND p.proname = 'approve_opportunity')
  UNION ALL
  SELECT 'add-user-submitted-opportunities', 'reject_opportunity() function',
         EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                 WHERE n.nspname = 'public' AND p.proname = 'reject_opportunity')

  -- ── create-opportunity-images-bucket.sql ──────────────────────────────────
  UNION ALL
  SELECT 'create-opportunity-images-bucket', 'opportunity-images storage bucket',
         EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'opportunity-images')

  -- ── harden-opportunities-rls.sql (told you this one was OPTIONAL) ─────────
  UNION ALL
  SELECT 'harden-opportunities-rls [OPTIONAL]', 'RLS enabled on opportunities',
         COALESCE((SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                   WHERE n.nspname = 'public' AND c.relname = 'opportunities'), false)
  UNION ALL
  SELECT 'harden-opportunities-rls [OPTIONAL]', 'opportunities_select_all policy',
         EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'opportunities'
                   AND policyname = 'opportunities_select_all')

  -- ── enable-rls-user-profiles.sql ───────────────────────────────────────────
  UNION ALL
  SELECT 'enable-rls-user-profiles', 'RLS enabled on user_profiles',
         COALESCE((SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                   WHERE n.nspname = 'public' AND c.relname = 'user_profiles'), false)
  UNION ALL
  SELECT 'enable-rls-user-profiles', 'user_profiles_select_authenticated policy',
         EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_profiles'
                   AND policyname = 'user_profiles_select_authenticated')

  -- ── enable-rls-message-threads.sql ─────────────────────────────────────────
  UNION ALL
  SELECT 'enable-rls-message-threads', 'RLS enabled on message_threads',
         COALESCE((SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                   WHERE n.nspname = 'public' AND c.relname = 'message_threads'), false)

  -- ── fix-get-applications-for-review-idor.sql ───────────────────────────────
  -- Checks for the fixed body specifically (not just any function with this
  -- name) — the pre-fix version existed too, just with the IDOR still open.
  UNION ALL
  SELECT 'fix-get-applications-for-review-idor', 'IDOR fix present (pins to auth.uid() internally)',
         EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                 WHERE n.nspname = 'public' AND p.proname = 'get_applications_for_review'
                   AND pg_get_functiondef(p.oid) ILIKE '%effective_organizer_id%')

  -- ── fix-boost-application-idor.sql ─────────────────────────────────────────
  UNION ALL
  SELECT 'fix-boost-application-idor', 'IDOR fix present (ownership check on caller)',
         EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                 WHERE n.nspname = 'public' AND p.proname = 'boost_application'
                   AND pg_get_functiondef(p.oid) ILIKE '%only boost your own applications%')

  -- ── fix-get-brand-gigs-idor.sql ─────────────────────────────────────────────
  UNION ALL
  SELECT 'fix-get-brand-gigs-idor', 'IDOR fix present (pins to auth.uid() internally)',
         EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                 WHERE n.nspname = 'public' AND p.proname = 'get_brand_gigs'
                   AND pg_get_functiondef(p.oid) ILIKE '%effective_brand_id%')

  -- ── fix-mutual-connections-and-daily-stats-idor.sql ─────────────────────────
  UNION ALL
  SELECT 'fix-mutual-connections-and-daily-stats-idor', 'get_mutual_connections IDOR fix present',
         EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                 WHERE n.nspname = 'public' AND p.proname = 'get_mutual_connections'
                   AND pg_get_functiondef(p.oid) ILIKE '%only look up mutual connections%')
  UNION ALL
  SELECT 'fix-mutual-connections-and-daily-stats-idor', 'get_user_daily_application_stats() function',
         EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                 WHERE n.nspname = 'public' AND p.proname = 'get_user_daily_application_stats')
  UNION ALL
  SELECT 'fix-mutual-connections-and-daily-stats-idor', 'get_daily_application_count() function',
         EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                 WHERE n.nspname = 'public' AND p.proname = 'get_daily_application_count')
  UNION ALL
  SELECT 'fix-mutual-connections-and-daily-stats-idor', 'get_remaining_daily_applications() function',
         EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                 WHERE n.nspname = 'public' AND p.proname = 'get_remaining_daily_applications')

  -- ── enable-rls-matchmaking-and-social-tables.sql ────────────────────────────
  -- One combined row: all 12 tables this migration touches should have RLS on.
  UNION ALL
  SELECT 'enable-rls-matchmaking-and-social-tables', 'RLS enabled on all 12 tables (applications, connections, gigs, mixes, community_members, dj_preferences, dj_availability, dj_performance_history, match_feedback, matches, venue_profiles, brief_templates)',
         (SELECT COUNT(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public'
            AND c.relname IN ('applications', 'connections', 'gigs', 'mixes', 'community_members',
                               'dj_preferences', 'dj_availability', 'dj_performance_history',
                               'match_feedback', 'matches', 'venue_profiles', 'brief_templates')
            AND c.relrowsecurity) = 12

  -- ── harden-avatars-and-message-media-buckets.sql ────────────────────────────
  UNION ALL
  SELECT 'harden-avatars-and-message-media-buckets', 'avatars_insert_anon_or_own storage policy',
         EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
                   AND policyname = 'avatars_insert_anon_or_own')
  UNION ALL
  SELECT 'harden-avatars-and-message-media-buckets', 'message_media_select_authenticated storage policy',
         EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
                   AND policyname = 'message_media_select_authenticated')

  -- ── disable-daily-nudge.sql ──────────────────────────────────────────────
  -- "Applied" here means the cron job is gone (not that a table/column exists).
  UNION ALL
  SELECT 'disable-daily-nudge', 'daily-nudge cron job unscheduled',
         NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-nudge')

  -- ── award-credits-to-opportunity-submitter.sql ──────────────────────────────
  UNION ALL
  SELECT 'award-credits-to-opportunity-submitter', 'gigs.submitter_credit_awarded column',
         EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'gigs'
                   AND column_name = 'submitter_credit_awarded')
  UNION ALL
  SELECT 'award-credits-to-opportunity-submitter', 'trigger_award_opportunity_submitter_credit trigger',
         EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_award_opportunity_submitter_credit')

)
SELECT migration,
       check_item,
       CASE WHEN applied THEN '✅ applied' ELSE '❌ MISSING — run the migration' END AS status
FROM checks
ORDER BY
  -- Group by migration in roughly the order they'd need to be run, missing ones surfaced first within each group.
  CASE migration
    WHEN 'add-user-submitted-opportunities' THEN 1
    WHEN 'create-opportunity-images-bucket' THEN 2
    WHEN 'harden-opportunities-rls [OPTIONAL]' THEN 3
    WHEN 'enable-rls-user-profiles' THEN 4
    WHEN 'enable-rls-message-threads' THEN 5
    WHEN 'fix-get-applications-for-review-idor' THEN 6
    WHEN 'fix-boost-application-idor' THEN 7
    WHEN 'fix-get-brand-gigs-idor' THEN 8
    WHEN 'fix-mutual-connections-and-daily-stats-idor' THEN 9
    WHEN 'enable-rls-matchmaking-and-social-tables' THEN 10
    WHEN 'harden-avatars-and-message-media-buckets' THEN 11
    WHEN 'disable-daily-nudge' THEN 12
    WHEN 'award-credits-to-opportunity-submitter' THEN 13
    ELSE 99
  END,
  applied ASC,
  check_item;
