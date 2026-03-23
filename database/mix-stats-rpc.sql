-- Run in Supabase SQL editor so listeners can update public mix stats under RLS.
-- Client calls these from hooks/useAudioPlayback.js (play start + duration backfill).

CREATE OR REPLACE FUNCTION public.increment_mix_play_count(p_mix_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.mixes
  SET play_count = COALESCE(play_count, 0) + 1
  WHERE id = p_mix_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.backfill_mix_duration_seconds(
  p_mix_id uuid,
  p_seconds integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_seconds IS NULL OR p_seconds <= 0 THEN
    RETURN;
  END IF;
  UPDATE public.mixes
  SET duration = p_seconds
  WHERE id = p_mix_id
    AND (duration IS NULL OR duration = 0);
END;
$$;

REVOKE ALL ON FUNCTION public.increment_mix_play_count(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.backfill_mix_duration_seconds(uuid, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.increment_mix_play_count(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.backfill_mix_duration_seconds(uuid, integer) TO anon, authenticated;
