-- Add location field to user_profiles table
-- Run this in your Supabase SQL editor

-- Add location column
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS location VARCHAR(255);

-- Add index for location searches
CREATE INDEX IF NOT EXISTS idx_user_profiles_location 
ON user_profiles(location);

-- Update the updated_at trigger to include location changes
DO $$ 
BEGIN
  -- Drop existing trigger if it exists
  DROP TRIGGER IF EXISTS update_updated_at_column ON user_profiles;
  
  -- Recreate the trigger
  CREATE TRIGGER update_updated_at_column
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
    
  RAISE NOTICE 'Location field added to user_profiles table successfully';
END $$;
