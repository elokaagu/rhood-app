-- ============================================================================
-- Score-80 follow-up: public profile view, mix-like credits RPC, DM block.
-- Safe to run multiple times.
-- Also run if not already live (Supabase SQL Editor):
--   database-migrations/RUN-NOW-outstanding-migrations-batch2.sql
--   database-migrations/app-store-account-deletion-and-moderation.sql
-- ============================================================================

-- Public profile: never expose email/phone unless the owner opted in.
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
  show_email,
  show_phone,
  CASE WHEN COALESCE(show_email, false) THEN email ELSE NULL END AS email,
  CASE WHEN COALESCE(show_phone, false) THEN phone ELSE NULL END AS phone
FROM public.user_profiles;

GRANT SELECT ON public.user_profiles_public TO authenticated;
REVOKE ALL ON public.user_profiles_public FROM anon;

-- Mix like credits: only the server may change another user's balance.
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
  caller UUID := auth.uid();
  owner UUID;
  new_balance INTEGER;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF delta IS NULL OR delta NOT IN (10, -10) THEN
    RAISE EXCEPTION 'Invalid credit delta';
  END IF;

  SELECT user_id INTO owner FROM public.mixes WHERE id = mix_id_param;
  IF owner IS NULL THEN
    RAISE EXCEPTION 'Mix not found';
  END IF;
  IF owner = caller THEN
    RETURN NULL;
  END IF;

  IF delta > 0 THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.mix_likes
      WHERE mix_id = mix_id_param AND user_id = caller
    ) THEN
      RAISE EXCEPTION 'Like required to award credits';
    END IF;
  END IF;

  UPDATE public.user_profiles
  SET credits = GREATEST(0, COALESCE(credits, 0) + delta),
      updated_at = NOW()
  WHERE id = owner
  RETURNING credits INTO new_balance;

  RETURN new_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.adjust_mix_like_credits(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adjust_mix_like_credits(UUID, INTEGER) TO authenticated;

-- Either-direction block list (RLS on blocked_users is one-way).
CREATE OR REPLACE FUNCTION public.blocked_user_ids_either_way()
RETURNS UUID[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me UUID := auth.uid();
BEGIN
  IF me IS NULL THEN
    RETURN ARRAY[]::UUID[];
  END IF;
  RETURN ARRAY(
    SELECT DISTINCT other_id FROM (
      SELECT blocked_id AS other_id FROM public.blocked_users WHERE blocker_id = me
      UNION
      SELECT blocker_id AS other_id FROM public.blocked_users WHERE blocked_id = me
    ) ids
  );
END;
$$;

REVOKE ALL ON FUNCTION public.blocked_user_ids_either_way() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.blocked_user_ids_either_way() TO authenticated;

CREATE OR REPLACE FUNCTION public.messaging_blocked_with(other_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(other_id = ANY(public.blocked_user_ids_either_way()), false);
$$;

REVOKE ALL ON FUNCTION public.messaging_blocked_with(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.messaging_blocked_with(UUID) TO authenticated;

-- Block DMs at the database (works even if a client skips the check).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'receiver_id'
  ) THEN
    DROP POLICY IF EXISTS messages_insert_not_blocked ON public.messages;
    CREATE POLICY messages_insert_not_blocked ON public.messages
      AS RESTRICTIVE
      FOR INSERT
      TO authenticated
      WITH CHECK (
        sender_id = auth.uid()
        AND (
          receiver_id IS NULL
          OR NOT public.messaging_blocked_with(receiver_id)
        )
      );
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'message_threads' AND column_name = 'participant_1'
  ) THEN
    DROP POLICY IF EXISTS message_threads_insert_not_blocked ON public.message_threads;
    CREATE POLICY message_threads_insert_not_blocked ON public.message_threads
      AS RESTRICTIVE
      FOR INSERT
      TO authenticated
      WITH CHECK (
        NOT public.messaging_blocked_with(participant_1)
        AND NOT public.messaging_blocked_with(participant_2)
      );
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'message_threads' AND column_name = 'user_id_1'
  ) THEN
    DROP POLICY IF EXISTS message_threads_insert_not_blocked ON public.message_threads;
    CREATE POLICY message_threads_insert_not_blocked ON public.message_threads
      AS RESTRICTIVE
      FOR INSERT
      TO authenticated
      WITH CHECK (
        NOT public.messaging_blocked_with(user_id_1)
        AND NOT public.messaging_blocked_with(user_id_2)
      );
  END IF;
END $$;
