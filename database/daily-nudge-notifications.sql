-- ============================================================================
-- Daily "open the app" nudge push
-- ----------------------------------------------------------------------------
-- A light daily broadcast to bring DJs back into R/HOOD, with rotating copy.
-- Complements (does not replace) the weekly opportunity digest: the nudge
-- function itself skips on any day the opportunity digest already fired, so
-- Thursday release day stays a single push.
--
-- Flow: pg_cron (daily) → trigger_daily_nudge() → net.http_post →
--       send-daily-nudge Edge Function → Expo API → devices.
--
-- Prereqs:
--   1. supabase functions deploy send-daily-nudge
--   2. INTERNAL_PUSH_SECRET secret set (same value as send-expo-push)
--   3. expo_push_delivery_config (id=1) populated
--      (database/queue-expo-push-on-message-notification.sql)
--   4. pg_net + pg_cron extensions enabled
--   5. database/opportunity-digest-notifications.sql already run (provides the
--      opportunity_digest_state table the nudge checks for suppression)
--
-- Safe to run multiple times (idempotent).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE TABLE IF NOT EXISTS public.daily_nudge_state (
  id           SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_sent_at TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_nudge_state ENABLE ROW LEVEL SECURITY;
-- No policies: service role only.

INSERT INTO public.daily_nudge_state (id, last_sent_at)
VALUES (1, NULL)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.trigger_daily_nudge()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg RECORD;
  nudge_url TEXT;
BEGIN
  SELECT edge_function_url, internal_secret INTO cfg
  FROM public.expo_push_delivery_config
  WHERE id = 1;

  IF cfg IS NULL
     OR cfg.edge_function_url IS NULL
     OR length(trim(cfg.edge_function_url)) = 0
     OR cfg.internal_secret IS NULL
     OR length(trim(cfg.internal_secret)) = 0
  THEN
    RAISE NOTICE 'daily nudge skipped: expo_push_delivery_config not set';
    RETURN;
  END IF;

  nudge_url := replace(
    cfg.edge_function_url,
    'send-expo-push',
    'send-daily-nudge'
  );

  PERFORM net.http_post(
    url := nudge_url,
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', cfg.internal_secret
    ),
    timeout_milliseconds := 20000
  );
END;
$$;

-- ── Schedule: daily at 18:00 UTC ────────────────────────────────────────────
-- One hour after the opportunity digest (17:00) so that on release day the
-- digest's recency check causes the nudge to step aside.
DO $$
BEGIN
  PERFORM cron.unschedule('daily-nudge');
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

SELECT cron.schedule(
  'daily-nudge',
  '0 18 * * *',
  $$ SELECT public.trigger_daily_nudge(); $$
);

-- ----------------------------------------------------------------------------
-- Manual test:
--   SELECT public.trigger_daily_nudge();
-- Dry run (no send):
--   curl -X POST '<project>/functions/v1/send-daily-nudge' \
--     -H 'x-internal-secret: <INTERNAL_PUSH_SECRET>' \
--     -H 'Content-Type: application/json' -d '{"dry_run":true}'
-- ----------------------------------------------------------------------------
