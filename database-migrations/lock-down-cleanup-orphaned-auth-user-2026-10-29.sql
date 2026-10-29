-- cleanup_orphaned_auth_user(email) was executable with the public key (no
-- login): it deleted any auth user without a user_profiles row and revealed
-- whether an email had a full account. The app now handles "already
-- registered" by signing in with the typed password instead, so this is
-- service-role only. Older app builds that still call it just see
-- "already registered, please sign in".
REVOKE EXECUTE ON FUNCTION public.cleanup_orphaned_auth_user(text) FROM PUBLIC, anon, authenticated;
COMMENT ON FUNCTION public.cleanup_orphaned_auth_user(text) IS 'Service role only. Was callable with the public key and could delete any login without a profile; the app now signs in on "already registered" instead.';
