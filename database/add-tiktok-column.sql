-- Add tiktok column to user_profiles table
-- Run this in your Supabase SQL Editor

-- Step 1: Add tiktok column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'tiktok'
  ) THEN
    ALTER TABLE user_profiles 
    ADD COLUMN tiktok TEXT;
    
    RAISE NOTICE '✅ Added tiktok column to user_profiles';
  ELSE
    RAISE NOTICE 'ℹ️ tiktok column already exists';
  END IF;
END $$;

-- Step 2: Verify the column was added
SELECT '=== VERIFICATION ===' as status;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_profiles'
AND column_name = 'tiktok';

-- Success message
SELECT '✅ TikTok column added successfully!' as status;
SELECT '✅ You can now use TikTok handles in user profiles' as note;

