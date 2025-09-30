-- Check if mixes table exists and create if needed
-- Run this in Supabase SQL Editor

-- This script will:
-- 1. Check if mixes table exists
-- 2. Create it if it doesn't exist
-- 3. Skip if it already exists

-- Create mixes table (will be skipped if exists)
CREATE TABLE IF NOT EXISTS mixes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  genre VARCHAR(100),
  duration INTEGER, -- Duration in seconds
  file_url TEXT NOT NULL, -- Supabase storage URL
  file_size BIGINT, -- File size in bytes
  artwork_url TEXT, -- Optional cover art
  play_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes (will show notice if already exists, but won't fail)
CREATE INDEX IF NOT EXISTS idx_mixes_user_id ON mixes(user_id);
CREATE INDEX IF NOT EXISTS idx_mixes_created_at ON mixes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mixes_genre ON mixes(genre);
CREATE INDEX IF NOT EXISTS idx_mixes_is_public ON mixes(is_public);

-- Enable RLS (safe to run multiple times)
ALTER TABLE mixes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own mixes and public mixes" ON mixes;
DROP POLICY IF EXISTS "Users can insert their own mixes" ON mixes;
DROP POLICY IF EXISTS "Users can update their own mixes" ON mixes;
DROP POLICY IF EXISTS "Users can delete their own mixes" ON mixes;

-- Create RLS policies
CREATE POLICY "Users can view their own mixes and public mixes" ON mixes
  FOR SELECT USING (auth.uid()::text = user_id::text OR is_public = true);

CREATE POLICY "Users can insert their own mixes" ON mixes
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own mixes" ON mixes
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own mixes" ON mixes
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- Create trigger for updated_at (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_mixes_updated_at'
  ) THEN
    CREATE TRIGGER update_mixes_updated_at 
    BEFORE UPDATE ON mixes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Verify the table was created
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'mixes'
    ) 
    THEN '✅ Mixes table exists and is ready!'
    ELSE '❌ Mixes table was not created'
  END AS status;
