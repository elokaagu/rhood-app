-- Test RLS access for messages
-- This script helps diagnose why messages aren't loading

-- Step 1: Check if messages exist in the database
SELECT '=== MESSAGES IN DATABASE ===' as status;
SELECT 
  id,
  thread_id,
  sender_id,
  content,
  created_at
FROM messages
ORDER BY created_at DESC
LIMIT 10;

-- Step 2: Check messages for specific thread (replace with your thread ID)
SELECT '=== MESSAGES FOR THREAD ===' as status;
SELECT 
  id,
  thread_id,
  sender_id,
  content,
  created_at
FROM messages
WHERE thread_id = '198406bd-5e08-4e52-8f40-032843f15d45'
ORDER BY created_at DESC;

-- Step 3: Check RLS policies on messages
SELECT '=== RLS POLICIES ON MESSAGES ===' as status;
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'messages'
ORDER BY policyname;

-- Step 4: Check if RLS is enabled
SELECT '=== RLS STATUS ===' as status;
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'messages';

-- Step 5: Test if authenticated user can see messages
-- This will show what the current user (if authenticated) can see
SELECT '=== TESTING AS AUTHENTICATED USER ===' as status;
SELECT 
  COUNT(*) as message_count,
  thread_id
FROM messages
GROUP BY thread_id
ORDER BY message_count DESC;

-- Step 6: Check message_threads for the thread
SELECT '=== THREAD INFO ===' as status;
SELECT 
  id,
  user_id_1,
  user_id_2,
  created_at
FROM message_threads
WHERE id = '198406bd-5e08-4e52-8f40-032843f15d45';

-- Success message
SELECT '✅ RLS test complete! Review the results above.' as status;
SELECT '⚠️ If messages exist but SELECT returns empty, RLS policy is blocking access!' as note;

