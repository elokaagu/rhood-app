-- Create mixes table - SIMPLEST VERSION
-- Works with Supabase auth system directly
-- Run this in Supabase SQL Editor

-- Step 1: Create mixes table
CREATE TABLE IF NOT EXISTS mixes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL, -- This will store auth.uid()
  title VARCHAR(255) NOT NULL,
  description TEXT,
  genre VARCHAR(100),
  duration INTEGER,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  artwork_url TEXT,
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

-- Step 4: Drop existing policies (if any)
DROP POLICY IF EXISTS "Users can view their own mixes and public mixes" ON mixes;
DROP POLICY IF EXISTS "Users can insert their own mixes" ON mixes;
DROP POLICY IF EXISTS "Users can update their own mixes" ON mixes;
DROP POLICY IF EXISTS "Users can delete their own mixes" ON mixes;

-- Step 5: Create RLS policies
-- IMPORTANT: These use auth.uid() which is the authenticated user's ID from Supabase Auth

-- Allow users to view their own mixes and all public mixes
CREATE POLICY "Users can view their own mixes and public mixes" 
ON mixes FOR SELECT 
USING (
  user_id = auth.uid() OR is_public = true
);

-- Allow users to insert mixes (must be their own user_id)
CREATE POLICY "Users can insert their own mixes" 
ON mixes FOR INSERT 
WITH CHECK (
  user_id = auth.uid()
);

-- Allow users to update only their own mixes
CREATE POLICY "Users can update their own mixes" 
ON mixes FOR UPDATE 
USING (
  user_id = auth.uid()
);

-- Allow users to delete only their own mixes
CREATE POLICY "Users can delete their own mixes" 
ON mixes FOR DELETE 
USING (
  user_id = auth.uid()
);

-- Step 6: Create update function (if doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 7: Create trigger
DROP TRIGGER IF EXISTS update_mixes_updated_at ON mixes;
CREATE TRIGGER update_mixes_updated_at 
BEFORE UPDATE ON mixes
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Step 8: Verify everything worked
SELECT 
  '✅ Mixes table created successfully!' as status,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'mixes';

-- Step 9: Show the table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'mixes'
ORDER BY ordinal_position;
