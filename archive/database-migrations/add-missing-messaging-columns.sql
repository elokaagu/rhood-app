-- Add missing columns to existing message_threads table
-- Run this in your Supabase SQL Editor

-- Add missing columns to message_threads table
ALTER TABLE message_threads ADD COLUMN IF NOT EXISTS last_message_content TEXT;
ALTER TABLE message_threads ADD COLUMN IF NOT EXISTS last_message_sender_id UUID REFERENCES user_profiles(id);
ALTER TABLE message_threads ADD COLUMN IF NOT EXISTS unread_count_participant_1 INTEGER DEFAULT 0;
ALTER TABLE message_threads ADD COLUMN IF NOT EXISTS unread_count_participant_2 INTEGER DEFAULT 0;
ALTER TABLE message_threads ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE message_threads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add thread_id column to messages table if it doesn't exist
ALTER TABLE messages ADD COLUMN IF NOT EXISTS thread_id UUID;

-- Update existing messages to have thread_id (optional - for existing data)
-- This will set thread_id to NULL for existing messages, which is fine
UPDATE messages SET thread_id = NULL WHERE thread_id IS NULL;

-- Enable RLS on message_threads if not already enabled
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;

-- Create/update RLS policy
DROP POLICY IF EXISTS "Users can manage their own threads" ON message_threads;
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
