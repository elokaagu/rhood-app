-- Comprehensive verification script for messaging system
-- Run this in Supabase SQL Editor to diagnose issues

-- 1. Check message_threads table structure
SELECT '=== MESSAGE_THREADS STRUCTURE ===' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'message_threads'
ORDER BY ordinal_position;

-- 2. Check messages table structure
SELECT '=== MESSAGES STRUCTURE ===' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'messages'
ORDER BY ordinal_position;

-- 3. Check RLS policies on messages
SELECT '=== MESSAGES RLS POLICIES ===' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'messages';

-- 4. Check RLS policies on message_threads
SELECT '=== MESSAGE_THREADS RLS POLICIES ===' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'message_threads';

-- 5. Check publication status
SELECT '=== PUBLICATION STATUS ===' as info;
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- 6. Test: List recent message_threads
SELECT '=== RECENT MESSAGE THREADS ===' as info;
SELECT id, type, user_id_1, user_id_2, created_at
FROM message_threads
ORDER BY created_at DESC
LIMIT 5;

-- 7. Test: List recent messages
SELECT '=== RECENT MESSAGES ===' as info;
SELECT id, thread_id, sender_id, content, created_at
FROM messages
ORDER BY created_at DESC
LIMIT 5;

-- Success message
SELECT '✅ Verification complete! Check the results above.' as status;

