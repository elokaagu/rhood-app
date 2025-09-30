-- Create mixes table WITHOUT foreign key constraint
-- This will work regardless of user_profiles structure
-- Run this in Supabase SQL Editor

-- Step 1: Create mixes table (no foreign key)
CREATE TABLE IF NOT EXISTS mixes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
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

-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_mixes_user_id ON mixes(user_id);
CREATE INDEX IF NOT EXISTS idx_mixes_created_at ON mixes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mixes_genre ON mixes(genre);
CREATE INDEX IF NOT EXISTS idx_mixes_is_public ON mixes(is_public);

-- Step 3: Enable RLS
ALTER TABLE mixes ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own mixes and public mixes" ON mixes;
DROP POLICY IF EXISTS "Users can insert their own mixes" ON mixes;
DROP POLICY IF EXISTS "Users can update their own mixes" ON mixes;
DROP POLICY IF EXISTS "Users can delete their own mixes" ON mixes;

-- Step 5: Create RLS policies (these work with auth.uid())
CREATE POLICY "Users can view their own mixes and public mixes" ON mixes
  FOR SELECT USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can insert their own mixes" ON mixes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mixes" ON mixes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mixes" ON mixes
  FOR DELETE USING (auth.uid() = user_id);

-- Step 6: Create or replace the update timestamp function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 7: Create trigger for updated_at
DROP TRIGGER IF EXISTS update_mixes_updated_at ON mixes;
CREATE TRIGGER update_mixes_updated_at 
BEFORE UPDATE ON mixes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 8: Verify the table was created
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'mixes'
    ) 
    THEN '✅ Mixes table created successfully!'
    ELSE '❌ Mixes table was not created'
  END AS status;

-- Step 9: Show table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'mixes'
ORDER BY ordinal_position;
