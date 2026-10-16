-- ============================================================================
-- SECURITY: lock down user_profiles (and the "fake admin" policies elsewhere)
-- ----------------------------------------------------------------------------
-- Report: docs/SECURITY-user-profiles-rls-2026-10-15.md
--
-- RUN audit-rls-exposure-2026-10-15.sql FIRST and save its output (blocks 2 + 6)
-- — that is your record of the current policies if anything needs restoring.
--
-- What this does (single transaction — any error rolls the whole thing back):
--   0. Hardens is_admin_user() (pinned search_path; same behaviour).
--   1. Stops new members defaulting to role = 'admin'.
--   2. Resets user_profiles to a known, minimal policy set:
--        • anon: no access at all (policies + table grants)
--        • authenticated: read all profiles (unchanged — Discover, Connections,
--          Messages, signup duplicate-email check all depend on it; see Phase 2)
--        • write/delete: own row only (+ brand teammates on their shared brand
--          row, preserving Studio's brand_teammate_access behaviour)
--        • admins (is_admin_user()): everything
--   3. Adds a trigger so end users can't grant themselves role/credits/
--      verification/promoter status/gig counts, even on their own row.
--      Service role, the SQL editor and SECURITY DEFINER functions (credits,
--      boosts, referrals, membership RPCs) are unaffected.
--   4. Rewrites every policy named "Admin…" whose condition is literally `true`
--      (no admin check, often no TO role → applied to the anon key) on
--      opportunities / applications / mixes / messages / communities /
--      community_members into a real is_admin_user() check for authenticated.
--
-- What this does NOT do (deliberately — needs app + Studio code changes):
--   • Hide email/phone/credits/invite_code from OTHER signed-in members.
--     That's Phase 2 in the report.
--   • Demote existing non-staff admins. Review audit block 5, then run the
--     commented-out section at the bottom with your own allowlist.
--
-- Safe to re-run.
-- ============================================================================

BEGIN;

-- ── 0. Admin helper ────────────────────────────────────────────────────────
-- Same logic as Studio's version; adds a pinned search_path (SECURITY DEFINER
-- best practice). Runs as owner, so reading user_profiles inside a
-- user_profiles policy does not recurse.
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO anon, authenticated, service_role;

-- ── 1. No more admin-by-default ────────────────────────────────────────────
-- Several migrations added `role TEXT DEFAULT 'admin' CHECK (role IN ('admin','brand'))`.
-- DJs should have NULL; brands get 'brand' from Studio's server routes.
ALTER TABLE public.user_profiles ALTER COLUMN role DROP DEFAULT;

-- ── 2. user_profiles: known, minimal policy set ────────────────────────────
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_profiles'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.user_profiles', p.policyname);
  END LOOP;
END $$;

CREATE POLICY user_profiles_select_authenticated ON public.user_profiles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY user_profiles_insert_own ON public.user_profiles
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'current_brand_account_id'
  ) THEN
    -- Brand teammates may edit the shared brand profile (Studio brand_teammate_access).
    EXECUTE $p$
      CREATE POLICY user_profiles_update_own ON public.user_profiles
        FOR UPDATE TO authenticated
        USING ((SELECT auth.uid()) = id OR id = public.current_brand_account_id())
        WITH CHECK ((SELECT auth.uid()) = id OR id = public.current_brand_account_id())
    $p$;
  ELSE
    EXECUTE $p$
      CREATE POLICY user_profiles_update_own ON public.user_profiles
        FOR UPDATE TO authenticated
        USING ((SELECT auth.uid()) = id)
        WITH CHECK ((SELECT auth.uid()) = id)
    $p$;
  END IF;
END $$;

CREATE POLICY user_profiles_delete_own ON public.user_profiles
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = id);

CREATE POLICY user_profiles_admin_all ON public.user_profiles
  FOR ALL TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- Belt and braces: the anonymous key gets no table privileges at all.
-- (The app's login screen does an anonymous email-case lookup; it already
-- falls back to the typed email, and Supabase Auth is case-insensitive.)
REVOKE ALL ON public.user_profiles FROM anon;
DO $$
BEGIN
  IF to_regclass('public.user_profiles_public') IS NOT NULL THEN
    REVOKE ALL ON public.user_profiles_public FROM anon;
  END IF;
END $$;

-- ── 3. Privileged columns: end users can't self-promote ────────────────────
CREATE OR REPLACE FUNCTION public.guard_privileged_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Only direct end-user API writes are restricted. SECURITY DEFINER functions
  -- run as their owner (current_user ≠ anon/authenticated), so credit awards,
  -- boosts, referrals and membership RPCs keep working; so do the service
  -- role (Studio API routes) and the SQL editor.
  IF current_user NOT IN ('anon', 'authenticated')
     OR COALESCE(auth.role(), '') = 'service_role'
     OR public.is_admin_user() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.role                       := NULL;
    NEW.credits                    := 0;
    NEW.is_verified                := false;
    NEW.is_rhood_approved_promoter := false;
    NEW.gigs_completed             := 0;
    NEW.rating                     := 0;
  ELSE
    NEW.role                       := OLD.role;
    NEW.credits                    := OLD.credits;
    NEW.is_verified                := OLD.is_verified;
    NEW.is_rhood_approved_promoter := OLD.is_rhood_approved_promoter;
    NEW.gigs_completed             := OLD.gigs_completed;
    NEW.rating                     := OLD.rating;
    NEW.invite_code                := OLD.invite_code;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_privileged_profile_columns ON public.user_profiles;
CREATE TRIGGER guard_privileged_profile_columns
  BEFORE INSERT OR UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_privileged_profile_columns();

-- ── 4. "Fake admin" policies on other tables → real admin checks ───────────
-- Matches policies named Admin…/Admins… whose USING and WITH CHECK are both
-- literally `true`. Each is dropped and recreated with the same name and
-- command, scoped to authenticated + is_admin_user().
DO $$
DECLARE
  p record;
  using_clause text;
  check_clause text;
BEGIN
  FOR p IN
    SELECT tablename, policyname, cmd
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('opportunities', 'applications', 'mixes', 'messages',
                        'communities', 'community_members')
      AND policyname ILIKE 'admin%'
      AND COALESCE(qual, 'true') = 'true'
      AND COALESCE(with_check, 'true') = 'true'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename);

    using_clause := CASE WHEN p.cmd IN ('SELECT', 'UPDATE', 'DELETE', 'ALL')
                         THEN ' USING (public.is_admin_user())' ELSE '' END;
    check_clause := CASE WHEN p.cmd IN ('INSERT', 'UPDATE', 'ALL')
                         THEN ' WITH CHECK (public.is_admin_user())' ELSE '' END;

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR %s TO authenticated%s%s',
      p.policyname, p.tablename, p.cmd, using_clause, check_clause
    );
    RAISE NOTICE 'Fixed fake-admin policy % on %', p.policyname, p.tablename;
  END LOOP;
END $$;

COMMIT;

-- ── Verify (read-only) ─────────────────────────────────────────────────────
-- Expect exactly 5 policies on user_profiles, none for anon/public.
SELECT policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_profiles'
ORDER BY policyname;

-- Expect zero rows: no remaining "Admin…" policy without an admin check.
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public' AND policyname ILIKE 'admin%'
  AND COALESCE(qual, 'true') = 'true' AND COALESCE(with_check, 'true') = 'true';

-- Expect no rows for user_profiles.
SELECT table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'anon' AND table_schema = 'public' AND table_name = 'user_profiles';

-- ── OPTIONAL data fix — run only after reviewing audit block 5 ─────────────
-- Demote everyone who is 'admin' but not on your staff allowlist.
-- Edit the list, then uncomment and run on its own.
--
-- UPDATE public.user_profiles
-- SET role = NULL
-- WHERE role = 'admin'
--   AND lower(email) NOT IN (
--     'hello@rhood.io'
--     -- , 'someone@rhood.io'
--   );
