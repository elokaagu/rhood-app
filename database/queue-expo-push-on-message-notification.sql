-- Queue remote Expo push when a DM in-app notification row is inserted.
-- Requires: pg_net enabled (Dashboard → Database → Extensions → pg_net).
--
-- After running this migration:
-- 1. Deploy Edge Function: supabase/functions/send-expo-push
-- 2. supabase secrets set INTERNAL_PUSH_SECRET="<strong random>"
-- 3. UPDATE public.expo_push_delivery_config SET internal_secret = '<same secret>' WHERE id = 1;
-- 4. If your project URL differs, update edge_function_url in that row.
--
-- Flow: INSERT notifications (type = message) → trigger → net.http_post → send-expo-push → Expo API → device.

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE IF NOT EXISTS public.expo_push_delivery_config (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  edge_function_url TEXT NOT NULL DEFAULT '',
  internal_secret TEXT NOT NULL DEFAULT ''
);

ALTER TABLE public.expo_push_delivery_config ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.expo_push_delivery_config IS
  'Single-row config for pg_net → send-expo-push. No RLS policies: only table owner / service role can read; app clients cannot.';

-- Seed URL for this repo’s default Supabase project; secret stays empty until you set it.
INSERT INTO public.expo_push_delivery_config (id, edge_function_url, internal_secret)
VALUES (
  1,
  'https://jsmcduecuxtaqizhmiqo.supabase.co/functions/v1/send-expo-push',
  ''
)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.queue_expo_push_from_message_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg RECORD;
  payload jsonb;
  hdrs jsonb;
BEGIN
  IF NEW.type IS DISTINCT FROM 'message' THEN
    RETURN NEW;
  END IF;

  SELECT edge_function_url, internal_secret INTO cfg
  FROM public.expo_push_delivery_config
  WHERE id = 1;

  IF cfg IS NULL
     OR cfg.edge_function_url IS NULL
     OR length(trim(cfg.edge_function_url)) = 0
     OR cfg.internal_secret IS NULL
     OR length(trim(cfg.internal_secret)) = 0
  THEN
    RETURN NEW;
  END IF;

  payload := jsonb_build_object(
    'user_id', NEW.user_id,
    'title', COALESCE(NEW.title, 'New Message'),
    'body', COALESCE(NEW.message, ''),
    'data', jsonb_build_object(
      'type', 'message',
      'notification_id', NEW.id,
      'related_id', NEW.related_id
    )
  );

  hdrs := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-internal-secret', cfg.internal_secret
  );

  PERFORM net.http_post(
    url := cfg.edge_function_url,
    body := payload,
    headers := hdrs,
    timeout_milliseconds := 10000
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS queue_expo_push_after_message_notification ON public.notifications;
CREATE TRIGGER queue_expo_push_after_message_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  WHEN (NEW.type = 'message')
  EXECUTE FUNCTION public.queue_expo_push_from_message_notification();
