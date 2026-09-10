-- Align a previously-run app membership SQL with Studio's
-- 20260910180000_dj_membership_approval.sql.
--
-- Run Studio's migration first. Then run this once if the app's older
-- finalize_dj_membership / dj_membership_applications objects exist.
-- Safe to run multiple times.
--
-- Emails stay on Studio (existing Resend). Push reuses send-expo-push and
-- expo_push_delivery_config — no new secrets.

CREATE EXTENSION IF NOT EXISTS pg_net;

DROP TRIGGER IF EXISTS guard_membership_status_change ON public.user_profiles;
DROP TRIGGER IF EXISTS approve_membership_from_referral ON public.referrals;
DROP TRIGGER IF EXISTS sync_membership_from_application ON public.dj_membership_applications;

DROP FUNCTION IF EXISTS public.guard_membership_status_change();
DROP FUNCTION IF EXISTS public.approve_membership_from_referral();
DROP FUNCTION IF EXISTS public.sync_membership_from_application();
DROP FUNCTION IF EXISTS public.finalize_dj_membership(TEXT);
DROP FUNCTION IF EXISTS public.review_dj_membership_application(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.allow_membership_status_update();

UPDATE public.user_profiles
SET membership_source = CASE membership_source
  WHEN 'grandfathered' THEN 'existing'
  WHEN 'organic' THEN 'application'
  WHEN 'studio_invite' THEN 'invite'
  ELSE membership_source
END
WHERE membership_source IN ('grandfathered', 'organic', 'studio_invite');

DROP TABLE IF EXISTS public.dj_membership_applications CASCADE;

-- Restore the original claim RPC (it does not need to write membership;
-- Studio's insert trigger / admin tools own that).
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
        instagram, soundcloud, tiktok, username, is_verified
      )
      SELECT
        v_uid, v_email, dj_name, full_name, first_name, last_name,
        bio, city, location, genres, profile_image_url,
        instagram, soundcloud, tiktok, username, is_verified
      FROM public.user_profiles
      WHERE id = v_old_id;

      BEGIN
        DELETE FROM public.user_profiles WHERE id = v_old_id;
      EXCEPTION
        WHEN foreign_key_violation THEN
          NULL;
      END;
  END;

  SELECT * INTO v_row FROM public.user_profiles WHERE id = v_uid;
  RETURN to_jsonb(v_row);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_imported_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_imported_profile() TO authenticated;

-- When Studio sets membership_status to approved, insert an in-app notification
-- and reuse the existing send-expo-push Edge Function.
CREATE OR REPLACE FUNCTION public.notify_dj_membership_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg RECORD;
BEGIN
  IF NEW.membership_status IS DISTINCT FROM 'approved'
     OR OLD.membership_status IS NOT DISTINCT FROM 'approved' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message, related_id, is_read)
  VALUES (
    NEW.id,
    'membership_approved',
    'You''re in',
    'Your R/HOOD application was approved. Open the app to get started.',
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

  PERFORM net.http_post(
    url := cfg.edge_function_url,
    body := jsonb_build_object(
      'user_id', NEW.id,
      'title', 'You''re in',
      'body', 'Your R/HOOD application was approved. Open the app to get started.',
      'data', jsonb_build_object('type', 'membership_approved')
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

DROP TRIGGER IF EXISTS notify_dj_membership_approved ON public.user_profiles;
CREATE TRIGGER notify_dj_membership_approved
  AFTER UPDATE OF membership_status ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_dj_membership_approved();
