-- Comprehensive fix for message persistence issues
-- This script will:
-- 1. Ensure messages table has the correct columns (thread_id exists)
-- 2. Create proper RLS policies for messages table
-- 3. Update triggers to not depend on receiver_id
-- Run this in your Supabase SQL Editor

-- Step 1: Check current messages table structure
SELECT '=== CURRENT MESSAGES TABLE STRUCTURE ===' as status;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'messages'
ORDER BY ordinal_position;

-- Step 2: Add thread_id if it doesn't exist
ALTER TABLE messages ADD COLUMN IF NOT EXISTS thread_id UUID;

-- Step 3: Add message_type if it doesn't exist
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) DEFAULT 'text';

-- Step 4: Add multimedia columns if they don't exist
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_filename VARCHAR(255);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_size BIGINT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_mime_type VARCHAR(100);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_extension VARCHAR(10);

-- Step 5: Check message_threads structure
SELECT '=== CURRENT MESSAGE_THREADS TABLE STRUCTURE ===' as status;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'message_threads'
ORDER BY ordinal_position;

-- Step 6: Drop ALL old RLS policies on messages table
DROP POLICY IF EXISTS "Users can send messages in their threads" ON messages;
DROP POLICY IF EXISTS "Users can insert messages" ON messages;
DROP POLICY IF EXISTS "Users can view messages in their threads" ON messages;
DROP POLICY IF EXISTS "Users can view thread messages" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;
DROP POLICY IF EXISTS "users can view their own messages" ON messages;
DROP POLICY IF EXISTS "users can insert their own messages" ON messages;

-- Step 7: Check if message_threads uses user_id or participant columns
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
      
  ELSE
    RAISE EXCEPTION 'message_threads table missing required columns!';
  END IF;
END $$;

-- Step 8: Ensure RLS is enabled on messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Step 9: Grant necessary permissions
GRANT ALL ON messages TO authenticated;

-- Step 10: Enable Realtime for messages table
DO $$
BEGIN
  -- Add messages table to realtime publication if not already there
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Already added, that's fine
END $$;

-- Step 11: Update the notification trigger
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
  receiver_id UUID;
  thread_record RECORD;
  has_user_id_1 BOOLEAN;
BEGIN
  -- Check which schema we're using
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'message_threads' AND column_name = 'user_id_1'
  ) INTO has_user_id_1;
  
  -- Get sender's name
  SELECT dj_name INTO sender_name
  FROM user_profiles
  WHERE id = NEW.sender_id;
  
  -- Get thread info to determine receiver based on schema
  IF has_user_id_1 THEN
    SELECT user_id_1, user_id_2 INTO thread_record
    FROM message_threads
    WHERE id = NEW.thread_id;
    
    -- Determine receiver (the other participant)
    IF thread_record.user_id_1 = NEW.sender_id THEN
      receiver_id := thread_record.user_id_2;
    ELSE
      receiver_id := thread_record.user_id_1;
    END IF;
  ELSE
    SELECT participant_1, participant_2 INTO thread_record
    FROM message_threads
    WHERE id = NEW.thread_id;
    
    -- Determine receiver (the other participant)
    IF thread_record.participant_1 = NEW.sender_id THEN
      receiver_id := thread_record.participant_2;
    ELSE
      receiver_id := thread_record.participant_1;
    END IF;
  END IF;
  
  -- Create notification for receiver
  INSERT INTO notifications (user_id, title, message, type, related_id, is_read)
  VALUES (
    receiver_id,
    'New Message',
    sender_name || ': ' || LEFT(NEW.content, 50) || CASE WHEN LENGTH(NEW.content) > 50 THEN '...' ELSE '' END,
    'message',
    NEW.id,
    false
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS message_notification ON messages;
CREATE TRIGGER message_notification
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();

-- Step 12: Verify the setup
SELECT '=== VERIFICATION ===' as status;

-- Show all RLS policies on messages
SELECT 'MESSAGES RLS POLICIES:' as info;
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'messages';

-- Check Realtime status
SELECT 'REALTIME ENABLED TABLES:' as info;
SELECT tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';

-- Success message
SELECT '✅ Message RLS policies updated successfully!' as status;
SELECT '✅ Please verify the policies above match your schema (user_id vs participant)' as note;

