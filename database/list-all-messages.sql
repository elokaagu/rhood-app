-- List all messages in the database with full details

-- All messages with full details
SELECT 
  m.id,
  m.thread_id,
  m.sender_id,
  m.content,
  m.message_type,
  m.created_at,
  up.dj_name as sender_name
FROM messages m
LEFT JOIN user_profiles up ON m.sender_id = up.id
ORDER BY m.created_at DESC;

-- Count by thread
SELECT 
  'Messages by Thread' as info,
  thread_id,
  COUNT(*) as message_count
FROM messages
GROUP BY thread_id
ORDER BY message_count DESC;

-- Recent messages preview
SELECT 
  'Recent Messages' as info,
  id,
  LEFT(content, 50) as preview,
  created_at
FROM messages
ORDER BY created_at DESC
LIMIT 10;

