-- ============================================================================
-- CRITICAL: Enable RLS on public.message_threads
-- ----------------------------------------------------------------------------
-- message_threads has no RLS at all, even though the ALREADY-APPLIED messages
-- table policy (database/fix-all-messaging-rls.sql) is built entirely on
-- trusting it:
--   messages SELECT/INSERT policy: EXISTS (SELECT 1 FROM message_threads mt
--     WHERE mt.id = messages.thread_id AND (mt.user_id_1 = auth.uid() OR ...))
-- Without RLS on message_threads itself, any authenticated user can:
--   - UPDATE message_threads SET user_id_2 = <their own id> WHERE id = '<any
--     thread>' — hijacking themselves into an existing private DM, which then
--     satisfies the messages EXISTS check and hands them full read/write
--     access to that conversation.
--   - SELECT * FROM message_threads with no filter — dumping every user's
--     thread participant pairs (a full "who is messaging whom" social graph).
-- This migration closes both.
--
-- The repo has two different column-naming conventions in circulation across
-- files (user_id_1/user_id_2 in lib/supabase/db.js — the "current production
-- schema" per fix-all-messaging-rls.sql's own comment — vs participant_1/
-- participant_2 in lib/connectionsService.js). This migration detects which
-- one actually exists on your database and applies the matching policies,
-- exactly like fix-all-messaging-rls.sql already does for the messages table.
--
-- Run in Supabase SQL Editor. Safe to run multiple times (idempotent).
-- ============================================================================

ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  has_user_id_1 BOOLEAN;
  has_participant_1 BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'message_threads' AND column_name = 'user_id_1'
  ) INTO has_user_id_1;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'message_threads' AND column_name = 'participant_1'
  ) INTO has_participant_1;

  DROP POLICY IF EXISTS "message_threads_select_participant" ON public.message_threads;
  DROP POLICY IF EXISTS "message_threads_insert_participant" ON public.message_threads;
  DROP POLICY IF EXISTS "message_threads_update_participant" ON public.message_threads;

  IF has_user_id_1 THEN
    CREATE POLICY "message_threads_select_participant" ON public.message_threads
      FOR SELECT TO authenticated
      USING (user_id_1 = auth.uid() OR user_id_2 = auth.uid());

    CREATE POLICY "message_threads_insert_participant" ON public.message_threads
      FOR INSERT TO authenticated
      WITH CHECK (user_id_1 = auth.uid() OR user_id_2 = auth.uid());

    -- USING gates which EXISTING rows can be touched at all — this is what
    -- stops the hijack: an attacker who isn't already user_id_1/user_id_2 on
    -- the target thread can never pass USING, so the UPDATE touches 0 rows
    -- regardless of what they try to set the columns to.
    CREATE POLICY "message_threads_update_participant" ON public.message_threads
      FOR UPDATE TO authenticated
      USING (user_id_1 = auth.uid() OR user_id_2 = auth.uid())
      WITH CHECK (user_id_1 = auth.uid() OR user_id_2 = auth.uid());

  ELSIF has_participant_1 THEN
    CREATE POLICY "message_threads_select_participant" ON public.message_threads
      FOR SELECT TO authenticated
      USING (participant_1 = auth.uid() OR participant_2 = auth.uid());

    CREATE POLICY "message_threads_insert_participant" ON public.message_threads
      FOR INSERT TO authenticated
      WITH CHECK (participant_1 = auth.uid() OR participant_2 = auth.uid());

    CREATE POLICY "message_threads_update_participant" ON public.message_threads
      FOR UPDATE TO authenticated
      USING (participant_1 = auth.uid() OR participant_2 = auth.uid())
      WITH CHECK (participant_1 = auth.uid() OR participant_2 = auth.uid());

  ELSE
    RAISE EXCEPTION 'message_threads is missing both user_id_1/user_id_2 and participant_1/participant_2 — cannot apply policy, check the actual schema.';
  END IF;
END $$;

-- Verify: rowsecurity should be true, and 3 policies listed.
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'message_threads';

SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'message_threads'
ORDER BY policyname;

-- Smoke test after running: open Messages in the app as a real user and
-- confirm existing threads still load and new DMs can still be started.
