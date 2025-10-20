-- Add missing profile fields to user_profiles table
-- Run this in your Supabase SQL Editor

-- Add rating field (average rating from completed gigs)
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5.0);

-- Add gigs_completed counter
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS gigs_completed INTEGER DEFAULT 0 CHECK (gigs_completed >= 0);

-- Add credits field (for platform currency/rewards)
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 0 CHECK (credits >= 0);

-- Add verification status
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- Add username field (unique, optional - generated from dj_name if not set)
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;

-- Add join_date (will default to created_at for existing users)
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS join_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add primary_mix_id if not exists (from previous migration)
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS primary_mix_id UUID;

-- Add foreign key constraint for primary_mix if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_profiles_primary_mix_fkey'
  ) THEN
    ALTER TABLE user_profiles
    ADD CONSTRAINT user_profiles_primary_mix_fkey
    FOREIGN KEY (primary_mix_id)
    REFERENCES mixes(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_rating ON user_profiles(rating DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_gigs_completed ON user_profiles(gigs_completed DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_verified ON user_profiles(is_verified);

-- Add comments for documentation
COMMENT ON COLUMN user_profiles.rating IS 'Average rating from completed gigs (0.0 to 5.0)';
COMMENT ON COLUMN user_profiles.gigs_completed IS 'Total number of completed gigs';
COMMENT ON COLUMN user_profiles.credits IS 'Platform credits/rewards for user';
COMMENT ON COLUMN user_profiles.is_verified IS 'Whether the user is verified (checkmark badge)';
COMMENT ON COLUMN user_profiles.username IS 'Unique username for the user (e.g., @elokaagu)';
COMMENT ON COLUMN user_profiles.join_date IS 'Date when user joined the platform';
COMMENT ON COLUMN user_profiles.primary_mix_id IS 'Reference to user''s featured/primary mix';

-- Optional: Generate usernames for existing users who don't have one
UPDATE user_profiles 
SET username = LOWER(REGEXP_REPLACE(dj_name, '[^a-zA-Z0-9]', '', 'g'))
WHERE username IS NULL 
  AND dj_name IS NOT NULL;

-- Optional: Set join_date to created_at for existing users
UPDATE user_profiles 
SET join_date = created_at
WHERE join_date IS NULL 
  AND created_at IS NOT NULL;

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
  AND column_name IN ('rating', 'gigs_completed', 'credits', 'is_verified', 'username', 'join_date', 'primary_mix_id')
ORDER BY column_name;

