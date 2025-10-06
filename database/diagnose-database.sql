-- Diagnostic: Check Current Database State
-- Run this FIRST in Supabase SQL Editor to see what you have

-- ============================================
-- Check if user_profiles table exists
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    RAISE NOTICE '✅ user_profiles table EXISTS';
  ELSE
    RAISE NOTICE '❌ user_profiles table DOES NOT EXIST - you need to create it first!';
  END IF;
END $$;

-- ============================================
-- Show all columns in user_profiles
-- ============================================
SELECT 
  '📋 Current user_profiles columns:' as info;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================
-- Check primary key
-- ============================================
SELECT 
  '🔑 Primary key and constraints:' as info;

SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'user_profiles'
  AND tc.table_schema = 'public'
ORDER BY tc.constraint_type;

-- ============================================
-- Check if connections table exists
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'connections') THEN
    RAISE NOTICE '⚠️  connections table already EXISTS - you may need to DROP it first';
  ELSE
    RAISE NOTICE '✅ connections table does not exist yet (good)';
  END IF;
END $$;

-- ============================================
-- Count existing users
-- ============================================
DO $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM user_profiles;
  RAISE NOTICE '👥 Total users in database: %', user_count;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE '❌ Cannot count users - table does not exist';
END $$;

-- ============================================
-- Summary
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE '📊 DIAGNOSIS COMPLETE';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Check the output above to see your current database state.';
  RAISE NOTICE 'If user_profiles does NOT exist, you need to run the schema creation first.';
  RAISE NOTICE '==========================================';
END $$;

