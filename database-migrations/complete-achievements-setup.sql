-- Complete Achievements Setup and Fix
-- This migration ensures all achievements are properly set up and accurately awarded
-- Run this in your Supabase SQL Editor

-- ============================================
-- STEP 1: Ensure achievements table exists
-- ============================================
CREATE TABLE IF NOT EXISTS achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  category VARCHAR(50),
  requirement_type VARCHAR(50),
  requirement_value INTEGER,
  credits_reward INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 2: Ensure user_achievements table exists
-- ============================================
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned BOOLEAN DEFAULT true,
  progress INTEGER DEFAULT 0,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- ============================================
-- STEP 3: Create indexes if they don't exist
-- ============================================
CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements(category);
CREATE INDEX IF NOT EXISTS idx_achievements_active ON achievements(is_active);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_earned ON user_achievements(earned);

-- ============================================
-- STEP 4: Ensure RLS is enabled
-- ============================================
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 5: Create/Update RLS policies
-- ============================================
DROP POLICY IF EXISTS "Anyone can view achievements" ON achievements;
CREATE POLICY "Anyone can view achievements"
  ON achievements
  FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Users can view their own achievements" ON user_achievements;
CREATE POLICY "Users can view their own achievements"
  ON user_achievements
  FOR SELECT
  USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "System can insert user achievements" ON user_achievements;
CREATE POLICY "System can insert user achievements"
  ON user_achievements
  FOR INSERT
  WITH CHECK (true);

-- ============================================
-- STEP 6: Ensure all achievements exist with correct values
-- ============================================
INSERT INTO achievements (name, description, icon, category, requirement_type, requirement_value, credits_reward, sort_order, is_active)
VALUES 
  ('First Gig', 'Complete your first gig', 'trophy', 'gigs', 'gigs_count', 1, 10, 1, true),
  ('Social Butterfly', 'Connect with 2 or more DJs', 'people', 'social', 'connections', 2, 15, 2, true),
  ('5-Star Rating', 'Achieve a 5-star average rating', 'star', 'ratings', 'rating', 5, 50, 3, true),
  ('10 Gigs', 'Complete 10 gigs', 'medal', 'gigs', 'gigs_count', 10, 100, 4, true),
  ('First Mix', 'Upload your first mix', 'musical-note', 'uploads', 'mixes_count', 1, 10, 5, true),
  ('Top Performer', 'Achieve 4.9+ rating with 20+ gigs', 'ribbon', 'gigs', 'gigs_count', 20, 200, 6, true),
  ('Verified Artist', 'Get verified', 'checkmark-circle', 'milestones', 'verified', 1, 100, 7, true),
  ('50 Gigs', 'Complete 50 gigs', 'flame', 'gigs', 'gigs_count', 50, 500, 8, true),
  ('Community Builder', 'Connect with 50+ DJs', 'people', 'social', 'connections', 50, 150, 9, true)
ON CONFLICT (name) 
DO UPDATE SET
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  requirement_type = EXCLUDED.requirement_type,
  requirement_value = EXCLUDED.requirement_value,
  credits_reward = EXCLUDED.credits_reward,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

-- ============================================
-- STEP 7: Create/Update the achievement checking function with connections support
-- ============================================
CREATE OR REPLACE FUNCTION check_and_award_achievements(p_user_id UUID)
RETURNS void AS $$
DECLARE
    v_gigs_completed INTEGER;
    v_rating DECIMAL(2,1);
    v_mixes_uploaded INTEGER;
    v_connections_count INTEGER;
    v_is_verified BOOLEAN;
BEGIN
    -- Get user stats
    SELECT 
        COALESCE(gigs_completed, 0),
        COALESCE(rating, 0),
        COALESCE(is_verified, false)
    INTO 
        v_gigs_completed,
        v_rating,
        v_is_verified
    FROM user_profiles
    WHERE id = p_user_id;
    
    -- Count mixes
    SELECT COUNT(*) INTO v_mixes_uploaded
    FROM mixes
    WHERE user_id = p_user_id;
    
    -- Count accepted connections
    SELECT COUNT(*) INTO v_connections_count
    FROM connections
    WHERE (user_id_1 = p_user_id OR user_id_2 = p_user_id)
      AND status = 'accepted';
    
    -- Award "First Gig" achievement
    IF v_gigs_completed >= 1 THEN
        INSERT INTO user_achievements (user_id, achievement_id, earned)
        SELECT p_user_id, id, true
        FROM achievements
        WHERE name = 'First Gig'
        ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
    
    -- Award "10 Gigs" achievement
    IF v_gigs_completed >= 10 THEN
        INSERT INTO user_achievements (user_id, achievement_id, earned)
        SELECT p_user_id, id, true
        FROM achievements
        WHERE name = '10 Gigs'
        ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
    
    -- Award "50 Gigs" achievement
    IF v_gigs_completed >= 50 THEN
        INSERT INTO user_achievements (user_id, achievement_id, earned)
        SELECT p_user_id, id, true
        FROM achievements
        WHERE name = '50 Gigs'
        ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
    
    -- Award "5-Star Rating" achievement (4.8+ rating)
    IF v_rating >= 4.8 THEN
        INSERT INTO user_achievements (user_id, achievement_id, earned)
        SELECT p_user_id, id, true
        FROM achievements
        WHERE name = '5-Star Rating'
        ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
    
    -- Award "Top Performer" achievement
    IF v_rating >= 4.9 AND v_gigs_completed >= 20 THEN
        INSERT INTO user_achievements (user_id, achievement_id, earned)
        SELECT p_user_id, id, true
        FROM achievements
        WHERE name = 'Top Performer'
        ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
    
    -- Award "First Mix" achievement
    IF v_mixes_uploaded >= 1 THEN
        INSERT INTO user_achievements (user_id, achievement_id, earned)
        SELECT p_user_id, id, true
        FROM achievements
        WHERE name = 'First Mix'
        ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
    
    -- Award "Social Butterfly" achievement (2+ connections)
    IF v_connections_count >= 2 THEN
        INSERT INTO user_achievements (user_id, achievement_id, earned)
        SELECT p_user_id, id, true
        FROM achievements
        WHERE name = 'Social Butterfly'
        ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
    
    -- Award "Community Builder" achievement (50+ connections)
    IF v_connections_count >= 50 THEN
        INSERT INTO user_achievements (user_id, achievement_id, earned)
        SELECT p_user_id, id, true
        FROM achievements
        WHERE name = 'Community Builder'
        ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
    
    -- Award "Verified Artist" achievement
    IF v_is_verified THEN
        INSERT INTO user_achievements (user_id, achievement_id, earned)
        SELECT p_user_id, id, true
        FROM achievements
        WHERE name = 'Verified Artist'
        ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_and_award_achievements(UUID) TO authenticated;

-- ============================================
-- STEP 8: Create/Update trigger to check achievements on profile update
-- ============================================
CREATE OR REPLACE FUNCTION trigger_check_achievements()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM check_and_award_achievements(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_achievements_trigger ON user_profiles;
CREATE TRIGGER check_achievements_trigger
AFTER UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION trigger_check_achievements();

-- ============================================
-- STEP 9: Re-check achievements for ALL users
-- This will award any achievements they've already earned
-- ============================================
DO $$
DECLARE
    user_record RECORD;
    users_processed INTEGER := 0;
    achievements_awarded INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting achievement check for all users...';
    
    FOR user_record IN SELECT id FROM user_profiles LOOP
        BEGIN
            PERFORM check_and_award_achievements(user_record.id);
            users_processed := users_processed + 1;
            
            -- Log progress every 10 users
            IF users_processed % 10 = 0 THEN
                RAISE NOTICE 'Processed % users...', users_processed;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Error processing user %: %', user_record.id, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Completed! Processed % users and awarded achievements.', users_processed;
END $$;

-- ============================================
-- STEP 10: Verify the setup
-- ============================================
DO $$
DECLARE
    achievement_count INTEGER;
    user_achievement_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO achievement_count FROM achievements WHERE is_active = true;
    SELECT COUNT(*) INTO user_achievement_count FROM user_achievements WHERE earned = true;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Achievements Setup Complete!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Active achievements: %', achievement_count;
    RAISE NOTICE 'Total achievements earned by users: %', user_achievement_count;
    RAISE NOTICE '========================================';
END $$;

