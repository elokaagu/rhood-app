-- Complete fix for duplicate message threads
-- This will merge all duplicate threads and fix the messages visibility issue

-- Step 1: Show current duplicate threads
SELECT '=== STEP 1: FINDING DUPLICATE THREADS ===' as status;
SELECT 
  LEAST(user_id_1, user_id_2) as user1,
  GREATEST(user_id_1, user_id_2) as user2,
  COUNT(*) as thread_count,
  array_agg(id ORDER BY created_at) as thread_ids
FROM message_threads
WHERE type = 'individual'
GROUP BY LEAST(user_id_1, user_id_2), GREATEST(user_id_1, user_id_2)
HAVING COUNT(*) > 1;

-- Step 2: Show which threads have messages
SELECT '=== STEP 2: MESSAGE DISTRIBUTION ===' as status;
SELECT 
  thread_id,
  COUNT(*) as message_count
FROM messages
WHERE thread_id IS NOT NULL
GROUP BY thread_id
ORDER BY message_count DESC;

-- Step 3: Create temp table for duplicates
CREATE TEMP TABLE IF NOT EXISTS duplicate_threads AS
SELECT 
  LEAST(user_id_1, user_id_2) as user1,
  GREATEST(user_id_1, user_id_2) as user2,
  COUNT(*) as thread_count,
  array_agg(id ORDER BY created_at) as thread_ids,
  (array_agg(id ORDER BY created_at))[1] as keep_thread_id
FROM message_threads
WHERE type = 'individual'
GROUP BY LEAST(user_id_1, user_id_2), GREATEST(user_id_1, user_id_2)
HAVING COUNT(*) > 1;

-- Step 4: Show what will be merged
SELECT '=== STEP 3: WHAT WILL BE MERGED ===' as status;
SELECT 
  user1,
  user2,
  thread_count,
  keep_thread_id as "Keep this thread",
  unnest(thread_ids[2:]) as "Delete these threads"
FROM duplicate_threads;

-- Step 5: Move all messages to the oldest thread
SELECT '=== STEP 4: MOVING MESSAGES ===' as status;
UPDATE messages
SET thread_id = dt.keep_thread_id
FROM duplicate_threads dt
WHERE messages.thread_id = ANY(dt.thread_ids[2:])
AND messages.thread_id != dt.keep_thread_id;

-- Show how many messages were moved
SELECT 
  thread_id,
  COUNT(*) as message_count
FROM messages
GROUP BY thread_id
ORDER BY message_count DESC;

-- Step 6: Delete duplicate threads
SELECT '=== STEP 5: DELETING DUPLICATE THREADS ===' as status;
DELETE FROM message_threads
WHERE id IN (
  SELECT unnest(thread_ids[2:])
  FROM duplicate_threads
);

-- Step 7: Clean up temp table
DROP TABLE IF EXISTS duplicate_threads;

-- Step 8: Verify no duplicates remain
SELECT '=== STEP 6: VERIFICATION ===' as status;
SELECT 
  LEAST(user_id_1, user_id_2) as user1,
  GREATEST(user_id_1, user_id_2) as user2,
  COUNT(*) as thread_count
FROM message_threads
WHERE type = 'individual'
GROUP BY LEAST(user_id_1, user_id_2), GREATEST(user_id_1, user_id_2)
HAVING COUNT(*) > 1;

-- Final message distribution
SELECT '=== FINAL MESSAGE DISTRIBUTION ===' as status;
SELECT 
  thread_id,
  COUNT(*) as message_count
FROM messages
GROUP BY thread_id
ORDER BY message_count DESC
LIMIT 20;

-- Success message
SELECT '✅ Duplicate threads cleaned up successfully!' as status;
SELECT '✅ All messages have been moved to the oldest thread for each user pair!' as message;
SELECT '🔄 Please reload your app to see the changes' as next_step;

