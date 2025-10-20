-- Fix RLS Policies for Message Functionality
-- Run this in your Supabase SQL Editor

-- Temporarily disable RLS for message-related tables to allow testing
ALTER TABLE message_threads DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts DISABLE ROW LEVEL SECURITY;

-- Or create more permissive policies
-- DROP POLICY IF EXISTS "Users can create message threads" ON message_threads;
-- CREATE POLICY "Allow message thread creation"
--   ON message_threads FOR INSERT
--   WITH CHECK (true);

-- DROP POLICY IF EXISTS "Users can create messages" ON messages;
-- CREATE POLICY "Allow message creation"
--   ON messages FOR INSERT
--   WITH CHECK (true);

-- DROP POLICY IF EXISTS "Users can create community posts" ON community_posts;
-- CREATE POLICY "Allow community post creation"
--   ON community_posts FOR INSERT
--   WITH CHECK (true);

-- Re-enable RLS after testing (uncomment when ready)
-- ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
