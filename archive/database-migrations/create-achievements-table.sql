-- Create achievements system for gamification
-- Run this in your Supabase SQL Editor

-- Table for defining available achievements
CREATE TABLE IF NOT EXISTS achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Achievement Details
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50), -- Ionicons name (e.g., 'trophy', 'star', 'medal')
  category VARCHAR(50), -- e.g., 'gigs', 'ratings', 'social', 'milestones'
  
  -- Requirements
  requirement_type VARCHAR(50), -- e.g., 'gigs_count', 'rating', 'uploads', 'connections'
  requirement_value INTEGER, -- e.g., 10 for "complete 10 gigs"
  
  -- Reward
  credits_reward INTEGER DEFAULT 0,
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for tracking user achievements
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Foreign Keys
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  
  -- Status
  earned BOOLEAN DEFAULT true,
  progress INTEGER DEFAULT 0, -- For tracking progress toward achievement
  
  -- Metadata
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure user can only earn each achievement once
  UNIQUE(user_id, achievement_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements(category);
CREATE INDEX IF NOT EXISTS idx_achievements_active ON achievements(is_active);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_earned ON user_achievements(earned);

-- Enable Row Level Security
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view achievements
CREATE POLICY "Anyone can view achievements"
  ON achievements
  FOR SELECT
  USING (is_active = true);

-- Policy: Users can view their own achievements
CREATE POLICY "Users can view their own achievements"
  ON user_achievements
  FOR SELECT
  USING (auth.uid()::text = user_id::text);

-- Policy: System can insert user achievements (done via triggers)
CREATE POLICY "System can insert user achievements"
  ON user_achievements
  FOR INSERT
  WITH CHECK (true);

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION check_and_award_achievements(p_user_id UUID)
RETURNS void AS $$
DECLARE
    v_gigs_completed INTEGER;
    v_rating DECIMAL(2,1);
    v_mixes_uploaded INTEGER;
BEGIN
    -- Get user stats
    SELECT 
        COALESCE(gigs_completed, 0),
        COALESCE(rating, 0)
    INTO 
        v_gigs_completed,
        v_rating
    FROM user_profiles
    WHERE id = p_user_id;
    
    -- Count mixes
    SELECT COUNT(*) INTO v_mixes_uploaded
    FROM mixes
    WHERE user_id = p_user_id;
    
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
    
    -- Award "5-Star Rating" achievement
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to check achievements when user profile is updated
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

-- Add comments
COMMENT ON TABLE achievements IS 'Defines available achievements in the system';
COMMENT ON TABLE user_achievements IS 'Tracks which achievements users have earned';
COMMENT ON COLUMN achievements.requirement_type IS 'Type of requirement to earn achievement';
COMMENT ON COLUMN achievements.requirement_value IS 'Value threshold to earn achievement';

-- Insert default achievements
INSERT INTO achievements (name, description, icon, category, requirement_type, requirement_value, credits_reward, sort_order) VALUES
('First Gig', 'Complete your first gig', 'trophy', 'gigs', 'gigs_count', 1, 10, 1),
('5-Star Rating', 'Achieve a 5-star average rating', 'star', 'ratings', 'rating', 48, 50, 2),
('10 Gigs', 'Complete 10 gigs', 'medal', 'gigs', 'gigs_count', 10, 100, 3),
('Top Performer', 'Achieve 4.9+ rating with 20+ gigs', 'ribbon', 'ratings', 'rating', 49, 200, 4),
('First Mix', 'Upload your first mix', 'musical-note', 'uploads', 'mixes_count', 1, 10, 5),
('Verified Artist', 'Get verified on R/HOOD', 'checkmark-circle', 'milestones', 'verified', 1, 100, 6),
('50 Gigs', 'Complete 50 gigs', 'flame', 'gigs', 'gigs_count', 50, 500, 7),
('Community Builder', 'Connect with 50+ DJs', 'people', 'social', 'connections', 50, 150, 8)
ON CONFLICT (name) DO NOTHING;

-- Run achievement check for all existing users (optional)
-- Uncomment to award achievements to existing users
/*
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT id FROM user_profiles LOOP
        PERFORM check_and_award_achievements(user_record.id);
    END LOOP;
END $$;
*/

