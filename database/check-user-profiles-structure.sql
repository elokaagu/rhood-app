-- Check user_profiles table structure
-- Run this first to understand your current schema

-- Check if user_profiles table exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'user_profiles'
    )
    THEN '✅ user_profiles table exists'
    ELSE '❌ user_profiles table does NOT exist'
  END AS table_status;

-- Show all columns in user_profiles table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Show primary key and constraints
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'user_profiles'
ORDER BY tc.constraint_type;
