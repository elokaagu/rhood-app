-- Test Message Flow Between Users
-- Run this in your Supabase SQL Editor to verify messages are being stored and retrieved correctly

-- 1. Check if messages are being stored in the database
SELECT 
  id,
  thread_id,
  sender_id,
  content,
  message_type,
  created_at
FROM messages 
WHERE sender_id IN ('64ee29a2-dfd1-4c0a-824a-81b15398ff32', 'dfee6a12-a337-46f9-8bf0-307b4262f60f')
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check message_threads table to see if threads exist
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

-- 3. Test the get_user_connections function
SELECT * FROM get_user_connections('64ee29a2-dfd1-4c0a-824a-81b15398ff32'::UUID);

-- 4. Check if there are any messages for the specific thread
-- Replace 'THREAD_ID_HERE' with the actual thread ID from step 2
-- SELECT * FROM messages WHERE thread_id = 'THREAD_ID_HERE' ORDER BY created_at DESC;

-- 5. Verify connections table
SELECT 
  id,
  user_id_1,
  user_id_2,
  status,
  created_at,
  accepted_at
FROM connections 
WHERE (user_id_1 = '64ee29a2-dfd1-4c0a-824a-81b15398ff32' AND user_id_2 = 'dfee6a12-a337-46f9-8bf0-307b4262f60f')
   OR (user_id_1 = 'dfee6a12-a337-46f9-8bf0-307b4262f60f' AND user_id_2 = '64ee29a2-dfd1-4c0a-824a-81b15398ff32')
ORDER BY created_at DESC;
