-- Award achievement credits_reward when a badge is first earned.
-- Make process_referral / ensure_user_invite_code able to write the referrer's
-- credits (same user_profiles.invite_code Studio Admin reads).
-- Safe to run multiple times.

CREATE OR REPLACE FUNCTION public.award_achievement_if_new(
  p_user_id UUID,
  p_name TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ach RECORD;
  v_inserted UUID;
BEGIN
  IF p_user_id IS NULL OR p_name IS NULL THEN
    RETURN;
  END IF;

  SELECT id, COALESCE(credits_reward, 0) AS credits_reward
  INTO v_ach
  FROM public.achievements
  WHERE name = p_name
    AND COALESCE(is_active, true) = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  INSERT INTO public.user_achievements (user_id, achievement_id, earned)
  VALUES (p_user_id, v_ach.id, true)
  ON CONFLICT (user_id, achievement_id) DO NOTHING
  RETURNING user_id INTO v_inserted;

  IF v_inserted IS NOT NULL AND v_ach.credits_reward > 0 THEN
    UPDATE public.user_profiles
    SET credits = COALESCE(credits, 0) + v_ach.credits_reward,
        updated_at = NOW()
    WHERE id = p_user_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_and_award_achievements(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gigs_completed INTEGER;
  v_rating DECIMAL(2,1);
  v_mixes_uploaded INTEGER;
  v_connections_count INTEGER;
  v_is_verified BOOLEAN;
BEGIN
  SELECT
    COALESCE(gigs_completed, 0),
    COALESCE(rating, 0),
    COALESCE(is_verified, false)
  INTO
    v_gigs_completed,
    v_rating,
    v_is_verified
  FROM public.user_profiles
  WHERE id = p_user_id;

  SELECT COUNT(*) INTO v_mixes_uploaded
  FROM public.mixes
  WHERE user_id = p_user_id;

  SELECT COUNT(*) INTO v_connections_count
  FROM public.connections
  WHERE (user_id_1 = p_user_id OR user_id_2 = p_user_id)
    AND status = 'accepted';

  IF v_gigs_completed >= 1 THEN
    PERFORM public.award_achievement_if_new(p_user_id, 'First Gig');
  END IF;
  IF v_gigs_completed >= 10 THEN
    PERFORM public.award_achievement_if_new(p_user_id, '10 Gigs');
  END IF;
  IF v_gigs_completed >= 50 THEN
    PERFORM public.award_achievement_if_new(p_user_id, '50 Gigs');
  END IF;
  IF v_rating >= 4.8 THEN
    PERFORM public.award_achievement_if_new(p_user_id, '5-Star Rating');
  END IF;
  IF v_rating >= 4.9 AND v_gigs_completed >= 20 THEN
    PERFORM public.award_achievement_if_new(p_user_id, 'Top Performer');
  END IF;
  IF v_mixes_uploaded >= 1 THEN
    PERFORM public.award_achievement_if_new(p_user_id, 'First Mix');
  END IF;
  IF v_connections_count >= 2 THEN
    PERFORM public.award_achievement_if_new(p_user_id, 'Social Butterfly');
  END IF;
  IF v_connections_count >= 50 THEN
    PERFORM public.award_achievement_if_new(p_user_id, 'Community Builder');
  END IF;
  IF v_is_verified THEN
    PERFORM public.award_achievement_if_new(p_user_id, 'Verified Artist');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_achievement_if_new(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_award_achievements(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.ensure_user_invite_code(user_uuid UUID)
RETURNS VARCHAR(20)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_code VARCHAR(20);
  new_code VARCHAR(20);
  caller UUID := auth.uid();
BEGIN
  IF caller IS NULL OR caller <> user_uuid THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  SELECT invite_code INTO existing_code
  FROM public.user_profiles
  WHERE id = user_uuid;

  IF existing_code IS NULL OR existing_code = '' THEN
    new_code := public.generate_invite_code();
    UPDATE public.user_profiles
    SET invite_code = new_code
    WHERE id = user_uuid;
    RETURN new_code;
  END IF;

  RETURN existing_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_referral(
  invite_code_param VARCHAR(20),
  new_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_record RECORD;
  referral_exists BOOLEAN;
  credits_to_award INTEGER := 25;
  caller UUID := auth.uid();
  normalized VARCHAR(20);
  v_inserted INTEGER;
BEGIN
  IF caller IS NULL OR caller <> new_user_id THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  normalized := UPPER(BTRIM(invite_code_param));

  IF EXISTS(
    SELECT 1 FROM public.user_profiles
    WHERE id = new_user_id AND invite_code = normalized
  ) THEN
    RETURN false;
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.referrals WHERE referred_id = new_user_id)
  INTO referral_exists;

  IF referral_exists THEN
    RETURN false;
  END IF;

  SELECT id INTO referrer_record
  FROM public.user_profiles
  WHERE invite_code = normalized;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  INSERT INTO public.referrals (referrer_id, referred_id, invite_code, credits_awarded)
  VALUES (referrer_record.id, new_user_id, normalized, true)
  ON CONFLICT (referred_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 0 THEN
    RETURN false;
  END IF;

  UPDATE public.user_profiles
  SET credits = COALESCE(credits, 0) + credits_to_award,
      updated_at = NOW()
  WHERE id = referrer_record.id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_user_invite_code(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_referral(VARCHAR, UUID) TO authenticated;
