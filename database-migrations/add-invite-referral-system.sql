-- Add DJ Invite/Referral System to R/HOOD app
-- Run this in your Supabase SQL editor

-- ============================================
-- STEP 1: Add invite_code column to user_profiles
-- ============================================
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS invite_code VARCHAR(20) UNIQUE;

-- Create index for faster invite code lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_invite_code ON user_profiles(invite_code);

-- ============================================
-- STEP 2: Create referrals table
-- ============================================
CREATE TABLE IF NOT EXISTS referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  invite_code VARCHAR(20) NOT NULL,
  credits_awarded BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(referred_id) -- Each user can only be referred once
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_invite_code ON referrals(invite_code);

-- ============================================
-- STEP 3: Function to generate unique invite code
-- ============================================
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS VARCHAR(20) AS $$
DECLARE
  new_code VARCHAR(20);
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a random 8-character alphanumeric code (uppercase)
    new_code := UPPER(
      SUBSTRING(
        MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT),
        1, 8
      )
    );
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM user_profiles WHERE invite_code = new_code)
    INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 4: Function to ensure all users have invite codes
-- ============================================
CREATE OR REPLACE FUNCTION ensure_user_invite_code(user_uuid UUID)
RETURNS VARCHAR(20) AS $$
DECLARE
  existing_code VARCHAR(20);
  new_code VARCHAR(20);
BEGIN
  -- Check if user already has an invite code
  SELECT invite_code INTO existing_code
  FROM user_profiles
  WHERE id = user_uuid;
  
  -- If no code exists, generate one
  IF existing_code IS NULL OR existing_code = '' THEN
    new_code := generate_invite_code();
    
    UPDATE user_profiles
    SET invite_code = new_code
    WHERE id = user_uuid;
    
    RETURN new_code;
  END IF;
  
  RETURN existing_code;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 5: Function to process referral and award credits
-- ============================================
CREATE OR REPLACE FUNCTION process_referral(
  invite_code_param VARCHAR(20),
  new_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  referrer_record RECORD;
  referral_exists BOOLEAN;
  credits_to_award INTEGER := 25;
BEGIN
  -- Prevent self-referral
  IF EXISTS(SELECT 1 FROM user_profiles WHERE id = new_user_id AND invite_code = invite_code_param) THEN
    RAISE NOTICE 'User cannot refer themselves';
    RETURN false;
  END IF;
  
  -- Check if user was already referred
  SELECT EXISTS(SELECT 1 FROM referrals WHERE referred_id = new_user_id)
  INTO referral_exists;
  
  IF referral_exists THEN
    RAISE NOTICE 'User has already been referred';
    RETURN false;
  END IF;
  
  -- Find the referrer by invite code
  SELECT id INTO referrer_record
  FROM user_profiles
  WHERE invite_code = invite_code_param;
  
  IF NOT FOUND THEN
    RAISE NOTICE 'Invalid invite code: %', invite_code_param;
    RETURN false;
  END IF;
  
  -- Create referral record
  INSERT INTO referrals (referrer_id, referred_id, invite_code, credits_awarded)
  VALUES (referrer_record.id, new_user_id, invite_code_param, true)
  ON CONFLICT (referred_id) DO NOTHING;
  
  -- Award credits to referrer
  UPDATE user_profiles
  SET credits = COALESCE(credits, 0) + credits_to_award,
      updated_at = NOW()
  WHERE id = referrer_record.id;
  
  RAISE NOTICE 'Awarded % credits to user % for referring user %', credits_to_award, referrer_record.id, new_user_id;
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 6: Function to get referral stats for a user
-- ============================================
CREATE OR REPLACE FUNCTION get_referral_stats(user_uuid UUID)
RETURNS TABLE (
  total_referrals BIGINT,
  total_credits_earned INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_referrals,
    COALESCE(SUM(CASE WHEN r.credits_awarded THEN 25 ELSE 0 END), 0)::INTEGER as total_credits_earned
  FROM referrals r
  WHERE r.referrer_id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 7: Generate invite codes for existing users
-- ============================================
-- This will generate invite codes for all users who don't have one
DO $$
DECLARE
  user_record RECORD;
  new_code VARCHAR(20);
BEGIN
  FOR user_record IN 
    SELECT id FROM user_profiles WHERE invite_code IS NULL OR invite_code = ''
  LOOP
    new_code := generate_invite_code();
    
    UPDATE user_profiles
    SET invite_code = new_code
    WHERE id = user_record.id;
    
    RAISE NOTICE 'Generated invite code % for user %', new_code, user_record.id;
  END LOOP;
END $$;

-- ============================================
-- STEP 8: Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own referrals (as referrer or referred)
CREATE POLICY "Users can view own referrals" ON referrals
  FOR SELECT USING (
    auth.uid() = referrer_id OR auth.uid() = referred_id
  );

-- Policy: System can insert referrals (via function)
CREATE POLICY "System can insert referrals" ON referrals
  FOR INSERT WITH CHECK (true);

-- Policy: Users can view referral stats (their own referrals)
CREATE POLICY "Users can view referral stats" ON referrals
  FOR SELECT USING (auth.uid() = referrer_id);

-- ============================================
-- STEP 9: Add comments for documentation
-- ============================================
COMMENT ON TABLE referrals IS 'Tracks DJ referrals and invite code usage';
COMMENT ON COLUMN user_profiles.invite_code IS 'Unique invite code for each DJ';
COMMENT ON COLUMN referrals.credits_awarded IS 'Whether credits were awarded for this referral';
COMMENT ON FUNCTION process_referral IS 'Processes a referral when a new user signs up with an invite code and awards 25 credits to the referrer';

