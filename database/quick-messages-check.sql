-- Quick check: Do any messages exist?

-- Check 1: Count all messages
SELECT 
  'Message Count' as check_type,
  COUNT(*)::text as result
FROM messages;

-- Check 2: Show recent messages
SELECT 
  'Recent Messages' as check_type,
  id as result_1,
  LEFT(content, 30) as result_2,
  created_at as result_3
FROM messages
ORDER BY created_at DESC
LIMIT 5;

-- Check 3: Messages for your thread
SELECT 
  'Thread 198406bd' as check_type,
  id as result_1,
  content as result_2
FROM messages
WHERE thread_id = '198406bd-5e08-4e52-8f40-032843f15d45'
LIMIT 5;

-- Summary
SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM messages) > 0 THEN 
      '✅ Messages exist in database'
    ELSE 
      '❌ No messages in database'
  END as summary;

