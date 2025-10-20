-- Simple database setup for messaging system
-- Run this in your Supabase SQL Editor

-- 1. Add thread_id column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS thread_id UUID;

-- 2. Create connections table
CREATE TABLE IF NOT EXISTS connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  following_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- 3. Create message_threads table with all required columns
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

-- 4. Enable RLS
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;

-- 5. Create basic RLS policies
CREATE POLICY "Users can manage their own connections" ON connections
  FOR ALL USING (auth.uid() = follower_id OR auth.uid() = following_id);

CREATE POLICY "Users can manage their own threads" ON message_threads
  FOR ALL USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- 6. Grant permissions
GRANT ALL ON connections TO authenticated;
GRANT ALL ON message_threads TO authenticated;
GRANT ALL ON messages TO authenticated;

-- 7. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE connections;
ALTER PUBLICATION supabase_realtime ADD TABLE message_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
