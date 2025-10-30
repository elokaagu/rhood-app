-- Cleanup script to merge duplicate message threads
-- This will keep the oldest thread for each user pair and move messages to it

-- Step 1: Find duplicate threads
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
SELECT 
  thread_id,
  COUNT(*) as message_count
FROM messages
WHERE thread_id IS NOT NULL
GROUP BY thread_id
ORDER BY message_count DESC;

-- Step 3: For each pair of duplicate threads, move messages to the oldest thread
-- Then delete the duplicate threads

-- First, create a temp table to identify duplicates
CREATE TEMP TABLE duplicate_threads AS
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

-- Show what will be merged
SELECT 
  user1,
  user2,
  thread_count,
  keep_thread_id as "Keep this thread",
  unnest(thread_ids[2:]) as "Delete these threads"
FROM duplicate_threads;

-- IMPORTANT: Review the above output before proceeding!

-- Step 4: Move messages from duplicate threads to the kept thread
UPDATE messages
SET thread_id = dt.keep_thread_id
FROM duplicate_threads dt
WHERE messages.thread_id = ANY(dt.thread_ids[2:])
AND messages.thread_id != dt.keep_thread_id;

-- Step 5: Delete duplicate threads
DELETE FROM message_threads
WHERE id IN (
  SELECT unnest(thread_ids[2:])
  FROM duplicate_threads
);

-- Step 6: Clean up temp table
DROP TABLE IF EXISTS duplicate_threads;

-- Step 7: Verify cleanup
SELECT 
  LEAST(user_id_1, user_id_2) as user1,
  GREATEST(user_id_1, user_id_2) as user2,
  COUNT(*) as thread_count
FROM message_threads
WHERE type = 'individual'
GROUP BY LEAST(user_id_1, user_id_2), GREATEST(user_id_1, user_id_2)
HAVING COUNT(*) > 1;

-- Success message
SELECT '✅ Duplicate threads cleaned up!' as status;

