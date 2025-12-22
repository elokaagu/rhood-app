-- Fix achievements checking function to include connections
-- This will ensure "Social Butterfly" and other connection-based achievements are properly awarded

CREATE OR REPLACE FUNCTION check_and_award_achievements(p_user_id UUID)
RETURNS void AS $$
DECLARE
    v_gigs_completed INTEGER;
    v_rating DECIMAL(2,1);
    v_mixes_uploaded INTEGER;
    v_connections_count INTEGER;
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

