-- Safe Mixes Table Creation
-- This version checks for user_profiles structure first
-- Run this in Supabase SQL Editor

-- Step 1: Check if user_profiles table exists and what columns it has
DO $$
BEGIN
  RAISE NOTICE 'Checking user_profiles table structure...';
END $$;

-- Step 2: Create mixes table with flexible user reference
CREATE TABLE IF NOT EXISTS mixes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL, -- Will add foreign key constraint after checking
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

-- Step 3: Try to add foreign key constraint (will fail gracefully if user_profiles doesn't have id column)
DO $$
BEGIN
  -- Check if user_profiles table exists and has an id column
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'id'
  ) THEN
    -- Try to add foreign key constraint if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.table_constraints 
      WHERE constraint_name = 'mixes_user_id_fkey'
    ) THEN
      ALTER TABLE mixes 
      ADD CONSTRAINT mixes_user_id_fkey 
      FOREIGN KEY (user_id) 
      REFERENCES user_profiles(id) 
      ON DELETE CASCADE;
      RAISE NOTICE '✅ Foreign key constraint added';
    ELSE
      RAISE NOTICE '✅ Foreign key constraint already exists';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ user_profiles table does not have id column - skipping foreign key';
  END IF;
END $$;

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_mixes_user_id ON mixes(user_id);
CREATE INDEX IF NOT EXISTS idx_mixes_created_at ON mixes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mixes_genre ON mixes(genre);
CREATE INDEX IF NOT EXISTS idx_mixes_is_public ON mixes(is_public);

-- Step 5: Enable RLS
ALTER TABLE mixes ENABLE ROW LEVEL SECURITY;

-- Step 6: Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own mixes and public mixes" ON mixes;
DROP POLICY IF EXISTS "Users can insert their own mixes" ON mixes;
DROP POLICY IF EXISTS "Users can update their own mixes" ON mixes;
DROP POLICY IF EXISTS "Users can delete their own mixes" ON mixes;

-- Step 7: Create RLS policies
CREATE POLICY "Users can view their own mixes and public mixes" ON mixes
  FOR SELECT USING (auth.uid()::text = user_id::text OR is_public = true);

CREATE POLICY "Users can insert their own mixes" ON mixes
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own mixes" ON mixes
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own mixes" ON mixes
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- Step 8: Create trigger for updated_at
DO $$
BEGIN
  -- Check if update_updated_at_column function exists
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
  ) THEN
    -- Drop trigger if exists
    DROP TRIGGER IF EXISTS update_mixes_updated_at ON mixes;
    
    -- Create trigger
    CREATE TRIGGER update_mixes_updated_at 
    BEFORE UPDATE ON mixes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    RAISE NOTICE '✅ Trigger created';
  ELSE
    RAISE NOTICE '⚠️ update_updated_at_column function not found - skipping trigger';
  END IF;
END $$;

-- Step 9: Verify the table was created
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

-- Step 10: Show table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'mixes'
ORDER BY ordinal_position;
