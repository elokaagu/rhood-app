-- Add credits system to R/HOOD app
-- Run this in your Supabase SQL editor

-- Add credits column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 0;

-- Add credits_awarded column to gigs table to track if credits were given
ALTER TABLE gigs 
ADD COLUMN IF NOT EXISTS credits_awarded BOOLEAN DEFAULT false;

-- Add credits_value column to achievements table to define credit rewards
ALTER TABLE achievements 
ADD COLUMN IF NOT EXISTS credits_value INTEGER DEFAULT 5;

-- Add credits_awarded column to user_achievements table to track if credits were given
ALTER TABLE user_achievements 
ADD COLUMN IF NOT EXISTS credits_awarded BOOLEAN DEFAULT false;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_credits ON user_profiles(credits);
CREATE INDEX IF NOT EXISTS idx_gigs_credits_awarded ON gigs(credits_awarded);
CREATE INDEX IF NOT EXISTS idx_achievements_credits_value ON achievements(credits_value);

-- Function to award credits for gig completion
CREATE OR REPLACE FUNCTION award_gig_credits(gig_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    gig_record RECORD;
    credits_to_award INTEGER := 10;
BEGIN
    -- Get gig details
    SELECT * INTO gig_record 
    FROM gigs 
    WHERE id = gig_id AND credits_awarded = false;
    
    -- Check if gig exists and credits not already awarded
    IF NOT FOUND THEN
        RAISE NOTICE 'Gig not found or credits already awarded for gig: %', gig_id;
        RETURN false;
    END IF;
    
    -- Award credits to the DJ
    UPDATE user_profiles 
    SET credits = credits + credits_to_award,
        updated_at = NOW()
    WHERE id = gig_record.dj_id;
    
    -- Mark credits as awarded for this gig
    UPDATE gigs 
    SET credits_awarded = true,
        updated_at = NOW()
    WHERE id = gig_id;
    
    RAISE NOTICE 'Awarded % credits to user % for gig %', credits_to_award, gig_record.dj_id, gig_id;
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to award credits for achievement unlock
CREATE OR REPLACE FUNCTION award_achievement_credits(user_id UUID, achievement_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    achievement_record RECORD;
    user_achievement_record RECORD;
    credits_to_award INTEGER;
BEGIN
    -- Get achievement details
    SELECT * INTO achievement_record 
    FROM achievements 
    WHERE id = achievement_id;
    
    IF NOT FOUND THEN
        RAISE NOTICE 'Achievement not found: %', achievement_id;
        RETURN false;
    END IF;
    
    -- Get user achievement details
    SELECT * INTO user_achievement_record 
    FROM user_achievements 
    WHERE user_id = user_achievement_record.user_id 
    AND achievement_id = user_achievement_record.achievement_id 
    AND credits_awarded = false;
    
    IF NOT FOUND THEN
        RAISE NOTICE 'User achievement not found or credits already awarded for user % achievement %', user_id, achievement_id;
        RETURN false;
    END IF;
    
    credits_to_award := achievement_record.credits_value;
    
    -- Award credits to the user
    UPDATE user_profiles 
    SET credits = credits + credits_to_award,
        updated_at = NOW()
    WHERE id = user_id;
    
    -- Mark credits as awarded for this achievement
    UPDATE user_achievements 
    SET credits_awarded = true,
        updated_at = NOW()
    WHERE user_id = user_id AND achievement_id = achievement_id;
    
    RAISE NOTICE 'Awarded % credits to user % for achievement %', credits_to_award, user_id, achievement_id;
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's total credits (for display on their own profile)
CREATE OR REPLACE FUNCTION get_user_credits(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    user_credits INTEGER;
BEGIN
    SELECT credits INTO user_credits
    FROM user_profiles 
    WHERE id = user_uuid;
    
    RETURN COALESCE(user_credits, 0);
END;
$$ LANGUAGE plpgsql;

-- Update existing achievements with default credit values
UPDATE achievements 
SET credits_value = CASE 
    WHEN category = 'milestone' THEN 25
    WHEN category = 'social' THEN 15
    WHEN category = 'gig' THEN 20
    WHEN category = 'special' THEN 50
    ELSE 10
END
WHERE credits_value IS NULL OR credits_value = 0;

-- Grant permissions
GRANT EXECUTE ON FUNCTION award_gig_credits(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION award_achievement_credits(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_credits(UUID) TO authenticated;

-- Add some example achievements with credit values
INSERT INTO achievements (title, description, icon, category, credits_value, is_active, sort_order) VALUES
('First Gig', 'Complete your first DJ gig', 'star', 'milestone', 25, true, 1),
('Social Butterfly', 'Connect with 10 other DJs', 'people', 'social', 15, true, 2),
('Gig Master', 'Complete 5 gigs', 'trophy', 'gig', 20, true, 3),
('R/HOOD Legend', 'Reach 1000 credits', 'diamond', 'special', 50, true, 4)
ON CONFLICT (title) DO NOTHING;

DO $$ 
BEGIN
    RAISE NOTICE 'Credits system successfully added to R/HOOD!';
    RAISE NOTICE 'Users get 10 credits per gig completion';
    RAISE NOTICE 'Users get variable credits per achievement unlock';
    RAISE NOTICE 'Credits are private - users only see their own credits';
END $$;
