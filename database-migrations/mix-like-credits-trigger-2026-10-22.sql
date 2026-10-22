-- Award / revoke 10 credits on every mix like, regardless of which client
-- path inserted or deleted the row (Listen feed, player bar, etc.).
-- Previously only useAudioPlayback called adjust_mix_like_credits, so likes
-- from ListenScreen never credited the DJ.

CREATE OR REPLACE FUNCTION public.apply_mix_like_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID;
  v_liker UUID;
  v_delta INTEGER;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_liker := NEW.user_id;
    v_delta := 10;
    SELECT user_id INTO v_owner FROM public.mixes WHERE id = NEW.mix_id;
  ELSIF TG_OP = 'DELETE' THEN
    v_liker := OLD.user_id;
    v_delta := -10;
    SELECT user_id INTO v_owner FROM public.mixes WHERE id = OLD.mix_id;
  ELSE
    RETURN NULL;
  END IF;

  -- No owner, or self-like — nothing to award.
  IF v_owner IS NULL OR v_owner = v_liker THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  UPDATE public.user_profiles
  SET credits = GREATEST(0, COALESCE(credits, 0) + v_delta),
      updated_at = NOW()
  WHERE id = v_owner;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Never block the like itself if credit bookkeeping fails.
    RAISE WARNING 'apply_mix_like_credits failed: %', SQLERRM;
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_mix_like_credits ON public.mix_likes;
CREATE TRIGGER trg_apply_mix_like_credits
  AFTER INSERT OR DELETE ON public.mix_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_mix_like_credits();

COMMENT ON FUNCTION public.apply_mix_like_credits() IS
  'Gives the mix owner +10 credits on like and -10 on unlike (skips self-likes).';

-- Older app builds still call this RPC after insert/delete. Credits now come
-- from the trigger above — keep the RPC as a no-op so those builds do not
-- double-award.
CREATE OR REPLACE FUNCTION public.adjust_mix_like_credits(
  mix_id_param UUID,
  delta INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner UUID;
  balance INTEGER;
BEGIN
  SELECT user_id INTO owner FROM public.mixes WHERE id = mix_id_param;
  IF owner IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT COALESCE(credits, 0) INTO balance FROM public.user_profiles WHERE id = owner;
  RETURN balance;
END;
$$;

REVOKE ALL ON FUNCTION public.adjust_mix_like_credits(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adjust_mix_like_credits(UUID, INTEGER) TO authenticated;

COMMENT ON FUNCTION public.adjust_mix_like_credits(UUID, INTEGER) IS
  'Deprecated no-op. Mix-like credits are applied by trg_apply_mix_like_credits.';
