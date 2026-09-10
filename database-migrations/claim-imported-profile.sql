-- ============================================================================
-- Claim a Studio-imported directory profile when the person signs up
-- ----------------------------------------------------------------------------
-- Directory listings (e.g. Shannon / Soundbloks) are often inserted into
-- user_profiles with an email but no matching auth.users row. Signup creates a
-- NEW auth uid, then onboarding INSERT fails on user_profiles.email unique —
-- Complete Setup looks like it does nothing because the error modal is not
-- mounted during onboarding.
--
-- This RPC re-homes that stub onto auth.uid() so onboarding can finish.
-- Safe to run multiple times (idempotent).
-- ============================================================================

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

  -- Real auth account already owns this email — caller must sign in.
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
          NULL; -- stub kept with dummy email; new row is what the app uses
      END;
  END;

  SELECT * INTO v_row FROM public.user_profiles WHERE id = v_uid;
  RETURN to_jsonb(v_row);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_imported_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_imported_profile() TO authenticated;

COMMENT ON FUNCTION public.claim_imported_profile() IS
  'Re-homes a Studio-imported user_profiles row (same email, no auth.users) onto the signed-in user so onboarding can complete.';
