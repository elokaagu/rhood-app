-- Add status_message column to user_profiles for short status/tagline
-- Run this in Supabase SQL Editor

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS status_message TEXT;

COMMENT ON COLUMN user_profiles.status_message IS
  'Optional short status or tagline shown in user lists.';

