-- Migration: Add phone field to user_profiles table
-- Run this in your Supabase SQL editor

-- Add phone column to existing user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Add privacy settings columns for email and phone visibility
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS show_email BOOLEAN DEFAULT true;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS show_phone BOOLEAN DEFAULT false;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_show_email ON user_profiles (show_email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_show_phone ON user_profiles (show_phone);

-- Update the updated_at trigger to include new columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

RAISE NOTICE 'Added phone field and privacy settings to user_profiles table.';
