-- Simple storage fix - just make bucket public and ensure basic access
-- Run this instead of the complex policy script

-- 1. Make mixes bucket public
UPDATE storage.buckets 
SET public = true 
WHERE name = 'mixes';

-- 2. Create a simple public read policy for mixes (if not exists)
CREATE OR REPLACE FUNCTION ensure_mixes_public_policy()
RETURNS void AS $$
BEGIN
  -- Check if policy already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Mixes public access'
  ) THEN
    CREATE POLICY "Mixes public access" 
    ON storage.objects FOR SELECT 
    TO public
    USING (bucket_id = 'mixes');
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Execute the function
SELECT ensure_mixes_public_policy();

-- Clean up
DROP FUNCTION ensure_mixes_public_policy();

-- 3. Ensure authenticated users can upload (basic policy)
CREATE OR REPLACE FUNCTION ensure_mixes_upload_policy()
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Mixes authenticated upload'
  ) THEN
    CREATE POLICY "Mixes authenticated upload" 
    ON storage.objects FOR INSERT 
    TO authenticated
    WITH CHECK (bucket_id = 'mixes');
  END IF;
END;
$$ LANGUAGE plpgsql;

SELECT ensure_mixes_upload_policy();
DROP FUNCTION ensure_mixes_upload_policy();

-- 4. Verify bucket status
SELECT 
  name,
  public,
  'Bucket public status' as status
FROM storage.buckets 
WHERE name = 'mixes';

-- 5. Show current policies
SELECT 
  policyname,
  cmd,
  'Current policies on storage.objects' as status
FROM pg_policies 
WHERE tablename = 'objects' 
ORDER BY policyname;

SELECT 'Storage configuration completed - bucket should now be public' as result;
