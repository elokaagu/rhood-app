-- Update achievements: Add/Update "Social Butterfly" to require 2+ connections
-- and ensure "First Mix" exists

-- Add or update "Social Butterfly" achievement (2+ connections)
INSERT INTO achievements (name, description, icon, category, requirement_type, requirement_value, credits_reward, sort_order, is_active)
VALUES 
('Social Butterfly', 'Connect with 2 or more DJs', 'people', 'social', 'connections', 2, 15, 2, true)
ON CONFLICT (name) 
DO UPDATE SET
  description = EXCLUDED.description,
  requirement_type = EXCLUDED.requirement_type,
  requirement_value = EXCLUDED.requirement_value,
  credits_reward = EXCLUDED.credits_reward,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

-- Ensure "First Mix" exists (should already exist, but adding for safety)
INSERT INTO achievements (name, description, icon, category, requirement_type, requirement_value, credits_reward, sort_order, is_active)
VALUES 
('First Mix', 'Upload your first mix', 'musical-note', 'uploads', 'mixes_count', 1, 10, 5, true)
ON CONFLICT (name) DO NOTHING;

-- Update sort order for achievements to ensure proper display
-- Social Butterfly should come early (sort_order 2)
-- First Mix should be after First Gig (sort_order 5)
UPDATE achievements 
SET sort_order = 2 
WHERE name = 'Social Butterfly';

UPDATE achievements 
SET sort_order = 5 
WHERE name = 'First Mix';

-- Re-check achievements for all users to award any newly eligible achievements
-- This will award "Social Butterfly" to users who already have 2+ connections
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT id FROM user_profiles LOOP
        PERFORM check_and_award_achievements(user_record.id);
    END LOOP;
END $$;

