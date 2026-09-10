-- Invite-only DJ membership.
-- Existing profiles stay approved. New organic signups stay pending until a
-- Studio admin (@rhood.io / portal staff) approves them. Invite codes and
-- Studio-imported directory rows skip the waitlist.
-- Safe to run multiple times.

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.is_rhood_portal_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND lower(trim(up.email)) ~ '^[^@\s]+@rhood\.io$'
    )
    OR lower(coalesce((SELECT auth.jwt()) ->> 'email', '')) ~ '^[^@\s]+@rhood\.io$'
    OR coalesce(
      ((SELECT auth.jwt()) -> 'app_metadata' ->> 'is_portal_staff')::boolean,
      false
    )
    OR (SELECT auth.jwt()) -> 'app_metadata' ->> 'role' IN ('admin', 'staff', 'portal');
$$;

REVOKE ALL ON FUNCTION public.is_rhood_portal_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_rhood_portal_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_rhood_portal_staff() TO service_role;

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS membership_status TEXT,
  ADD COLUMN IF NOT EXISTS membership_source TEXT;

UPDATE public.user_profiles
SET membership_status = 'approved',
    membership_source = COALESCE(NULLIF(membership_source, ''), 'grandfathered')
WHERE membership_status IS NULL;

ALTER TABLE public.user_profiles
  ALTER COLUMN membership_status SET DEFAULT 'pending';

UPDATE public.user_profiles
SET membership_status = 'pending'
WHERE membership_status IS NULL;

ALTER TABLE public.user_profiles
  ALTER COLUMN membership_status SET NOT NULL;

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_membership_status_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_membership_status_check
  CHECK (membership_status IN ('pending', 'approved', 'rejected'));

CREATE TABLE IF NOT EXISTS public.dj_membership_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  profile_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dj_membership_applications_status_idx
  ON public.dj_membership_applications (status, created_at DESC);

ALTER TABLE public.dj_membership_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dj_membership_select_own" ON public.dj_membership_applications;
CREATE POLICY "dj_membership_select_own"
  ON public.dj_membership_applications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_rhood_portal_staff());

DROP POLICY IF EXISTS "dj_membership_insert_own" ON public.dj_membership_applications;
CREATE POLICY "dj_membership_insert_own"
  ON public.dj_membership_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "dj_membership_staff_update" ON public.dj_membership_applications;
CREATE POLICY "dj_membership_staff_update"
  ON public.dj_membership_applications
  FOR UPDATE
  TO authenticated
  USING (public.is_rhood_portal_staff())
  WITH CHECK (public.is_rhood_portal_staff());

CREATE OR REPLACE FUNCTION public.allow_membership_status_update()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('rhood.allow_membership_update', 'on', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_membership_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND (
       NEW.membership_status IS DISTINCT FROM OLD.membership_status
       OR NEW.membership_source IS DISTINCT FROM OLD.membership_source
     )
     AND current_setting('rhood.allow_membership_update', true) IS DISTINCT FROM 'on'
     AND NOT public.is_rhood_portal_staff()
  THEN
    RAISE EXCEPTION 'Not allowed to change membership status';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_membership_status_change ON public.user_profiles;
CREATE TRIGGER guard_membership_status_change
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_membership_status_change();

CREATE OR REPLACE FUNCTION public.approve_membership_from_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.allow_membership_status_update();
  UPDATE public.user_profiles
  SET membership_status = 'approved',
      membership_source = 'invite_code',
      updated_at = NOW()
  WHERE id = NEW.referred_id;

  INSERT INTO public.dj_membership_applications (
    user_id, status, profile_snapshot, reviewed_at
  )
  SELECT
    id,
    'approved',
    jsonb_build_object(
      'dj_name', dj_name,
      'email', email,
      'city', city,
      'genres', genres,
      'source', 'invite_code'
    ),
    NOW()
  FROM public.user_profiles
  WHERE id = NEW.referred_id
  ON CONFLICT (user_id) DO UPDATE
    SET status = 'approved',
        reviewed_at = NOW(),
        updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS approve_membership_from_referral ON public.referrals;
CREATE TRIGGER approve_membership_from_referral
  AFTER INSERT ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.approve_membership_from_referral();

CREATE OR REPLACE FUNCTION public.finalize_dj_membership(p_invite_code TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  normalized TEXT;
  referrer_id UUID;
  current_status TEXT;
  snapshot JSONB;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT membership_status INTO current_status
  FROM public.user_profiles
  WHERE id = uid;

  IF current_status = 'approved' THEN
    RETURN 'approved';
  END IF;

  normalized := UPPER(BTRIM(COALESCE(p_invite_code, '')));
  IF normalized <> '' THEN
    SELECT id INTO referrer_id
    FROM public.user_profiles
    WHERE invite_code = normalized
      AND id <> uid
    LIMIT 1;

    IF referrer_id IS NOT NULL THEN
      BEGIN
        PERFORM public.process_referral(normalized, uid);
      EXCEPTION WHEN OTHERS THEN
        PERFORM public.allow_membership_status_update();
        UPDATE public.user_profiles
        SET membership_status = 'approved',
            membership_source = 'invite_code',
            updated_at = NOW()
        WHERE id = uid;
      END;

      SELECT membership_status INTO current_status
      FROM public.user_profiles
      WHERE id = uid;
      IF current_status = 'approved' THEN
        RETURN 'approved';
      END IF;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = uid) THEN
    PERFORM public.allow_membership_status_update();
    UPDATE public.user_profiles
    SET membership_status = 'approved',
        membership_source = 'invite_code',
        updated_at = NOW()
    WHERE id = uid;
    RETURN 'approved';
  END IF;

  SELECT jsonb_build_object(
    'dj_name', dj_name,
    'full_name', full_name,
    'first_name', first_name,
    'last_name', last_name,
    'email', email,
    'city', city,
    'location', location,
    'genres', genres,
    'bio', bio,
    'profile_image_url', profile_image_url,
    'instagram', instagram,
    'soundcloud', soundcloud,
    'tiktok', tiktok,
    'youtube', youtube,
    'username', username
  )
  INTO snapshot
  FROM public.user_profiles
  WHERE id = uid;

  INSERT INTO public.dj_membership_applications (user_id, status, profile_snapshot)
  VALUES (uid, 'pending', COALESCE(snapshot, '{}'::jsonb))
  ON CONFLICT (user_id) DO UPDATE
    SET profile_snapshot = EXCLUDED.profile_snapshot,
        status = CASE
          WHEN public.dj_membership_applications.status = 'approved' THEN 'approved'
          ELSE 'pending'
        END,
        updated_at = NOW();

  PERFORM public.allow_membership_status_update();
  UPDATE public.user_profiles
  SET membership_status = 'pending',
      membership_source = COALESCE(NULLIF(membership_source, ''), 'organic'),
      updated_at = NOW()
  WHERE id = uid
    AND membership_status IS DISTINCT FROM 'approved';

  SELECT membership_status INTO current_status
  FROM public.user_profiles
  WHERE id = uid;

  RETURN COALESCE(current_status, 'pending');
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_dj_membership(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_dj_membership_application(
  p_application_id UUID,
  p_status TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_rhood_portal_staff() THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF p_status IS NULL OR p_status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  UPDATE public.dj_membership_applications
  SET status = p_status,
      notes = p_notes,
      reviewed_at = CASE WHEN p_status = 'pending' THEN NULL ELSE NOW() END,
      reviewed_by = auth.uid(),
      updated_at = NOW()
  WHERE id = p_application_id;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.review_dj_membership_application(UUID, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_membership_from_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg RECORD;
  email_url TEXT;
  payload jsonb;
  hdrs jsonb;
  v_email TEXT;
  v_name TEXT;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  PERFORM public.allow_membership_status_update();
  UPDATE public.user_profiles
  SET membership_status = NEW.status,
      membership_source = COALESCE(NULLIF(membership_source, ''), 'organic'),
      updated_at = NOW()
  WHERE id = NEW.user_id;

  IF NEW.status IS DISTINCT FROM 'approved' THEN
    RETURN NEW;
  END IF;

  SELECT email, COALESCE(NULLIF(dj_name, ''), NULLIF(first_name, ''), 'there')
  INTO v_email, v_name
  FROM public.user_profiles
  WHERE id = NEW.user_id;

  INSERT INTO public.notifications (user_id, type, title, message, related_id, is_read)
  VALUES (
    NEW.user_id,
    'membership_approved',
    'You''re in',
    'Your R/HOOD application was approved. You can log in and start using the app.',
    NEW.id,
    false
  );

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

  hdrs := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-internal-secret', cfg.internal_secret
  );

  payload := jsonb_build_object(
    'user_id', NEW.user_id,
    'title', 'You''re in',
    'body', 'Your R/HOOD application was approved. You can log in and start using the app.',
    'data', jsonb_build_object('type', 'membership_approved', 'application_id', NEW.id)
  );

  PERFORM net.http_post(
    url := cfg.edge_function_url,
    body := payload,
    headers := hdrs,
    timeout_milliseconds := 10000
  );

  IF v_email IS NOT NULL AND length(trim(v_email)) > 0 THEN
    email_url := replace(cfg.edge_function_url, 'send-expo-push', 'send-email');
    PERFORM net.http_post(
      url := email_url,
      body := jsonb_build_object(
        'to', v_email,
        'subject', 'You''re in — your R/HOOD application was approved',
        'html', format(
          '<p>Hi %s,</p><p>Your application to join R/HOOD has been approved. Open the app and log in to get started.</p><p>— R/HOOD</p>',
          COALESCE(v_name, 'there')
        ),
        'text', format(
          'Hi %s,\n\nYour application to join R/HOOD has been approved. Open the app and log in to get started.\n\n— R/HOOD',
          COALESCE(v_name, 'there')
        )
      ),
      headers := hdrs,
      timeout_milliseconds := 10000
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_membership_from_application ON public.dj_membership_applications;
CREATE TRIGGER sync_membership_from_application
  AFTER UPDATE OF status ON public.dj_membership_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_membership_from_application();

-- Studio-imported directory rows skip the waitlist when the DJ claims them.
CREATE OR REPLACE FUNCTION public.claim_imported_profile()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_old_id uuid;
  v_row public.user_profiles;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  IF v_email IS NULL OR btrim(v_email) = '' THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_row FROM public.user_profiles WHERE id = v_uid;
  IF FOUND THEN
    PERFORM public.allow_membership_status_update();
    UPDATE public.user_profiles
    SET membership_status = 'approved',
        membership_source = COALESCE(NULLIF(membership_source, ''), 'studio_invite'),
        updated_at = NOW()
    WHERE id = v_uid AND membership_status IS DISTINCT FROM 'approved';
    SELECT * INTO v_row FROM public.user_profiles WHERE id = v_uid;
    RETURN to_jsonb(v_row);
  END IF;

  SELECT id INTO v_old_id
  FROM public.user_profiles
  WHERE lower(email) = lower(v_email)
    AND id <> v_uid
  LIMIT 1;

  IF v_old_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE id = v_old_id) THEN
    RAISE EXCEPTION 'This email is already registered. Please sign in instead.';
  END IF;

  BEGIN
    UPDATE public.user_profiles
    SET id = v_uid
    WHERE id = v_old_id;
  EXCEPTION
    WHEN foreign_key_violation OR unique_violation THEN
      UPDATE public.user_profiles
      SET email = 'claimed-stub-' || v_old_id::text || '@rhood.invalid'
      WHERE id = v_old_id;

      INSERT INTO public.user_profiles (
        id, email, dj_name, full_name, first_name, last_name,
        bio, city, location, genres, profile_image_url,
        instagram, soundcloud, tiktok, username, is_verified,
        membership_status, membership_source
      )
      SELECT
        v_uid, v_email, dj_name, full_name, first_name, last_name,
        bio, city, location, genres, profile_image_url,
        instagram, soundcloud, tiktok, username, is_verified,
        'approved', 'studio_invite'
      FROM public.user_profiles
      WHERE id = v_old_id;

      BEGIN
        DELETE FROM public.user_profiles WHERE id = v_old_id;
      EXCEPTION
        WHEN foreign_key_violation THEN
          NULL;
      END;
  END;

  PERFORM public.allow_membership_status_update();
  UPDATE public.user_profiles
  SET membership_status = 'approved',
      membership_source = 'studio_invite',
      updated_at = NOW()
  WHERE id = v_uid;

  SELECT * INTO v_row FROM public.user_profiles WHERE id = v_uid;
  RETURN to_jsonb(v_row);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_imported_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_imported_profile() TO authenticated;
