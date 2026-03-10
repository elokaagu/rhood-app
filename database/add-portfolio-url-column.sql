-- Add portfolio_url column to user_profiles table
-- Run this in your Supabase SQL Editor

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS portfolio_url VARCHAR(500);

-- Add comment for documentation
COMMENT ON COLUMN user_profiles.portfolio_url IS 'Portfolio or website URL for DJ profiles';
