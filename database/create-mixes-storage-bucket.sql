-- Create storage bucket for mixes
-- Note: This needs to be run in Supabase Dashboard > Storage

-- Instructions for Supabase Dashboard:
-- 1. Go to Storage in Supabase Dashboard
-- 2. Click "New Bucket"
-- 3. Name: "mixes"
-- 4. Public bucket: Yes (so files can be accessed via URL)
-- 5. File size limit: 500 MB (or adjust as needed)
-- 6. Allowed MIME types: audio/* (or specific: audio/mpeg, audio/mp3, audio/wav, audio/aac)

-- After creating the bucket, run these policies:

-- Policy: Allow authenticated users to upload mixes
CREATE POLICY "Authenticated users can upload mixes"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'mixes' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Anyone can view public mixes
CREATE POLICY "Anyone can view mixes"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'mixes');

-- Policy: Users can update their own mixes
CREATE POLICY "Users can update their own mixes"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'mixes' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Users can delete their own mixes
CREATE POLICY "Users can delete their own mixes"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'mixes' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
