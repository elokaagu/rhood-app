-- ⚠️ WARNING: This script will DELETE ALL MESSAGES from the system
-- This is IRREVERSIBLE. Make sure you have backups if needed.
-- Run this in Supabase SQL Editor

-- Step 1: Show current message count
SELECT '=== CURRENT MESSAGE COUNT ===' as status;
SELECT COUNT(*) as total_messages FROM messages;
SELECT COUNT(*) as total_group_messages FROM community_posts;
SELECT COUNT(*) as total_legacy_group_messages FROM group_messages;

-- Step 2: Show message distribution by thread
SELECT '=== MESSAGE DISTRIBUTION ===' as status;
SELECT 
  thread_id,
  COUNT(*) as message_count
FROM messages
GROUP BY thread_id
ORDER BY message_count DESC
LIMIT 20;

-- Step 3: DELETE ALL MESSAGES
-- ⚠️ THIS IS THE DESTRUCTIVE OPERATION
SELECT '=== DELETING ALL MESSAGES ===' as status;

DELETE FROM messages;
DELETE FROM community_posts;
DELETE FROM group_messages;

-- Step 4: Optionally delete message threads (uncomment if you want)
-- DELETE FROM message_threads WHERE type = 'individual';

-- Step 5: Verify deletion
SELECT '=== VERIFICATION ===' as status;
SELECT COUNT(*) as remaining_messages FROM messages;
SELECT COUNT(*) as remaining_group_messages FROM community_posts;
SELECT COUNT(*) as remaining_legacy_group_messages FROM group_messages;

-- Success message
SELECT '✅ All messages have been deleted!' as status;
SELECT 'ℹ️ Message threads are still in the database (uncomment deletion above if you want to remove them too)' as note;

