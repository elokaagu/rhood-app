-- Add artwork_url column to mixes table if it doesn't exist
-- Run this in Supabase SQL Editor

-- Add the column
ALTER TABLE mixes 
ADD COLUMN IF NOT EXISTS artwork_url TEXT;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'mixes'
ORDER BY ordinal_position;

