-- ============================================================================
-- READ-ONLY AUDIT — run FIRST, before lock-down-user-profiles-rls-2026-10-15.sql
-- ----------------------------------------------------------------------------
-- No mutations. Paste into the Supabase SQL Editor and run each block.
-- SAVE THE OUTPUT of blocks 2 and 6 (export CSV): it is the exact record of the
-- current policies/grants, i.e. your rollback reference.
-- ============================================================================

-- 1. Is RLS on for the core tables?
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('user_profiles','opportunities','applications','mixes','messages',
                    'message_threads','communities','community_members','invite_codes')
ORDER BY 1;

-- 2. Every policy on those tables. RED FLAGS:
--    roles = {public} or includes anon, AND qual / with_check = 'true'
--    → that policy applies to the anonymous key with no restriction.
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('user_profiles','opportunities','applications','mixes','messages',
                    'message_threads','communities','community_members','invite_codes')
ORDER BY tablename, cmd, policyname;

-- 3. The "fake admin" pattern specifically: named Admin… but no admin check.
SELECT tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname ILIKE 'admin%'
  AND COALESCE(qual, 'true') = 'true'
  AND COALESCE(with_check, 'true') = 'true'
ORDER BY tablename, policyname;

-- 4. user_profiles.role: what does a NEW signup get? Several migrations add
--    `role TEXT DEFAULT 'admin'` — if column_default below is 'admin'::text,
--    every new member is an admin.
SELECT column_name, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'role';

SELECT COALESCE(role, '(null)') AS role, count(*) AS members
FROM public.user_profiles
GROUP BY 1
ORDER BY 2 DESC;

-- 5. Who is an admin today? Review this list by hand — only staff should be here.
SELECT id, email, dj_name, created_at
FROM public.user_profiles
WHERE role = 'admin'
ORDER BY created_at;

-- 6. Table privileges granted to the anonymous role.
SELECT table_name, string_agg(privilege_type, ', ' ORDER BY privilege_type) AS anon_privileges
FROM information_schema.role_table_grants
WHERE grantee = 'anon' AND table_schema = 'public'
  AND table_name IN ('user_profiles','opportunities','applications','mixes','messages',
                     'message_threads','communities','community_members','invite_codes')
GROUP BY table_name
ORDER BY table_name;

-- 7. Triggers on user_profiles (the migration adds one; confirm no clash).
SELECT tgname, pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'user_profiles' AND NOT t.tgisinternal
ORDER BY tgname;

-- 8. Helper functions the migration relies on.
SELECT p.proname, p.prosecdef AS security_definer, p.proconfig AS settings
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname IN ('is_admin_user','current_brand_account_id');
