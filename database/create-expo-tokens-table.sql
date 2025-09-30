-- Create table for storing Expo push notification tokens
CREATE TABLE IF NOT EXISTS user_expo_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  expo_token TEXT NOT NULL,
  device_id TEXT,
  platform TEXT CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique index to ensure one token per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_expo_tokens_user_id ON user_expo_tokens(user_id);

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_user_expo_tokens_expo_token ON user_expo_tokens(expo_token);

-- Add comments for documentation
COMMENT ON TABLE user_expo_tokens IS 'Stores Expo push notification tokens for users';
COMMENT ON COLUMN user_expo_tokens.user_id IS 'Reference to user_profiles table';
COMMENT ON COLUMN user_expo_tokens.expo_token IS 'Expo push notification token';
COMMENT ON COLUMN user_expo_tokens.device_id IS 'Optional device identifier';
COMMENT ON COLUMN user_expo_tokens.platform IS 'Platform type: ios, android, or web';
