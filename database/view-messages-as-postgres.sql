-- This query runs as 'postgres' user and BYPASSES RLS
-- Use this to verify messages actually exist in the database

-- Show all messages
SELECT '=== ALL MESSAGES (bypassing RLS) ===' as info;
SELECT 
  id,
  thread_id,
  sender_id,
  LEFT(content, 50) as content_preview,
  created_at
FROM messages
ORDER BY created_at DESC
LIMIT 20;

-- Group by thread
SELECT '=== MESSAGES BY THREAD ===' as info;
SELECT 
  thread_id,
  COUNT(*) as message_count,
  string_agg(DISTINCT sender_id::text, ', ') as senders
FROM messages
GROUP BY thread_id
ORDER BY message_count DESC;

-- Check specific thread (the one you're testing with)
SELECT '=== MESSAGES FOR THREAD 198406bd ===' as info;
SELECT 
  id,
  thread_id,
  sender_id,
  content,
  created_at
FROM messages
WHERE thread_id = '198406bd-5e08-4e52-8f40-032843f15d45'
ORDER BY created_at DESC;

-- Success
SELECT '✅ These messages exist but app can''t see them if RLS is blocking SELECT!' as note;

