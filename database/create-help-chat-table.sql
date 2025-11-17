-- Create help_chat_messages table for persistent help chat conversations
-- Run this in your Supabase SQL Editor

-- 1. Create the help_chat_messages table
CREATE TABLE IF NOT EXISTS help_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  sender VARCHAR(20) NOT NULL CHECK (sender IN ('user', 'bot')),
  text TEXT NOT NULL,
  metadata JSONB, -- For storing quickActions, error info, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_help_chat_messages_user_id ON help_chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_help_chat_messages_created_at ON help_chat_messages(user_id, created_at DESC);

-- 3. Enable RLS (Row Level Security)
ALTER TABLE help_chat_messages ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
-- Users can only see their own messages
CREATE POLICY "Users can view their own help chat messages"
  ON help_chat_messages
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own messages
CREATE POLICY "Users can insert their own help chat messages"
  ON help_chat_messages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own messages (for editing, etc.)
CREATE POLICY "Users can update their own help chat messages"
  ON help_chat_messages
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own messages
CREATE POLICY "Users can delete their own help chat messages"
  ON help_chat_messages
  FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_help_chat_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to update updated_at
CREATE TRIGGER help_chat_messages_updated_at
  BEFORE UPDATE ON help_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_help_chat_messages_updated_at();

-- 7. Enable realtime (optional, for live updates if needed)
ALTER PUBLICATION supabase_realtime ADD TABLE help_chat_messages;

-- Success message
SELECT '✅ Help chat messages table created successfully!' as status;

