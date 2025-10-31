-- Complete diagnose and fix for RLS policies on messages table
-- This will check current policies, drop old ones, and create correct new ones

-- ==========================================
-- PART 1: DIAGNOSIS
-- ==========================================

SELECT '=== DIAGNOSTIC: CURRENT RLS POLICIES ===' as status;

-- Show all current policies
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN LEFT(qual, 100)
    ELSE 'NULL'
  END as qual_snippet,
  CASE 
    WHEN with_check IS NOT NULL THEN LEFT(with_check, 100)
    ELSE 'NULL'
  END as with_check_snippet
FROM pg_policies
WHERE tablename = 'messages';

-- Check RLS enabled status
SELECT 
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'messages';

-- Count messages to verify they exist
SELECT 
  'Message Count' as info,
  COUNT(*) as count
FROM messages;

-- ==========================================
-- PART 2: FIX
-- ==========================================

SELECT '=== FIXING RLS POLICIES ===' as status;

-- Drop ALL existing policies on messages
DROP POLICY IF EXISTS "Users can send messages in their threads" ON messages;
DROP POLICY IF EXISTS "Users can insert messages" ON messages;
DROP POLICY IF EXISTS "Users can view messages in their threads" ON messages;
DROP POLICY IF EXISTS "Users can view thread messages" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;
DROP POLICY IF EXISTS "users can view their own messages" ON messages;
DROP POLICY IF EXISTS "users can insert their own messages" ON messages;

-- Check schema and create correct policies
DO $$ 
DECLARE
  has_user_id_1 BOOLEAN;
  has_participant_1 BOOLEAN;
BEGIN
  -- Check if user_id_1 exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'message_threads' AND column_name = 'user_id_1'
  ) INTO has_user_id_1;
  
  -- Check if participant_1 exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'message_threads' AND column_name = 'participant_1'
  ) INTO has_participant_1;
  
  -- Log which schema we're using
  IF has_user_id_1 THEN
    RAISE NOTICE 'Using user_id_1/user_id_2 schema';
  ELSIF has_participant_1 THEN
    RAISE NOTICE 'Using participant_1/participant_2 schema';
  ELSE
    RAISE EXCEPTION 'message_threads table missing required columns!';
  END IF;
  
  -- Create RLS policies based on which columns exist
  IF has_user_id_1 THEN
    -- Use user_id_1 and user_id_2 (current production schema)
    CREATE POLICY "Users can view thread messages" ON messages
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM message_threads mt
          WHERE mt.id = messages.thread_id
          AND (mt.user_id_1 = auth.uid() OR mt.user_id_2 = auth.uid())
        )
      );
    
    CREATE POLICY "Users can insert thread messages" ON messages
      FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
          SELECT 1 FROM message_threads mt
          WHERE mt.id = messages.thread_id
          AND (mt.user_id_1 = auth.uid() OR mt.user_id_2 = auth.uid())
        )
      );
    
    CREATE POLICY "Users can update their own messages" ON messages
      FOR UPDATE USING (auth.uid() = sender_id);
    
    CREATE POLICY "Users can delete their own messages" ON messages
      FOR DELETE USING (auth.uid() = sender_id);
      
  ELSIF has_participant_1 THEN
    -- Use participant_1 and participant_2 (legacy schema)
    CREATE POLICY "Users can view thread messages" ON messages
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM message_threads mt
          WHERE mt.id = messages.thread_id
          AND (mt.participant_1 = auth.uid() OR mt.participant_2 = auth.uid())
        )
      );
    
    CREATE POLICY "Users can insert thread messages" ON messages
      FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
          SELECT 1 FROM message_threads mt
          WHERE mt.id = messages.thread_id
          AND (mt.participant_1 = auth.uid() OR mt.participant_2 = auth.uid())
        )
      );
    
    CREATE POLICY "Users can update their own messages" ON messages
      FOR UPDATE USING (auth.uid() = sender_id);
    
    CREATE POLICY "Users can delete their own messages" ON messages
      FOR DELETE USING (auth.uid() = sender_id);
  END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON messages TO authenticated;

-- Enable Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- ==========================================
-- PART 3: VERIFICATION
-- ==========================================

SELECT '=== VERIFICATION: NEW RLS POLICIES ===' as status;

-- Show all policies after fix
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN LEFT(qual, 100)
    ELSE 'NULL'
  END as qual_snippet,
  CASE 
    WHEN with_check IS NOT NULL THEN LEFT(with_check, 100)
    ELSE 'NULL'
  END as with_check_snippet
FROM pg_policies
WHERE tablename = 'messages'
ORDER BY policyname;

-- Success message
SELECT '✅ RLS policies have been fixed!' as status;
SELECT '🔄 Please reload your app to see messages!' as next_step;

