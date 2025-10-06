-- Fix user_profiles table schema
-- Run this in your Supabase SQL Editor

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add full_name if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'full_name'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN full_name VARCHAR(100);
    END IF;

    -- Add bio if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'bio'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN bio TEXT;
    END IF;

    -- Add profile_image_url if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'profile_image_url'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN profile_image_url TEXT;
    END IF;

    -- Add genres if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'genres'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN genres TEXT[] DEFAULT '{}';
    END IF;

    -- Add instagram if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'instagram'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN instagram VARCHAR(100);
    END IF;

    -- Add soundcloud if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'soundcloud'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN soundcloud VARCHAR(200);
    END IF;

    -- Add updated_at if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

