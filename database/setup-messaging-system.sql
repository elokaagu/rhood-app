-- Simplified messaging system setup
-- Run this in your Supabase SQL Editor

-- 1. First, let's check if the messages table exists and what columns it has
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Add thread_id column to messages table if it doesn't exist
ALTER TABLE messages ADD COLUMN IF NOT EXISTS thread_id UUID;

-- 3. Add other missing columns to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) DEFAULT 'text';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id UUID;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE;

-- 4. Create connections table if it doesn't exist
CREATE TABLE IF NOT EXISTS connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  following_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- 5. Create message_threads table if it doesn't exist
CREATE TABLE IF NOT EXISTS message_threads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_1 UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  participant_2 UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_content TEXT,
  last_message_sender_id UUID REFERENCES user_profiles(id),
  unread_count_participant_1 INTEGER DEFAULT 0,
  unread_count_participant_2 INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(participant_1, participant_2)
);

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_connections_follower ON connections(follower_id);
CREATE INDEX IF NOT EXISTS idx_connections_following ON connections(following_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_participant_1 ON message_threads(participant_1);
CREATE INDEX IF NOT EXISTS idx_message_threads_participant_2 ON message_threads(participant_2);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);

-- 7. Enable Row Level Security
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS Policies for connections
DROP POLICY IF EXISTS "Users can view their own connections" ON connections;
DROP POLICY IF EXISTS "Users can create their own connections" ON connections;
DROP POLICY IF EXISTS "Users can delete their own connections" ON connections;

CREATE POLICY "Users can view their own connections" ON connections
  FOR SELECT USING (
    auth.uid() = follower_id OR 
    auth.uid() = following_id
  );

CREATE POLICY "Users can create their own connections" ON connections
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete their own connections" ON connections
  FOR DELETE USING (auth.uid() = follower_id);

-- 9. Create RLS Policies for message_threads
DROP POLICY IF EXISTS "Users can view threads they participate in" ON message_threads;
DROP POLICY IF EXISTS "Users can create threads they participate in" ON message_threads;
DROP POLICY IF EXISTS "Users can update threads they participate in" ON message_threads;

CREATE POLICY "Users can view threads they participate in" ON message_threads
  FOR SELECT USING (
    auth.uid() = participant_1 OR 
    auth.uid() = participant_2
  );

CREATE POLICY "Users can create threads they participate in" ON message_threads
  FOR INSERT WITH CHECK (
    auth.uid() = participant_1 OR 
    auth.uid() = participant_2
  );

CREATE POLICY "Users can update threads they participate in" ON message_threads
  FOR UPDATE USING (
    auth.uid() = participant_1 OR 
    auth.uid() = participant_2
  );

-- 10. Update messages RLS policies
DROP POLICY IF EXISTS "Users can view messages in their threads" ON messages;
DROP POLICY IF EXISTS "Users can send messages in their threads" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;

CREATE POLICY "Users can view messages in their threads" ON messages
  FOR SELECT USING (
    auth.uid() = sender_id OR 
    auth.uid() = receiver_id OR
    EXISTS (
      SELECT 1 FROM message_threads 
      WHERE id = messages.thread_id 
      AND (participant_1 = auth.uid() OR participant_2 = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their threads" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND (
      auth.uid() = receiver_id OR
      EXISTS (
        SELECT 1 FROM message_threads 
        WHERE id = messages.thread_id 
        AND (participant_1 = auth.uid() OR participant_2 = auth.uid())
      )
    )
  );

CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own messages" ON messages
  FOR DELETE USING (auth.uid() = sender_id);

-- 11. Create function to automatically create message threads
CREATE OR REPLACE FUNCTION create_message_thread()
RETURNS TRIGGER AS $$
DECLARE
  thread_id UUID;
  participant_1_id UUID;
  participant_2_id UUID;
BEGIN
  -- Determine participants (smaller ID first for consistency)
  IF NEW.sender_id < NEW.receiver_id THEN
    participant_1_id := NEW.sender_id;
    participant_2_id := NEW.receiver_id;
  ELSE
    participant_1_id := NEW.receiver_id;
    participant_2_id := NEW.sender_id;
  END IF;

  -- Check if thread already exists
  SELECT id INTO thread_id
  FROM message_threads
  WHERE participant_1 = participant_1_id AND participant_2 = participant_2_id;

  -- Create thread if it doesn't exist
  IF thread_id IS NULL THEN
    INSERT INTO message_threads (participant_1, participant_2, last_message_at, last_message_content, last_message_sender_id)
    VALUES (participant_1_id, participant_2_id, NEW.created_at, NEW.content, NEW.sender_id)
    RETURNING id INTO thread_id;
  ELSE
    -- Update existing thread
    UPDATE message_threads
    SET 
      last_message_at = NEW.created_at,
      last_message_content = NEW.content,
      last_message_sender_id = NEW.sender_id,
      updated_at = NOW()
    WHERE id = thread_id;
  END IF;

  -- Set thread_id on the message
  NEW.thread_id := thread_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Create trigger for automatic thread creation
DROP TRIGGER IF EXISTS create_message_thread_trigger ON messages;
CREATE TRIGGER create_message_thread_trigger
  BEFORE INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION create_message_thread();

-- 13. Create function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(thread_uuid UUID, user_uuid UUID)
RETURNS VOID AS $$
DECLARE
  participant_1_id UUID;
  participant_2_id UUID;
BEGIN
  -- Get participants
  SELECT participant_1, participant_2 INTO participant_1_id, participant_2_id
  FROM message_threads
  WHERE id = thread_uuid;

  -- Mark messages as read
  UPDATE messages
  SET is_read = true
  WHERE thread_id = thread_uuid 
    AND receiver_id = user_uuid 
    AND is_read = false;

  -- Reset unread count
  IF user_uuid = participant_1_id THEN
    UPDATE message_threads
    SET unread_count_participant_1 = 0
    WHERE id = thread_uuid;
  ELSE
    UPDATE message_threads
    SET unread_count_participant_2 = 0
    WHERE id = thread_uuid;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON connections TO authenticated;
GRANT ALL ON message_threads TO authenticated;
GRANT ALL ON messages TO authenticated;
GRANT EXECUTE ON FUNCTION mark_messages_as_read TO authenticated;

-- 15. Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE connections;
ALTER PUBLICATION supabase_realtime ADD TABLE message_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
