-- ============================================================================
-- HIGH: avatars + message-media storage buckets have no ownership scoping
-- ----------------------------------------------------------------------------
-- avatars: "Anyone can upload avatars" / "Anyone can update avatars" check
-- only bucket_id, nothing else — this was intentionally opened to the anon
-- role earlier this session so unconfirmed-email users can set a photo
-- during onboarding (real Supabase constraint: signUp() has no session until
-- email is confirmed, so those requests carry no JWT at all — there is no
-- auth.uid() to check for that path, by design of the product's onboarding
-- flow). But it also means ANY signed-in user can overwrite ANY OTHER
-- signed-in user's avatar path, since there was no auth.uid() check for the
-- authenticated role either. This migration adds that check for authenticated
-- callers (whose real edits all go through EditProfileScreen.js, which
-- already embeds the user's own id in the path) while leaving the anon path
-- as-is, since it has no identity to scope against.
--
-- message-media: "Allow authenticated uploads/downloads/deletes" checks only
-- bucket_id — any authenticated user can view OR DELETE any other user's
-- private chat media, not just their own. Storage automatically records the
-- uploader as `owner` on every object; this migration scopes UPDATE/DELETE
-- to owner = auth.uid(). SELECT is intentionally left as a known residual
-- gap — see the comment below explaining why a full fix needs a bigger
-- change than a policy tweak.
--
-- Run in Supabase SQL Editor. Safe to run multiple times (idempotent).
-- ============================================================================

-- ── avatars: authenticated writes must be to the caller's own path ─────────
-- EditProfileScreen.js writes profile_images/profile_<user.id>_<ts>.jpg, so
-- this can check the path actually contains the caller's own id.
DROP POLICY IF EXISTS "Anyone can upload avatars" ON storage.objects;
CREATE POLICY "avatars_insert_anon_or_own" ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (
      auth.role() = 'anon'  -- onboarding, pre-email-confirmation — no identity to scope
      OR name LIKE 'profile_images/profile_' || auth.uid()::text || '_%'
    )
  );

DROP POLICY IF EXISTS "Anyone can update avatars" ON storage.objects;
CREATE POLICY "avatars_update_anon_or_own" ON storage.objects
  FOR UPDATE
  TO anon, authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      auth.role() = 'anon'
      OR name LIKE 'profile_images/profile_' || auth.uid()::text || '_%'
    )
  );

-- ⚠️ KNOWN RESIDUAL GAP (partially mitigated at the application layer — see
-- below, not fully closed): the "own path" check above only applies to
-- authenticated (post-onboarding) uploads — anon uploads remain scoped only
-- by bucket_id, same as before. This is an inherent limit of Supabase's
-- anon-until-email-confirmed flow: those requests carry no JWT at all, so
-- there is no auth.uid() to check against. lib/onboardingHelpers.js's
-- filename was changed in this same batch from profile_<Date.now()>.jpg
-- (enumerable) to profile_<Crypto.randomUUID()>.jpg (unguessable), so an
-- anon attacker can no longer overwrite a specific in-progress signup's
-- photo by guessing nearby timestamps — but this is obscurity, not real
-- authorization, since anon still has no identity for RLS to check.

-- ── message-media: only the uploader can modify/delete their own object ────
DROP POLICY IF EXISTS "Allow users to delete own files from message-media" ON storage.objects;
CREATE POLICY "message_media_delete_own" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'message-media' AND owner = auth.uid());

DROP POLICY IF EXISTS "message_media_update_own" ON storage.objects;
CREATE POLICY "message_media_update_own" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'message-media' AND owner = auth.uid());

-- ⚠️ KNOWN RESIDUAL GAP: SELECT ("Allow authenticated downloads from
-- message-media") is intentionally left as bucket_id-only below, not
-- narrowed to conversation participants. A correct fix requires knowing
-- which message thread each object belongs to, but the upload paths
-- (lib/multimediaUploadService.js: images/…, videos/…, audio/…) don't encode
-- thread_id at all, and messages.media_url only stores a full URL, not a
-- back-reference usable in a fast RLS policy. Separately: the bucket's own
-- setup instructions (database/create-message-media-bucket.sql) recommend
-- "Public: Yes (recommended for direct file access)" — if that's how the
-- bucket is actually configured, Supabase serves objects from a public CDN
-- URL that bypasses storage.objects RLS entirely, making any SELECT policy
-- here moot regardless. Properly closing this needs a product decision
-- (private bucket + signed URLs, and a path scheme that embeds thread_id) —
-- flagging rather than attempting a fragile partial fix blind.
DROP POLICY IF EXISTS "Allow authenticated downloads from message-media" ON storage.objects;
CREATE POLICY "message_media_select_authenticated" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'message-media');

-- Verify
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'objects'
  AND (policyname LIKE '%avatar%' OR policyname LIKE '%message_media%')
ORDER BY policyname;
