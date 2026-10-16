-- Brand → DJ message requests + brand reply email notify
-- Safe to re-run.

-- 1) Public profile view includes brand_name + role for chat headers
DROP VIEW IF EXISTS public.user_profiles_public;
CREATE VIEW public.user_profiles_public
WITH (security_invoker = true) AS
SELECT
  id,
  dj_name,
  full_name,
  first_name,
  last_name,
  bio,
  status_message,
  location,
  city,
  genres,
  profile_image_url,
  primary_mix_id,
  created_at,
  updated_at,
  username,
  is_verified,
  gigs_completed,
  instagram,
  soundcloud,
  is_rhood_approved_promoter,
  brand_name,
  role,
  show_email,
  show_phone,
  CASE WHEN COALESCE(show_email, false) THEN email ELSE NULL END AS email,
  CASE WHEN COALESCE(show_phone, false) THEN phone ELSE NULL END AS phone
FROM public.user_profiles;

GRANT SELECT ON public.user_profiles_public TO authenticated;
REVOKE ALL ON public.user_profiles_public FROM anon;

-- 2) DJ accepts an inbound brand message request → accepted connection
CREATE OR REPLACE FUNCTION public.accept_brand_message_request(p_brand_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_role text;
  v_brand_name text;
  v_u1 uuid;
  v_u2 uuid;
  v_conn_id uuid;
  v_has_inbound boolean := false;
  v_has_connection_status boolean := false;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_brand_user_id IS NULL OR p_brand_user_id = v_me THEN
    RAISE EXCEPTION 'Invalid brand user';
  END IF;

  SELECT role, brand_name INTO v_role, v_brand_name
  FROM public.user_profiles
  WHERE id = p_brand_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Brand profile not found';
  END IF;

  IF lower(coalesce(v_role, '')) <> 'brand'
     AND coalesce(nullif(trim(v_brand_name), ''), '') = '' THEN
    RAISE EXCEPTION 'User is not a brand';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.messages m
    JOIN public.message_threads t ON t.id = m.thread_id
    WHERE m.sender_id = p_brand_user_id
      AND (
        (t.user_id_1 = v_me AND t.user_id_2 = p_brand_user_id)
        OR (t.user_id_2 = v_me AND t.user_id_1 = p_brand_user_id)
        OR (t.participant_1 = v_me AND t.participant_2 = p_brand_user_id)
        OR (t.participant_2 = v_me AND t.participant_1 = p_brand_user_id)
      )
  ) INTO v_has_inbound;

  IF NOT v_has_inbound THEN
    RAISE EXCEPTION 'No inbound brand message to accept';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'connections' AND column_name = 'connection_status'
  ) INTO v_has_connection_status;

  v_u1 := LEAST(v_me, p_brand_user_id);
  v_u2 := GREATEST(v_me, p_brand_user_id);

  SELECT id INTO v_conn_id
  FROM public.connections
  WHERE user_id_1 = v_u1 AND user_id_2 = v_u2
  LIMIT 1;

  IF v_conn_id IS NULL THEN
    IF v_has_connection_status THEN
      INSERT INTO public.connections (
        user_id_1, user_id_2, status, connection_status, initiated_by, accepted_at
      ) VALUES (
        v_u1, v_u2, 'accepted', 'accepted', p_brand_user_id, now()
      ) RETURNING id INTO v_conn_id;
    ELSE
      INSERT INTO public.connections (
        user_id_1, user_id_2, status, initiated_by, accepted_at
      ) VALUES (
        v_u1, v_u2, 'accepted', p_brand_user_id, now()
      ) RETURNING id INTO v_conn_id;
    END IF;
  ELSE
    IF v_has_connection_status THEN
      UPDATE public.connections
      SET status = 'accepted',
          connection_status = 'accepted',
          accepted_at = COALESCE(accepted_at, now()),
          updated_at = now()
      WHERE id = v_conn_id;
    ELSE
      UPDATE public.connections
      SET status = 'accepted',
          accepted_at = COALESCE(accepted_at, now()),
          updated_at = now()
      WHERE id = v_conn_id;
    END IF;
  END IF;

  RETURN v_conn_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_brand_message_request(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_brand_message_request(uuid) TO authenticated;

-- 3) Better sender names + email brands when a DJ replies
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_name TEXT;
  receiver_id UUID;
  thread_record RECORD;
  has_user_id_1 BOOLEAN;
  is_promoter BOOLEAN := false;
  receiver_role TEXT;
  receiver_email TEXT;
  receiver_brand TEXT;
  cfg RECORD;
  email_url TEXT;
  hdrs jsonb;
  payload jsonb;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'message_threads'
      AND column_name = 'user_id_1'
  ) INTO has_user_id_1;

  SELECT
    COALESCE(NULLIF(trim(brand_name), ''), NULLIF(trim(dj_name), ''), NULLIF(trim(full_name), ''), 'Someone'),
    COALESCE(is_rhood_approved_promoter, false)
  INTO sender_name, is_promoter
  FROM user_profiles
  WHERE id = NEW.sender_id;

  IF has_user_id_1 THEN
    SELECT user_id_1, user_id_2 INTO thread_record
    FROM message_threads
    WHERE id = NEW.thread_id;

    IF thread_record.user_id_1 = NEW.sender_id THEN
      receiver_id := thread_record.user_id_2;
    ELSE
      receiver_id := thread_record.user_id_1;
    END IF;
  ELSE
    SELECT participant_1, participant_2 INTO thread_record
    FROM message_threads
    WHERE id = NEW.thread_id;

    IF thread_record.participant_1 = NEW.sender_id THEN
      receiver_id := thread_record.participant_2;
    ELSE
      receiver_id := thread_record.participant_1;
    END IF;
  END IF;

  INSERT INTO notifications (user_id, title, message, type, related_id, is_read, metadata)
  VALUES (
    receiver_id,
    'New Message',
    COALESCE(sender_name, 'Someone') || ': ' || LEFT(COALESCE(NEW.content, ''), 50) ||
      CASE WHEN LENGTH(COALESCE(NEW.content, '')) > 50 THEN '...' ELSE '' END,
    'message',
    NEW.id,
    false,
    jsonb_build_object('approved_promoter', is_promoter)
  );

  -- Email brand accounts when a DJ replies (portal conversation alert)
  SELECT role, email, brand_name
  INTO receiver_role, receiver_email, receiver_brand
  FROM user_profiles
  WHERE id = receiver_id;

  IF lower(coalesce(receiver_role, '')) = 'brand'
     AND receiver_email IS NOT NULL
     AND length(trim(receiver_email)) > 0
     AND to_regclass('public.expo_push_delivery_config') IS NOT NULL THEN
    SELECT edge_function_url, internal_secret INTO cfg
    FROM public.expo_push_delivery_config
    WHERE id = 1;

    IF cfg.edge_function_url IS NOT NULL
       AND length(trim(cfg.edge_function_url)) > 0
       AND cfg.internal_secret IS NOT NULL
       AND length(trim(cfg.internal_secret)) > 0 THEN
      email_url := replace(cfg.edge_function_url, 'send-expo-push', 'send-email');
      hdrs := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-internal-secret', cfg.internal_secret
      );
      payload := jsonb_build_object(
        'to', trim(receiver_email),
        'subject', 'New reply on R/HOOD from ' || COALESCE(sender_name, 'a DJ'),
        'html',
          '<p>Hi' ||
          CASE WHEN coalesce(nullif(trim(receiver_brand), ''), '') <> ''
            THEN ' ' || trim(receiver_brand) ELSE '' END ||
          ',</p><p><strong>' || COALESCE(sender_name, 'A DJ') ||
          '</strong> replied in your R/HOOD conversation:</p><blockquote>' ||
          left(coalesce(NEW.content, ''), 500) ||
          '</blockquote><p>Open the R/HOOD portal to continue the conversation.</p>',
        'text',
          COALESCE(sender_name, 'A DJ') || ' replied: ' || left(coalesce(NEW.content, ''), 500)
      );
      BEGIN
        PERFORM net.http_post(
          url := email_url,
          body := payload,
          headers := hdrs,
          timeout_milliseconds := 10000
        );
      EXCEPTION WHEN OTHERS THEN
        -- Never fail message insert because of email
        NULL;
      END;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
