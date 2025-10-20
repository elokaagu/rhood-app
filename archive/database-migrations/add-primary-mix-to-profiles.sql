-- Add primary_mix_id column to user_profiles table
-- This allows each user to set one mix as their featured/primary mix
-- Run this in your Supabase SQL Editor

-- Step 1: Add the primary_mix_id column
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS primary_mix_id UUID;

-- Step 2: Add foreign key constraint to mixes table
-- This ensures the primary_mix_id always references a valid mix
ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_primary_mix_fkey
FOREIGN KEY (primary_mix_id)
REFERENCES mixes(id)
ON DELETE SET NULL; -- If the mix is deleted, set primary_mix_id to NULL

-- Step 3: Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_primary_mix 
ON user_profiles(primary_mix_id);

-- Step 4: Add comment for documentation
COMMENT ON COLUMN user_profiles.primary_mix_id IS 'Reference to the user''s featured/primary mix displayed on their profile';

-- Step 5: Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
  AND column_name = 'primary_mix_id';

-- Step 6: Optional - Set the most recent mix as primary for existing users
-- Uncomment the lines below if you want to auto-set primary mix for users who already have mixes
/*
UPDATE user_profiles up
SET primary_mix_id = (
  SELECT m.id
  FROM mixes m
  WHERE m.user_id = up.id
    AND m.is_public = true
  ORDER BY m.created_at DESC
  LIMIT 1
)
WHERE primary_mix_id IS NULL
  AND EXISTS (
    SELECT 1 FROM mixes WHERE user_id = up.id AND is_public = true
  );
*/

