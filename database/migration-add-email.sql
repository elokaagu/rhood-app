-- Migration: Add email column to user_profiles table
-- Run this in your Supabase SQL editor

-- Add email column to existing user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN email VARCHAR(255);

-- Make email unique and not null (you may need to populate existing records first)
-- ALTER TABLE user_profiles 
-- ALTER COLUMN email SET NOT NULL;

-- Add unique constraint on email
-- ALTER TABLE user_profiles 
-- ADD CONSTRAINT user_profiles_email_unique UNIQUE (email);

-- Note: If you have existing data, you'll need to:
-- 1. First add the column as nullable
-- 2. Update existing records with email values
-- 3. Then make it NOT NULL and add the unique constraint
