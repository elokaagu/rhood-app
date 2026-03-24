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

-- Aggregate listens across all users for discovery/trending (RLS hides rows from the client).
CREATE OR REPLACE FUNCTION public.get_mix_listen_counts(p_mix_ids uuid[])
RETURNS TABLE (mix_id uuid, session_count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT m.mix_id, COUNT(*)::bigint AS session_count
  FROM public.mix_listening_sessions m
  WHERE p_mix_ids IS NOT NULL
    AND cardinality(p_mix_ids) > 0
    AND m.mix_id = ANY (p_mix_ids)
  GROUP BY m.mix_id;
$$;

REVOKE ALL ON FUNCTION public.get_mix_listen_counts(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_mix_listen_counts(uuid[]) TO anon, authenticated;
