-- Test Thread ID Consistency
-- Run this in your Supabase SQL Editor to check for thread ID mismatches

-- 1. Check all message threads for the specific users
SELECT 
  id,
  type,
  user_id_1,
  user_id_2,
  created_at
FROM message_threads 
WHERE (user_id_1 = '64ee29a2-dfd1-4c0a-824a-81b15398ff32' AND user_id_2 = 'dfee6a12-a337-46f9-8bf0-307b4262f60f')
   OR (user_id_1 = 'dfee6a12-a337-46f9-8bf0-307b4262f60f' AND user_id_2 = '64ee29a2-dfd1-4c0a-824a-81b15398ff32')
ORDER BY created_at DESC;

-- 2. Check all messages for these users
SELECT 
  id,
  thread_id,
  sender_id,
  content,
  created_at
FROM messages 
WHERE sender_id IN ('64ee29a2-dfd1-4c0a-824a-81b15398ff32', 'dfee6a12-a337-46f9-8bf0-307b4262f60f')
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check if messages exist in the threads
-- Replace THREAD_ID_1 and THREAD_ID_2 with actual thread IDs from step 1
-- SELECT * FROM messages WHERE thread_id = 'THREAD_ID_1';
-- SELECT * FROM messages WHERE thread_id = 'THREAD_ID_2';

-- 4. Check for orphaned messages (messages without valid threads)
SELECT 
  m.id,
  m.thread_id,
  m.sender_id,
  m.content,
  m.created_at
FROM messages m
LEFT JOIN message_threads mt ON m.thread_id = mt.id
WHERE m.sender_id IN ('64ee29a2-dfd1-4c0a-824a-81b15398ff32', 'dfee6a12-a337-46f9-8bf0-307b4262f60f')
  AND mt.id IS NULL
ORDER BY m.created_at DESC;
