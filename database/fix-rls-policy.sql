-- Fix RLS Policy for Message Threads
-- Run this in your Supabase SQL Editor

-- Temporarily disable RLS for message_threads to test
ALTER TABLE message_threads DISABLE ROW LEVEL SECURITY;

-- Or alternatively, create a more permissive policy
-- DROP POLICY IF EXISTS "Users can create message threads" ON message_threads;
-- CREATE POLICY "Allow message thread creation"
--   ON message_threads FOR INSERT
--   WITH CHECK (true);

-- Re-enable RLS after testing (uncomment when ready)
-- ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
