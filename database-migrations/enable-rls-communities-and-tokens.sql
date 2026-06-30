-- ============================================================================
-- Fix CRITICAL Supabase security advisor findings (RLS disabled in public)
-- ----------------------------------------------------------------------------
-- communities, community_posts, private_chat_members already have policies
-- defined (advisor: "Policy Exists RLS Disabled") — they were just never
-- switched on, so the policies have had no effect and the tables have been
-- fully open to anyone with the anon/authenticated key.
--
-- user_expo_tokens has no policies at all (advisor: "RLS Disabled in Public").
-- It's read/written directly by the client (lib/notificationService.js), so
-- without RLS any signed-in user can read, overwrite, or delete every other
-- user's push tokens.
--
-- Run in Supabase SQL Editor. Safe to run multiple times (idempotent).
-- ============================================================================

ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_chat_members ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_expo_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_expo_tokens_select_own" ON public.user_expo_tokens;
DROP POLICY IF EXISTS "user_expo_tokens_insert_own" ON public.user_expo_tokens;
DROP POLICY IF EXISTS "user_expo_tokens_update_own" ON public.user_expo_tokens;
DROP POLICY IF EXISTS "user_expo_tokens_delete_own" ON public.user_expo_tokens;

CREATE POLICY "user_expo_tokens_select_own" ON public.user_expo_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_expo_tokens_insert_own" ON public.user_expo_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_expo_tokens_update_own" ON public.user_expo_tokens
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_expo_tokens_delete_own" ON public.user_expo_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- Verify: should show rowsecurity = true for all four tables.
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('communities', 'community_posts', 'private_chat_members', 'user_expo_tokens')
ORDER BY tablename;

-- Verify: lists active policies (should be non-empty for all four).
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('communities', 'community_posts', 'private_chat_members', 'user_expo_tokens')
ORDER BY tablename, policyname;
