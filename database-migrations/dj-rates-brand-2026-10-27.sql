-- DJs rate the brand (1–5 stars) after a completed gig.
-- Stored on gigs.venue_rating (existing column, beside the brand's dj_rating).
-- Private: gigs are only readable by the DJ, the opportunity's organiser and admins.

-- 0) notifications.type is constrained. 'mix_like' was missing too, so
--    like notifications (and their pushes) were silently never created.
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (((type)::text = ANY (ARRAY[
  'opportunity'::text, 'application'::text, 'message'::text, 'system'::text,
  'connection_request'::text, 'connection_accepted'::text, 'application_approved'::text,
  'application_rejected'::text, 'membership_approved'::text, 'mix_like'::text, 'rate_brand'::text
])));

-- 1) Display name of the brand behind a gig, or NULL when there is no brand to rate.
CREATE OR REPLACE FUNCTION public.gig_brand_name(p_opportunity_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(trim(up.brand_name), ''),
    NULLIF(trim(o.organizer_name), ''),
    NULLIF(trim(up.dj_name), ''),
    NULLIF(trim(up.full_name), ''),
    'the brand'
  )
  FROM public.opportunities o
  LEFT JOIN public.user_profiles up ON up.id = o.organizer_id
  WHERE o.id = p_opportunity_id
    AND o.organizer_id IS NOT NULL
$$;

REVOKE ALL ON FUNCTION public.gig_brand_name(uuid) FROM PUBLIC;

-- 2) Only the gig's DJ (or an admin) may set venue_rating, only on a completed
--    gig, and only 1–5. Brands can edit their gigs, so this stops a brand
--    rating itself. Service role / SQL editor (no auth.uid()) is unrestricted.
CREATE OR REPLACE FUNCTION public.guard_gig_brand_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_old numeric;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    v_old := OLD.venue_rating;
  END IF;
  IF NEW.venue_rating IS NOT DISTINCT FROM v_old OR v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_uid IS DISTINCT FROM NEW.dj_id
     AND NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = v_uid AND role = 'admin') THEN
    NEW.venue_rating := v_old;
    RETURN NEW;
  END IF;

  IF NEW.venue_rating IS NOT NULL THEN
    IF NEW.venue_rating NOT IN (1, 2, 3, 4, 5) THEN
      RAISE EXCEPTION 'Rating must be between 1 and 5 stars';
    END IF;
    IF lower(coalesce(NEW.status, '')) <> 'completed' THEN
      RAISE EXCEPTION 'You can rate the brand once the gig is completed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS b_guard_gig_brand_rating ON public.gigs;
CREATE TRIGGER b_guard_gig_brand_rating
  BEFORE INSERT OR UPDATE ON public.gigs
  FOR EACH ROW EXECUTE FUNCTION public.guard_gig_brand_rating();

-- 3) What the app calls. Re-rating is allowed (the DJ can change their mind).
CREATE OR REPLACE FUNCTION public.rate_brand_for_gig(p_gig_id uuid, p_stars integer)
RETURNS public.gigs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_gig public.gigs;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;
  IF p_stars IS NULL OR p_stars < 1 OR p_stars > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5 stars';
  END IF;

  SELECT * INTO v_gig FROM public.gigs WHERE id = p_gig_id;
  IF NOT FOUND OR v_gig.dj_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Gig not found';
  END IF;
  IF lower(coalesce(v_gig.status, '')) <> 'completed' THEN
    RAISE EXCEPTION 'You can rate the brand once the gig is completed';
  END IF;
  IF v_gig.opportunity_id IS NULL OR public.gig_brand_name(v_gig.opportunity_id) IS NULL THEN
    RAISE EXCEPTION 'This gig has no brand to rate';
  END IF;

  UPDATE public.gigs SET venue_rating = p_stars WHERE id = p_gig_id
  RETURNING * INTO v_gig;

  UPDATE public.notifications
  SET is_read = true
  WHERE user_id = v_uid AND type = 'rate_brand' AND related_id = p_gig_id AND is_read IS NOT TRUE;

  RETURN v_gig;
END;
$$;

REVOKE ALL ON FUNCTION public.rate_brand_for_gig(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rate_brand_for_gig(uuid, integer) TO authenticated;

-- 4) When a gig with a brand becomes completed, ask the DJ to rate the brand.
CREATE OR REPLACE FUNCTION public.notify_dj_to_rate_brand()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_brand text;
BEGIN
  IF lower(coalesce(NEW.status, '')) <> 'completed'
     OR (TG_OP = 'UPDATE' AND lower(coalesce(OLD.status, '')) = 'completed')
     OR NEW.dj_id IS NULL
     OR NEW.venue_rating IS NOT NULL
     OR NEW.opportunity_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_brand := public.gig_brand_name(NEW.opportunity_id);
  IF v_brand IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, related_id, is_read, metadata)
  VALUES (
    NEW.dj_id,
    'Rate ' || v_brand,
    'How was working with ' || v_brand || ' on "' || COALESCE(NEW.name, 'your gig') || '"? Tap to rate them out of 5 stars.',
    'rate_brand',
    NEW.id,
    false,
    jsonb_build_object('gig_id', NEW.id, 'brand_name', v_brand)
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'notify_dj_to_rate_brand failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_dj_to_rate_brand ON public.gigs;
CREATE TRIGGER trg_notify_dj_to_rate_brand
  AFTER INSERT OR UPDATE OF status ON public.gigs
  FOR EACH ROW EXECUTE FUNCTION public.notify_dj_to_rate_brand();

-- 5) Push for the rate_brand notification (same delivery as mix likes).
CREATE OR REPLACE FUNCTION public.queue_expo_push_from_rate_brand_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg RECORD;
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
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := cfg.edge_function_url,
    body := jsonb_build_object(
      'user_id', NEW.user_id,
      'title', COALESCE(NEW.title, 'R/HOOD'),
      'body', COALESCE(NEW.message, 'Rate the brand from your last gig'),
      'data', jsonb_build_object(
        'type', 'rate_brand',
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
    RAISE WARNING 'queue_expo_push_from_rate_brand_notification failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS queue_expo_push_after_rate_brand_notification ON public.notifications;
CREATE TRIGGER queue_expo_push_after_rate_brand_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  WHEN ((NEW.type)::text = 'rate_brand')
  EXECUTE FUNCTION public.queue_expo_push_from_rate_brand_notification();
