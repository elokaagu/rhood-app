-- Check the current schema of the achievements table
-- Run this first to see what columns exist

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'achievements' 
ORDER BY ordinal_position;
