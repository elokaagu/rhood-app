-- Create message-media storage bucket for multimedia sharing
-- This ensures the bucket exists for file uploads in messages

-- Note: Storage buckets are typically created through the Supabase dashboard
-- or via the Supabase CLI, not through SQL migrations.
-- This file serves as documentation and a reminder.

-- To create the bucket manually:
-- 1. Go to Supabase Dashboard > Storage
-- 2. Create new bucket named "message-media"
-- 3. Set it as public if you want direct access to files
-- 4. Configure appropriate RLS policies

-- Example RLS policies for message-media bucket:
-- (These would be applied through the Supabase dashboard)

-- Policy: Allow authenticated users to upload files
-- CREATE POLICY "Allow authenticated uploads" ON storage.objects
-- FOR INSERT TO authenticated
-- WITH CHECK (bucket_id = 'message-media');

-- Policy: Allow authenticated users to view files
-- CREATE POLICY "Allow authenticated downloads" ON storage.objects
-- FOR SELECT TO authenticated
-- USING (bucket_id = 'message-media');

-- Policy: Allow users to delete their own files
-- CREATE POLICY "Allow users to delete own files" ON storage.objects
-- FOR DELETE TO authenticated
-- USING (bucket_id = 'message-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- The bucket structure will be:
-- message-media/
--   ├── images/
--   ├── videos/
--   ├── documents/
--   ├── audio/
--   └── thumbnails/
