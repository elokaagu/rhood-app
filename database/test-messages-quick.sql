-- Quick test script to verify messages are being stored correctly
-- Run this after sending messages in the app

-- Show recent messages
SELECT 
  m.id,
  m.created_at,
  m.content,
  m.message_type,
  m.thread_id,
  COALESCE(s.dj_name, s.full_name, 'Unknown') AS sender_name,
  m.sender_id
FROM messages m
LEFT JOIN user_profiles s ON s.id = m.sender_id
ORDER BY m.created_at DESC
LIMIT 10;

-- Count messages per thread
SELECT 
  thread_id,
  COUNT(*) as message_count,
  MIN(created_at) as first_message,
  MAX(created_at) as last_message
FROM messages
WHERE thread_id IS NOT NULL
GROUP BY thread_id
ORDER BY message_count DESC;

-- Show all threads with their participants
SELECT 
  mt.id as thread_id,
  mt.user_id_1,
  u1.dj_name as user1_name,
  mt.user_id_2,
  u2.dj_name as user2_name,
  mt.created_at
FROM message_threads mt
LEFT JOIN user_profiles u1 ON u1.id = mt.user_id_1
LEFT JOIN user_profiles u2 ON u2.id = mt.user_id_2
WHERE mt.type = 'individual'
ORDER BY mt.created_at DESC
LIMIT 10;

