-- Add missing is_public column to mixes table
-- Run this in your Supabase SQL Editor

-- Check current columns in mixes table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'mixes'
ORDER BY ordinal_position;

-- Add is_public column if it doesn't exist
ALTER TABLE mixes 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Add index for is_public column
CREATE INDEX IF NOT EXISTS idx_mixes_is_public ON mixes(is_public);

-- Update existing mixes to be public by default
UPDATE mixes 
SET is_public = true 
WHERE is_public IS NULL;

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'mixes' AND column_name = 'is_public';
