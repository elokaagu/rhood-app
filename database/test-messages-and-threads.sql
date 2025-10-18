-- Test the fixed get_user_connections function
-- Run this in your Supabase SQL Editor

-- Test the function with the user ID from the logs
SELECT * FROM get_user_connections('64ee29a2-dfd1-4c0a-824a-81b15398ff32'::UUID);

-- Also check the messages table to see if messages exist
SELECT 
  id,
  thread_id,
  sender_id,
  content,
  created_at
FROM messages 
WHERE sender_id = '64ee29a2-dfd1-4c0a-824a-81b15398ff32'
ORDER BY created_at DESC
LIMIT 5;

-- Check message_threads table
SELECT 
  id,
  type,
  user_id_1,
  user_id_2,
  created_at
FROM message_threads 
WHERE user_id_1 = '64ee29a2-dfd1-4c0a-824a-81b15398ff32' 
   OR user_id_2 = '64ee29a2-dfd1-4c0a-824a-81b15398ff32'
ORDER BY created_at DESC;
