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
