-- Minimal database setup - just add the missing columns
-- Run this in your Supabase SQL Editor

-- Add thread_id column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS thread_id UUID;

-- Create message_threads table with all required columns
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

-- Enable RLS
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policy
CREATE POLICY "Users can manage their own threads" ON message_threads
  FOR ALL USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- Grant permissions
GRANT ALL ON message_threads TO authenticated;

-- Enable realtime (ignore if already exists)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE message_threads;
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Table already in publication, that's fine
END $$;
