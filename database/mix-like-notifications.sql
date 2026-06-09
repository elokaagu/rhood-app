-- ============================================================================
-- Mix like notifications (in-app + push)
-- ----------------------------------------------------------------------------
-- When someone likes a mix, the mix owner gets:
--   1. An in-app notification row (type = 'mix_like') shown in the Notifications
--      tab.
--   2. A push notification (via the same send-expo-push Edge Function used for
--      messages), delivered when the owner has push notifications on.
--
-- Flow:
--   INSERT mix_likes
--     → notify_on_mix_like()  → INSERT notifications (type='mix_like')
--       → queue_expo_push_from_like_notification() → net.http_post
--         → send-expo-push → Expo API → device
--
-- Prereqs: pg_net enabled and expo_push_delivery_config seeded
--          (see database/queue-expo-push-on-message-notification.sql).
-- Safe to run multiple times (idempotent).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── 1. Create the in-app notification when a mix is liked ────────────────────
CREATE OR REPLACE FUNCTION public.notify_on_mix_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id   uuid;
  v_mix_title  text;
  v_liker_name text;
BEGIN
  -- Who owns the liked mix, and what's it called?
  SELECT user_id, title
    INTO v_owner_id, v_mix_title
  FROM public.mixes
  WHERE id = NEW.mix_id;

  -- No owner found, or you liked your own mix → nothing to notify.
  IF v_owner_id IS NULL OR v_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Friendly name for the liker.
  SELECT COALESCE(
           NULLIF(dj_name, ''),
           NULLIF(trim(concat_ws(' ', first_name, last_name)), ''),
           'Someone'
         )
    INTO v_liker_name
  FROM public.user_profiles
  WHERE id = NEW.user_id;

  v_liker_name := COALESCE(v_liker_name, 'Someone');

  INSERT INTO public.notifications (user_id, type, title, message, related_id)
  VALUES (
    v_owner_id,
    'mix_like',
    'New like ❤️',
    v_liker_name || ' liked your mix'
      || CASE WHEN v_mix_title IS NOT NULL AND length(trim(v_mix_title)) > 0
              THEN ' "' || v_mix_title || '"'
              ELSE '' END,
    NEW.mix_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_mix_like ON public.mix_likes;
CREATE TRIGGER trg_notify_on_mix_like
  AFTER INSERT ON public.mix_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_mix_like();

-- ── 2. Queue an Expo push when a mix_like notification is inserted ───────────
CREATE OR REPLACE FUNCTION public.queue_expo_push_from_like_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg RECORD;
BEGIN
  IF NEW.type IS DISTINCT FROM 'mix_like' THEN
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

  PERFORM net.http_post(
    url := cfg.edge_function_url,
    body := jsonb_build_object(
      'user_id', NEW.user_id,
      'title', 'R/HOOD',
      'body', COALESCE(NEW.message, 'Someone liked your mix'),
      'data', jsonb_build_object(
        'type', 'mix_like',
        'notification_id', NEW.id,
        'related_id', NEW.related_id
      )
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', cfg.internal_secret
    ),
    timeout_milliseconds := 10000
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS queue_expo_push_after_like_notification ON public.notifications;
CREATE TRIGGER queue_expo_push_after_like_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  WHEN (NEW.type = 'mix_like')
  EXECUTE FUNCTION public.queue_expo_push_from_like_notification();
