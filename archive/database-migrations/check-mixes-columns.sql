-- Check what columns exist in the mixes table
-- Run this in Supabase SQL Editor to see the actual table structure

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'mixes'
ORDER BY ordinal_position;

