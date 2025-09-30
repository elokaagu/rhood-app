-- Create mixes table - STEP BY STEP VERSION
-- This ensures table exists before policies reference it
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: DROP existing table if you want fresh start
-- ============================================
-- Uncomment the line below if you want to start fresh:
-- DROP TABLE IF EXISTS mixes CASCADE;

-- ============================================
-- STEP 2: Create the table
-- ============================================
CREATE TABLE IF NOT EXISTS mixes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
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

-- ============================================
-- STEP 3: Create indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_mixes_user_id ON mixes(user_id);
CREATE INDEX IF NOT EXISTS idx_mixes_created_at ON mixes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mixes_genre ON mixes(genre);
CREATE INDEX IF NOT EXISTS idx_mixes_is_public ON mixes(is_public);

-- ============================================
-- STEP 4: Create or replace the update function
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- STEP 5: Create trigger
-- ============================================
DROP TRIGGER IF EXISTS update_mixes_updated_at ON mixes;
CREATE TRIGGER update_mixes_updated_at 
BEFORE UPDATE ON mixes
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 6: Enable RLS
-- ============================================
ALTER TABLE mixes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 7: Drop existing policies (clean slate)
-- ============================================
DROP POLICY IF EXISTS "Users can view their own mixes and public mixes" ON mixes;
DROP POLICY IF EXISTS "Users can insert their own mixes" ON mixes;
DROP POLICY IF EXISTS "Users can update their own mixes" ON mixes;
DROP POLICY IF EXISTS "Users can delete their own mixes" ON mixes;

-- ============================================
-- STEP 8: Create RLS policies
-- ============================================

-- Policy 1: SELECT (viewing mixes)
CREATE POLICY "Users can view their own mixes and public mixes" 
ON mixes 
FOR SELECT 
USING (
  mixes.user_id = auth.uid() OR mixes.is_public = true
);

-- Policy 2: INSERT (creating mixes)
CREATE POLICY "Users can insert their own mixes" 
ON mixes 
FOR INSERT 
WITH CHECK (
  mixes.user_id = auth.uid()
);

-- Policy 3: UPDATE (editing mixes)
CREATE POLICY "Users can update their own mixes" 
ON mixes 
FOR UPDATE 
USING (
  mixes.user_id = auth.uid()
);

-- Policy 4: DELETE (removing mixes)
CREATE POLICY "Users can delete their own mixes" 
ON mixes 
FOR DELETE 
USING (
  mixes.user_id = auth.uid()
);

-- ============================================
-- STEP 9: Verify everything
-- ============================================

-- Check table exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'mixes'
    )
    THEN '✅ Table exists'
    ELSE '❌ Table not found'
  END as table_status;

-- Show column count
SELECT 
  '✅ Mixes table created with ' || COUNT(*)::text || ' columns' as status
FROM information_schema.columns
WHERE table_name = 'mixes';

-- Show all columns
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'mixes'
ORDER BY ordinal_position;

-- Show RLS policies
SELECT 
  '✅ Policy: ' || policyname as policy_status
FROM pg_policies
WHERE tablename = 'mixes';

-- Final success message
SELECT '🎉 Mixes table is ready for uploads!' as final_status;
