-- Fix RLS policies for mixes table to ensure proper access
-- Run this in your Supabase SQL Editor

-- First, let's check the current RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'mixes';

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view their own mixes and public mixes" ON mixes;
DROP POLICY IF EXISTS "Users can insert their own mixes" ON mixes;
DROP POLICY IF EXISTS "Users can update their own mixes" ON mixes;
DROP POLICY IF EXISTS "Users can delete their own mixes" ON mixes;

-- Create more permissive RLS policies for mixes
-- Policy: Users can view their own mixes and public mixes
CREATE POLICY "Users can view their own mixes and public mixes" ON mixes
  FOR SELECT 
  USING (
    auth.uid()::text = user_id::text OR is_public = true
  );

-- Policy: Users can insert their own mixes
CREATE POLICY "Users can insert their own mixes" ON mixes
  FOR INSERT 
  WITH CHECK (auth.uid()::text = user_id::text);

-- Policy: Users can update their own mixes
CREATE POLICY "Users can update their own mixes" ON mixes
  FOR UPDATE 
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

-- Policy: Users can delete their own mixes
CREATE POLICY "Users can delete their own mixes" ON mixes
  FOR DELETE 
  USING (auth.uid()::text = user_id::text);

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'mixes';

-- Test query to see if a user can access their own mixes
-- Replace 'your-user-id-here' with an actual user ID to test
-- SELECT * FROM mixes WHERE user_id = 'your-user-id-here';

-- Also ensure the is_public column exists and has proper defaults
ALTER TABLE mixes 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Update any NULL values to true
UPDATE mixes 
SET is_public = true 
WHERE is_public IS NULL;
