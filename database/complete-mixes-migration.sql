-- Complete mixes table migration - add all missing columns
-- Run this in your Supabase SQL Editor

-- First, check what columns currently exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'mixes'
ORDER BY ordinal_position;

-- Add all missing columns that the app expects
ALTER TABLE mixes 
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS title VARCHAR(255),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS genre VARCHAR(100),
ADD COLUMN IF NOT EXISTS duration INTEGER,
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS artwork_url TEXT,
ADD COLUMN IF NOT EXISTS play_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add primary key if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'mixes' AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE mixes ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
    ALTER TABLE mixes ADD PRIMARY KEY (id);
  END IF;
END $$;

-- Add foreign key constraint if user_profiles table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'id'
  ) THEN
    -- Check if foreign key constraint already exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'mixes_user_id_fkey'
    ) THEN
      ALTER TABLE mixes 
      ADD CONSTRAINT mixes_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_mixes_user_id ON mixes(user_id);
CREATE INDEX IF NOT EXISTS idx_mixes_created_at ON mixes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mixes_genre ON mixes(genre);
CREATE INDEX IF NOT EXISTS idx_mixes_is_public ON mixes(is_public);

-- Enable RLS
ALTER TABLE mixes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (drop if exists first)
DROP POLICY IF EXISTS "Users can view their own mixes and public mixes" ON mixes;
CREATE POLICY "Users can view their own mixes and public mixes"
  ON mixes
  FOR SELECT
  USING (
    auth.uid() = user_id OR is_public = true
  );

DROP POLICY IF EXISTS "Users can insert their own mixes" ON mixes;
CREATE POLICY "Users can insert their own mixes"
  ON mixes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own mixes" ON mixes;
CREATE POLICY "Users can update their own mixes"
  ON mixes
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own mixes" ON mixes;
CREATE POLICY "Users can delete their own mixes"
  ON mixes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Verify the final table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'mixes'
ORDER BY ordinal_position;
