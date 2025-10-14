-- Check what tables exist and create missing ones
-- Run this in your Supabase SQL Editor

-- First, let's see what tables we have
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('message_threads', 'messages', 'community_posts', 'communities', 'community_members')
ORDER BY table_name;

-- Create communities table if it doesn't exist
CREATE TABLE IF NOT EXISTS communities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create community_members table if it doesn't exist
CREATE TABLE IF NOT EXISTS community_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(community_id, user_id)
);

-- Create community_posts table if it doesn't exist
CREATE TABLE IF NOT EXISTS community_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create message_threads table if it doesn't exist
CREATE TABLE IF NOT EXISTS message_threads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(20) NOT NULL DEFAULT 'individual',
  user_id_1 UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  user_id_2 UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT check_thread_type CHECK (
    (type = 'individual' AND user_id_1 IS NOT NULL AND user_id_2 IS NOT NULL AND community_id IS NULL) OR
    (type = 'group' AND community_id IS NOT NULL AND user_id_1 IS NULL AND user_id_2 IS NULL)
  )
);

-- Create messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Now disable RLS for all messaging tables
ALTER TABLE message_threads DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE communities DISABLE ROW LEVEL SECURITY;
ALTER TABLE community_members DISABLE ROW LEVEL SECURITY;

-- Create the R/HOOD community with a proper UUID
INSERT INTO communities (id, name, description, image_url) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'R/HOOD Group Chat', 'The main R/HOOD community chat', 'https://jsmcduecuxtaqizhmiqo.supabase.co/storage/v1/object/public/assets/rhood_logo.webp')
ON CONFLICT (id) DO NOTHING;

-- Add all users as members of the R/HOOD community
INSERT INTO community_members (community_id, user_id, role)
SELECT '550e8400-e29b-41d4-a716-446655440000', id, 'member'
FROM user_profiles
ON CONFLICT (community_id, user_id) DO NOTHING;
