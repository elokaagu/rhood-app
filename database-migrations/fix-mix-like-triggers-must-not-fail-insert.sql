-- ============================================================================
-- Mix likes must succeed even if notify/push side-effects fail.
-- ----------------------------------------------------------------------------
-- AFTER INSERT on mix_likes writes a notifications row (and may POST to Expo).
-- If that notify path throws (missing type, RLS, pg_net, CHECK, etc.) Postgres
-- rolls back the like itself — the app then shows "We couldn't like this mix".
--
-- Safe to run multiple times.
-- ============================================================================

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
  SELECT user_id, title
    INTO v_owner_id, v_mix_title
  FROM public.mixes
  WHERE id = NEW.mix_id;

  IF v_owner_id IS NULL OR v_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

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
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'notify_on_mix_like failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

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
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'queue_expo_push_from_like_notification failed: %', SQLERRM;
    RETURN NEW;
END;
$$;
