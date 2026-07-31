-- ============================================================================
-- CRITICAL: Enable RLS on public.user_profiles
-- ----------------------------------------------------------------------------
-- Found by a full security sweep: user_profiles — the core identity table,
-- holding email, credits, is_verified, is_rhood_approved_promoter — has NO
-- row level security at all. With the app's anon key (which ships inside the
-- mobile app and is public), anyone can currently:
--   PATCH /rest/v1/user_profiles?id=eq.<victim>  {"credits": 999999}
--   PATCH /rest/v1/user_profiles?id=eq.<victim>  {"is_verified": true}
--   GET   /rest/v1/user_profiles?select=email,full_name   (dumps every user)
-- with no login required at all.
--
-- This migration:
--   1. Blocks the anon role entirely (currently has full read/write).
--   2. Locks INSERT/UPDATE/DELETE to the row's own owner (auth.uid() = id) —
--      this is the fix for the credit-theft / fake-verification / unauth
--      defacement exploits above.
--   3. Leaves SELECT open to any authenticated user, unrestricted by row.
--
-- ⚠️ KNOWN RESIDUAL GAP (not fixed by this migration — read below):
-- SELECT stays broad-authenticated rather than owner-only because dozens of
-- legitimate features (Discover, Opportunities, Connections, Messages) read
-- OTHER users' dj_name/profile_image_url/bio/genres by design — RLS is row-
-- level, not column-level, so there is no way to "allow reading dj_name but
-- not email" with a policy alone. This means another authenticated user can
-- still read email/credits/phone via a crafted direct query even after this
-- migration, exactly like the app's own show_email/show_phone flags are only
-- enforced in client rendering code today, not at the database layer.
-- Properly closing that requires a public-safe VIEW (excluding email/credits/
-- phone) that every "view ANOTHER user's profile" call site would need to
-- switch to — a larger, separate follow-up, not something to do blind across
-- every call site in one pass. This migration closes the WRITE-side exploits
-- (theft, fake verification, defacement) and the unauthenticated (anon) read,
-- which are the critical/high severity ones; the authenticated-to-
-- authenticated read-of-sensitive-columns risk is lower severity and remains
-- open until that follow-up view exists.
--
-- Run in Supabase SQL Editor. Safe to run multiple times (idempotent).
-- ============================================================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_profiles_select_authenticated" ON public.user_profiles;
CREATE POLICY "user_profiles_select_authenticated" ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "user_profiles_insert_own" ON public.user_profiles;
CREATE POLICY "user_profiles_insert_own" ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "user_profiles_update_own" ON public.user_profiles;
CREATE POLICY "user_profiles_update_own" ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "user_profiles_delete_own" ON public.user_profiles;
CREATE POLICY "user_profiles_delete_own" ON public.user_profiles
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = id);

-- Verify: rowsecurity should be true, and 4 policies should be listed.
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'user_profiles';

SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_profiles'
ORDER BY policyname;

-- Smoke test after running — signup/onboarding/profile-editing must still
-- work: create a test account through the app and confirm the profile saves
-- and loads normally, and that opening another user's profile still shows
-- their dj_name/photo/bio (expected — see residual-gap note above).
