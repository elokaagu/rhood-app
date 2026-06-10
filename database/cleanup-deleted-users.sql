-- ============================================================
-- cleanup-deleted-users.sql
--
-- Problem: deleting a row from user_profiles (e.g. via Table Editor)
--          leaves the auth.users record intact.  The same email can
--          never re-signup because Supabase Auth still thinks it's
--          registered.
--
-- Fix 1 – trigger: auto-delete the auth user whenever a profile row
--          is deleted, so re-signup always works out of the box.
--
-- Fix 2 – RPC: cleanup_orphaned_auth_user(p_email)
--          Called by the app when signUp returns "already registered"
--          but there is no matching profile row.  If the auth user is
--          genuinely orphaned it is deleted and true is returned so
--          the client can retry immediately.  If an active profile
--          exists (i.e. the email is legitimately taken) false is
--          returned and the app shows the normal "please sign in"
--          error.
-- ============================================================

-- ── Trigger function ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cleanup_auth_on_profile_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Delete the corresponding auth user so the email is freed for re-signup
  DELETE FROM auth.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$;

-- Drop and recreate so this migration is idempotent
DROP TRIGGER IF EXISTS on_user_profile_deleted ON public.user_profiles;

CREATE TRIGGER on_user_profile_deleted
  AFTER DELETE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_auth_on_profile_delete();

-- ── App-callable RPC ─────────────────────────────────────────
-- Returns TRUE  → orphaned auth user was cleaned up; client should retry signUp
-- Returns FALSE → active profile exists; email is legitimately taken
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_auth_user(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id     uuid;
  v_has_profile boolean;
BEGIN
  -- Locate the auth user by email (case-insensitive)
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(p_email)
  LIMIT 1;

  -- No auth user → email is completely free, re-signup will work
  IF v_user_id IS NULL THEN
    RETURN true;
  END IF;

  -- Check whether an active profile row exists
  SELECT EXISTS(
    SELECT 1 FROM public.user_profiles WHERE id = v_user_id
  ) INTO v_has_profile;

  IF NOT v_has_profile THEN
    -- Orphaned auth record (profile was deleted without cleaning up auth)
    DELETE FROM auth.users WHERE id = v_user_id;
    RETURN true;
  END IF;

  -- Profile exists → legitimate "already registered" case
  RETURN false;
END;
$$;

-- Allow the app to call this during signup (caller is anon before auth)
GRANT EXECUTE ON FUNCTION public.cleanup_orphaned_auth_user(text) TO anon, authenticated;
