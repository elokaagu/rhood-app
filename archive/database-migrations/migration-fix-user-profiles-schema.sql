-- Fix user_profiles table schema to match app expectations
-- Run this in your Supabase SQL editor

-- Add missing columns to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS location VARCHAR(255),
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS genres TEXT[], -- Array of genres
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS show_email BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_phone BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS primary_mix_id UUID REFERENCES mixes(id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_location ON user_profiles(location);
CREATE INDEX IF NOT EXISTS idx_user_profiles_show_email ON user_profiles(show_email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_show_phone ON user_profiles(show_phone);
CREATE INDEX IF NOT EXISTS idx_user_profiles_primary_mix ON user_profiles(primary_mix_id);

-- Ensure the updated_at column exists and has the trigger
DO $$ 
BEGIN
  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_profiles' 
                 AND column_name = 'updated_at') THEN
    ALTER TABLE user_profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
  
  -- Drop existing trigger if it exists
  DROP TRIGGER IF EXISTS update_updated_at_column ON user_profiles;
  
  -- Recreate the trigger
  CREATE TRIGGER update_updated_at_column
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
    
  RAISE NOTICE 'User profiles schema updated successfully';
END $$;
