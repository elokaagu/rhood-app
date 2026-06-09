-- ============================================================================
-- Opportunity digest push notifications
-- ----------------------------------------------------------------------------
-- Sends "N new opportunities on R/HOOD" to every opted-in device when new
-- opportunities have been posted. Runs on a daily schedule but only actually
-- notifies when there's something new since the last digest, so with a Thursday
-- release cadence it naturally fires on Thursday (and still catches late/off-
-- schedule drops the next day instead of waiting a week).
--
-- Flow: pg_cron (daily) → trigger_opportunity_digest() → net.http_post →
--       send-opportunity-digest Edge Function → Expo API → devices.
--
-- Prerequisites:
--   1. Deploy the Edge Function:
--        supabase functions deploy send-opportunity-digest
--   2. Set its secret (reuse the same value as send-expo-push):
--        supabase secrets set INTERNAL_PUSH_SECRET="<strong random>"
--   3. Make sure expo_push_delivery_config (id = 1) has internal_secret set and
--      edge_function_url pointing at .../functions/v1/send-expo-push
--      (created by database/queue-expo-push-on-message-notification.sql).
--   4. Enable extensions in Dashboard → Database → Extensions: pg_net, pg_cron.
--
-- Safe to run multiple times (idempotent).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ── Watermark of the last digest we sent ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.opportunity_digest_state (
  id          SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_sent_at TIMESTAMPTZ,
  last_count   INTEGER NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.opportunity_digest_state ENABLE ROW LEVEL SECURITY;
-- No policies: service role only (Edge Function uses the service key).

COMMENT ON TABLE public.opportunity_digest_state IS
  'Single-row watermark for the opportunity digest push. Only the service role touches it.';

INSERT INTO public.opportunity_digest_state (id, last_sent_at, last_count)
VALUES (1, now(), 0)
ON CONFLICT (id) DO NOTHING;

-- Keep updated_at fresh on every change.
CREATE OR REPLACE FUNCTION public.touch_opportunity_digest_state()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_opportunity_digest_state ON public.opportunity_digest_state;
CREATE TRIGGER trg_touch_opportunity_digest_state
  BEFORE UPDATE ON public.opportunity_digest_state
  FOR EACH ROW EXECUTE FUNCTION public.touch_opportunity_digest_state();

-- ── Caller: invokes the Edge Function via pg_net ────────────────────────────
-- Reuses the internal_secret + base URL already configured for send-expo-push,
-- swapping the function name so there's a single secret to manage.
CREATE OR REPLACE FUNCTION public.trigger_opportunity_digest()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg RECORD;
  digest_url TEXT;
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
    RAISE NOTICE 'opportunity digest skipped: expo_push_delivery_config not set';
    RETURN;
  END IF;

  digest_url := replace(
    cfg.edge_function_url,
    'send-expo-push',
    'send-opportunity-digest'
  );

  PERFORM net.http_post(
    url := digest_url,
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', cfg.internal_secret
    ),
    timeout_milliseconds := 20000
  );
END;
$$;

-- ── Schedule: daily at 17:00 UTC (only notifies when there's something new) ──
-- Change the cron expression to tune the time. Examples:
--   '0 17 * * *'  → every day 17:00 UTC   (recommended: robust to late drops)
--   '0 17 * * 4'  → Thursdays only 17:00 UTC (strict weekly, can miss late drops)
DO $$
BEGIN
  -- Remove any previous schedule so re-running this file doesn't duplicate it.
  PERFORM cron.unschedule('opportunity-digest');
EXCEPTION WHEN OTHERS THEN
  -- not scheduled yet — ignore
  NULL;
END;
$$;

SELECT cron.schedule(
  'opportunity-digest',
  '0 17 * * *',
  $$ SELECT public.trigger_opportunity_digest(); $$
);

-- ----------------------------------------------------------------------------
-- Manual test (sends for real if there are new opportunities):
--   SELECT public.trigger_opportunity_digest();
-- Or hit the function directly with a dry run (counts only, no send):
--   curl -X POST '<project>/functions/v1/send-opportunity-digest' \
--     -H 'x-internal-secret: <INTERNAL_PUSH_SECRET>' \
--     -H 'Content-Type: application/json' -d '{"dry_run":true}'
-- ----------------------------------------------------------------------------
