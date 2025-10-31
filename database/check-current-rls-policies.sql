-- Check current RLS policies on messages table
-- This will show exactly what policies are currently active

-- Step 1: Check all policies on messages table
SELECT '=== ALL RLS POLICIES ON MESSAGES ===' as status;
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'messages'
ORDER BY policyname;

-- Step 2: Check if RLS is enabled
SELECT '=== RLS ENABLED? ===' as status;
SELECT 
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'messages';

-- Step 3: Show messages table structure
SELECT '=== MESSAGES TABLE STRUCTURE ===' as status;
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'messages'
ORDER BY ordinal_position;

-- Step 4: Check message_threads structure
SELECT '=== MESSAGE_THREADS TABLE STRUCTURE ===' as status;
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'message_threads'
ORDER BY ordinal_position;

-- Step 5: Count messages by thread
SELECT '=== MESSAGE COUNT BY THREAD ===' as status;
SELECT 
  thread_id,
  COUNT(*) as message_count,
  MIN(created_at) as first_message,
  MAX(created_at) as last_message
FROM messages
GROUP BY thread_id
ORDER BY message_count DESC
LIMIT 10;

-- Step 6: Check recent messages (without RLS, as postgres user)
SELECT '=== RECENT MESSAGES (RAW) ===' as status;
SELECT 
  id,
  thread_id,
  sender_id,
  LEFT(content, 50) as content_preview,
  created_at
FROM messages
ORDER BY created_at DESC
LIMIT 10;

-- Step 7: Test auth.uid() function
SELECT '=== TESTING AUTH CONTEXT ===' as status;
SELECT 
  CURRENT_USER as current_role,
  current_user as current_user_name;

-- This will show if we're running as postgres or service_role
SELECT 
  CASE 
    WHEN current_user = 'postgres' THEN 'Running as postgres (bypasses RLS)'
    WHEN current_user = 'service_role' THEN 'Running as service_role (bypasses RLS)'
    ELSE 'Running as regular user (RLS applies)'
  END as auth_context;

-- Success message
SELECT '✅ Policy check complete!' as status;
SELECT '📋 Review the policies above - note the cmd column (SELECT, INSERT, etc.)' as note;

