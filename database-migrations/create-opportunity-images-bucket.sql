-- ============================================================================
-- Storage bucket for user-submitted opportunity images (Create tab → "Create
-- an opportunity"). Optional field — submitted opportunities render fine
-- without one (genre-based placeholder in transformOpportunityRow.js).
-- ----------------------------------------------------------------------------
-- Unlike avatars during onboarding, this upload always happens from an
-- already-authenticated session (Create is only reachable inside the main
-- app, after onboarding completes) — no anon-role path needed here.
--
-- Run in Supabase SQL Editor. Safe to run multiple times (idempotent).
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'opportunity-images',
  'opportunity-images',
  true,
  8388608,  -- 8 MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 8388608,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

DROP POLICY IF EXISTS "Authenticated users can upload opportunity images" ON storage.objects;
CREATE POLICY "Authenticated users can upload opportunity images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'opportunity-images');

DROP POLICY IF EXISTS "Authenticated users can update opportunity images" ON storage.objects;
CREATE POLICY "Authenticated users can update opportunity images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'opportunity-images');

DROP POLICY IF EXISTS "Public read access for opportunity images" ON storage.objects;
CREATE POLICY "Public read access for opportunity images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'opportunity-images');

DROP POLICY IF EXISTS "Authenticated users can delete opportunity images" ON storage.objects;
CREATE POLICY "Authenticated users can delete opportunity images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'opportunity-images');

-- Verify
SELECT id, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'opportunity-images';
