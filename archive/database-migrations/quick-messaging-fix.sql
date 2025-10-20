-- Quick fix: Just add the missing thread_id column
-- Run this in your Supabase SQL Editor

-- Add thread_id column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS thread_id UUID;

-- Create a simple connections table
CREATE TABLE IF NOT EXISTS connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  following_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- Enable RLS
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

-- Basic RLS policy
CREATE POLICY "Users can manage their own connections" ON connections
  FOR ALL USING (auth.uid() = follower_id OR auth.uid() = following_id);
