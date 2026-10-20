-- Keep Listen / Trending fast as the catalogue grows: phones fetch one ranked
-- page at a time instead of every mix and every like.

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- mixes.likes_count existed but nothing maintained it (all rows were 0).
CREATE OR REPLACE FUNCTION public.sync_mix_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    UPDATE public.mixes
    SET likes_count = (SELECT count(*) FROM public.mix_likes WHERE mix_id = OLD.mix_id)
    WHERE id = OLD.mix_id;
  END IF;
  IF TG_OP <> 'DELETE' THEN
    UPDATE public.mixes
    SET likes_count = (SELECT count(*) FROM public.mix_likes WHERE mix_id = NEW.mix_id)
    WHERE id = NEW.mix_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_mix_likes_count ON public.mix_likes;
CREATE TRIGGER trg_sync_mix_likes_count
AFTER INSERT OR DELETE OR UPDATE OF mix_id ON public.mix_likes
FOR EACH ROW EXECUTE FUNCTION public.sync_mix_likes_count();

UPDATE public.mixes m
SET likes_count = sub.n
FROM (
  SELECT m2.id, count(l.mix_id)::int AS n
  FROM public.mixes m2
  LEFT JOIN public.mix_likes l ON l.mix_id = m2.id
  GROUP BY m2.id
) sub
WHERE sub.id = m.id
  AND m.likes_count IS DISTINCT FROM sub.n;

CREATE INDEX IF NOT EXISTS idx_mixes_public_created_at
  ON public.mixes (created_at DESC)
  WHERE is_public;

CREATE INDEX IF NOT EXISTS idx_mixes_search_trgm
  ON public.mixes
  USING gin ((coalesce(title, '') || ' ' || coalesce(artist, '') || ' ' || coalesce(genre, '')) extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_user_profiles_dj_name_trgm
  ON public.user_profiles
  USING gin (dj_name extensions.gin_trgm_ops);

-- Same ranking as lib/trendingScore.js (log-weighted likes + plays, recency
-- decay, newness boost, low-signal gates), computed in the database.
CREATE OR REPLACE FUNCTION public.get_trending_mixes(
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  title text,
  artist text,
  genre text,
  description text,
  duration text,
  file_url text,
  artwork_url text,
  image_url text,
  created_at timestamptz,
  play_count integer,
  likes_count integer,
  dj_name text,
  first_name text,
  last_name text,
  profile_image_url text,
  trending_score double precision
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      m.*,
      GREATEST(0, COALESCE(m.likes_count, 0))::double precision AS lk,
      GREATEST(0, COALESCE(m.play_count, 0), COALESCE(m.plays, 0))::double precision AS pl,
      GREATEST(
        0,
        EXTRACT(EPOCH FROM (now() - COALESCE(m.created_at, now() - interval '90 days'))) / 86400.0
      )::double precision AS age
    FROM public.mixes m
    WHERE m.is_public
  ),
  scored AS (
    SELECT
      b.*,
      (2.5 * ln(1 + b.lk) + ln(1 + b.pl)) * (1.0 / (1 + b.age / 21.0))
        + CASE WHEN b.age < 10 THEN 0.2 * GREATEST(0, 1 - b.age / 10.0) ELSE 0 END AS s0
    FROM base b
  ),
  gated AS (
    SELECT
      s.*,
      CASE
        WHEN s.lk + s.pl < 1 AND s.age > 10 THEN 0
        WHEN s.lk + s.pl < 1 THEN s.s0 * 0.35
        ELSE s.s0
      END AS s1
    FROM scored s
  ),
  final AS (
    SELECT
      g.*,
      CASE WHEN g.s1 < 0.02 AND g.lk + g.pl < 2 AND g.age > 14 THEN 0 ELSE g.s1 END AS score
    FROM gated g
  )
  SELECT
    f.id, f.user_id, f.title, f.artist, f.genre, f.description, f.duration,
    f.file_url, f.artwork_url, f.image_url, f.created_at,
    f.pl::integer, f.lk::integer,
    p.dj_name, p.first_name, p.last_name, p.profile_image_url,
    f.score
  FROM final f
  LEFT JOIN public.user_profiles p ON p.id = f.user_id
  WHERE f.score > 0
  ORDER BY f.score DESC, f.created_at DESC NULLS LAST, f.id DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

-- Search every public mix by title, artist, genre or the DJ's name.
CREATE OR REPLACE FUNCTION public.search_mixes(
  p_query text,
  p_limit integer DEFAULT 30
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  title text,
  artist text,
  genre text,
  description text,
  duration text,
  file_url text,
  artwork_url text,
  image_url text,
  created_at timestamptz,
  play_count integer,
  likes_count integer,
  dj_name text,
  first_name text,
  last_name text,
  profile_image_url text,
  trending_score double precision
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH q AS (
    SELECT '%' || replace(replace(replace(trim(p_query), '\', '\\'), '%', '\%'), '_', '\_') || '%' AS pattern
    WHERE length(trim(coalesce(p_query, ''))) >= 2
  ),
  hits AS (
    SELECT m.id
    FROM public.mixes m, q
    WHERE m.is_public
      AND (coalesce(m.title, '') || ' ' || coalesce(m.artist, '') || ' ' || coalesce(m.genre, '')) ILIKE q.pattern
    UNION
    SELECT m.id
    FROM public.user_profiles p
    JOIN public.mixes m ON m.user_id = p.id
    CROSS JOIN q
    WHERE m.is_public
      AND p.dj_name ILIKE q.pattern
  )
  SELECT
    m.id, m.user_id, m.title, m.artist, m.genre, m.description, m.duration,
    m.file_url, m.artwork_url, m.image_url, m.created_at,
    GREATEST(0, COALESCE(m.play_count, 0), COALESCE(m.plays, 0))::integer,
    GREATEST(0, COALESCE(m.likes_count, 0))::integer,
    p.dj_name, p.first_name, p.last_name, p.profile_image_url,
    NULL::double precision
  FROM hits h
  JOIN public.mixes m ON m.id = h.id
  LEFT JOIN public.user_profiles p ON p.id = m.user_id
  ORDER BY m.created_at DESC NULLS LAST, m.id DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 30), 1), 50);
$$;

REVOKE ALL ON FUNCTION public.get_trending_mixes(integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.search_mixes(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_trending_mixes(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_mixes(text, integer) TO authenticated;
