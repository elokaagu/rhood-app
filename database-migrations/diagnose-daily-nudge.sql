-- ============================================================================
-- Diagnose why the daily nudge push isn't sending
-- ----------------------------------------------------------------------------
-- Run this whole file in Supabase SQL Editor and share the output. Each
-- SELECT below checks one link in the chain:
--   pg_cron job exists & schedule → last run + status → config row populated
--   → suppression state.
-- ============================================================================

-- 1) Is the cron job actually scheduled?
SELECT jobid, jobname, schedule, active, command
FROM cron.job
WHERE jobname = 'daily-nudge';
-- Expect: 1 row, active = true, schedule = '0 18 * * *'.
-- 0 rows means database/daily-nudge-notifications.sql was never run (or pg_cron
-- isn't enabled on this project) — that alone fully explains "not sending".

-- 2) Did the job actually fire, and did it succeed?
SELECT
  jrd.runid,
  jrd.start_time,
  jrd.end_time,
  jrd.status,
  jrd.return_message
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE j.jobname = 'daily-nudge'
ORDER BY jrd.start_time DESC
LIMIT 10;
-- status = 'succeeded' just means the SQL function ran (it always returns void
-- even if the HTTP POST inside it failed) — check step 4 for the actual
-- delivery outcome.

-- 3) Is the edge function URL + secret configured?
SELECT
  edge_function_url,
  CASE WHEN length(trim(internal_secret)) > 0 THEN 'set ✓' ELSE 'MISSING ✗' END AS secret_status
FROM public.expo_push_delivery_config
WHERE id = 1;
-- edge_function_url should point at .../functions/v1/send-expo-push (the
-- nudge function swaps that suffix for send-daily-nudge at call time).
-- secret_status MISSING means trigger_daily_nudge() returns early and never
-- calls net.http_post at all.

-- 4) Did the most recent net.http_post calls succeed? (pg_net doesn't retain
--    the request URL on the response row, so this isn't filterable by url —
--    just look at the most recent ones; trigger_daily_nudge() only fires
--    once a day so it should be easy to spot by timestamp.)
SELECT
  id,
  status_code,
  created,
  (content::jsonb) AS response_body
FROM net._http_response
ORDER BY created DESC
LIMIT 10;
-- status_code 401 = secret mismatch between this table and the Edge Function's
-- INTERNAL_PUSH_SECRET. 404 = function not deployed. 200 with
-- {"skipped":"opportunity_digest_sent_today"} or {"skipped":"nudge_recently_sent"}
-- means it ran but suppressed itself on purpose. To force a fresh, isolated
-- test instead of waiting for the next cron tick, run:
--   SELECT public.trigger_daily_nudge();
-- then re-run this SELECT immediately after — the newest row is your answer.

-- 5) When did the nudge last actually go out, per its own bookkeeping?
SELECT last_sent_at, now() - last_sent_at AS time_since
FROM public.daily_nudge_state
WHERE id = 1;

-- 6) Is there an audience to send to at all?
SELECT
  (SELECT count(*) FROM public.user_expo_tokens) AS total_tokens,
  (SELECT count(*) FROM public.user_settings WHERE push_notifications = false) AS opted_out_users;
