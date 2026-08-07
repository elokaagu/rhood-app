-- ============================================================================
-- "Delete for you" — actually persist it server-side
-- ----------------------------------------------------------------------------
-- components/MessagesScreen.js's handleDeleteForYou only filtered local
-- component state (explicitly TODO'd: "Implement delete for you in
-- database"). The confirmation dialog ("This message will be hidden from
-- you...") implied it worked, but nothing was written to the server —
-- sending any new message (which reloads 300ms later) or simply reopening
-- the thread made the "deleted" message reappear with no indication the
-- deletion never took effect.
--
-- Adds a per-user hide list to both message tables (messages for 1:1
-- threads, community_posts for group chats) and a small SECURITY DEFINER
-- RPC to append to it — self-scoped to auth.uid() internally, so a caller
-- can only ever hide a message for themselves, never for anyone else, and
-- it works on any message in a thread you're part of (not just your own),
-- matching what "delete for you" is supposed to mean.
--
-- Run in Supabase SQL Editor. Safe to run multiple times (idempotent).
-- ============================================================================

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS deleted_for_user_ids UUID[] NOT NULL DEFAULT '{}';

ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS deleted_for_user_ids UUID[] NOT NULL DEFAULT '{}';

CREATE OR REPLACE FUNCTION public.delete_message_for_me(
  p_message_id UUID,
  p_table TEXT -- 'messages' or 'community_posts'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_table = 'messages' THEN
    UPDATE public.messages
    SET deleted_for_user_ids = array_append(deleted_for_user_ids, v_caller_id)
    WHERE id = p_message_id
      AND NOT (v_caller_id = ANY(deleted_for_user_ids));
  ELSIF p_table = 'community_posts' THEN
    UPDATE public.community_posts
    SET deleted_for_user_ids = array_append(deleted_for_user_ids, v_caller_id)
    WHERE id = p_message_id
      AND NOT (v_caller_id = ANY(deleted_for_user_ids));
  ELSE
    RAISE EXCEPTION 'Unknown table: %', p_table;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_message_for_me(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION public.delete_message_for_me(UUID, TEXT) IS
  'Hides a message/post for the caller only — appends auth.uid() to deleted_for_user_ids. Idempotent (WHERE NOT already present).';

-- Verify: run as any authenticated user against a real message id —
-- deleted_for_user_ids should now contain your own uid, and running it a
-- second time should be a no-op (not a duplicate entry):
--   SELECT delete_message_for_me('<some message id>', 'messages');
--   SELECT id, deleted_for_user_ids FROM public.messages WHERE id = '<same id>';
