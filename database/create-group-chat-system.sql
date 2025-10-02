-- Group Chat Database Schema for R/HOOD App
-- Run this in your Supabase SQL Editor

-- 1. Create group_messages table for community group chats
CREATE TABLE IF NOT EXISTS group_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio', 'file')),
  reply_to_id UUID REFERENCES group_messages(id),
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_group_messages_community_id ON group_messages(community_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_sender_id ON group_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created_at ON group_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_messages_community_created ON group_messages(community_id, created_at DESC);

-- 3. Enable Row Level Security
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies for group messages
-- Users can view messages from communities they're members of
CREATE POLICY "Users can view group messages from their communities" ON group_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM community_members 
      WHERE community_id = group_messages.community_id 
      AND user_id = auth.uid()
    )
  );

-- Users can send messages to communities they're members of
CREATE POLICY "Users can send group messages to their communities" ON group_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM community_members 
      WHERE community_id = group_messages.community_id 
      AND user_id = auth.uid()
    )
  );

-- Users can update their own group messages
CREATE POLICY "Users can update their own group messages" ON group_messages
  FOR UPDATE USING (auth.uid() = sender_id);

-- Users can delete their own group messages
CREATE POLICY "Users can delete their own group messages" ON group_messages
  FOR DELETE USING (auth.uid() = sender_id);

-- 5. Grant permissions
GRANT ALL ON group_messages TO authenticated;

-- 6. Enable realtime for group messages
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE group_messages;
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Table already in publication, that's fine
END $$;

-- 7. Create updated_at trigger for group_messages
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_group_messages_updated_at 
  BEFORE UPDATE ON group_messages 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Insert sample group messages (optional - for testing)
-- First, let's make sure we have some communities and users
INSERT INTO communities (id, name, description, member_count, created_by) 
VALUES 
  ('aa00a0aa-1111-1111-1111-111111111111', 'Underground DJs', 'Connect with underground DJs worldwide', 1234, (SELECT id FROM user_profiles LIMIT 1)),
  ('bb11b1bb-2222-2222-2222-222222222222', 'Techno Collective', 'Share techno tracks and collaborate', 856, (SELECT id FROM user_profiles LIMIT 1)),
  ('cc22c2cc-3333-3333-3333-333333333333', 'Miami Music Scene', 'Local Miami DJs and producers', 432, (SELECT id FROM user_profiles LIMIT 1))
ON CONFLICT (id) DO NOTHING;

-- Add some sample group messages
INSERT INTO group_messages (community_id, sender_id, content, created_at) 
SELECT 
  'aa00a0aa-1111-1111-1111-111111111111',
  (SELECT id FROM user_profiles LIMIT 1),
  'Welcome to Underground DJs! 🎧',
  NOW() - INTERVAL '2 hours'
WHERE EXISTS (SELECT 1 FROM user_profiles LIMIT 1);

INSERT INTO group_messages (community_id, sender_id, content, created_at) 
SELECT 
  'aa00a0aa-1111-1111-1111-111111111111',
  (SELECT id FROM user_profiles LIMIT 1),
  'Anyone up for a collab session this weekend?',
  NOW() - INTERVAL '1 hour'
WHERE EXISTS (SELECT 1 FROM user_profiles LIMIT 1);

INSERT INTO group_messages (community_id, sender_id, content, created_at) 
SELECT 
  'bb11b1bb-2222-2222-2222-222222222222',
  (SELECT id FROM user_profiles LIMIT 1),
  'New techno track dropped! Check it out 🔥',
  NOW() - INTERVAL '30 minutes'
WHERE EXISTS (SELECT 1 FROM user_profiles LIMIT 1);
