-- R/HOOD Matchmaking System Schema
-- Advanced DJ-Opportunity Matching with AI-Powered Recommendations

-- =============================================
-- 1. BRIEF TEMPLATES TABLE
-- =============================================
CREATE TABLE brief_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL, -- 'venue', 'event', 'brand', 'corporate'
  template_data JSONB NOT NULL, -- Flexible template structure
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 2. MATCHING CRITERIA TABLE
-- =============================================
CREATE TABLE matching_criteria (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'genre', 'skill_level', 'location', 'availability', 'equipment'
  weight DECIMAL(3,2) DEFAULT 1.0, -- Importance weight (0.0-1.0)
  is_required BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 3. DJ PREFERENCES TABLE
-- =============================================
CREATE TABLE dj_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  preference_type VARCHAR(50) NOT NULL, -- 'genre', 'venue_type', 'payment_range', 'travel_distance'
  preference_value JSONB NOT NULL, -- Flexible value storage
  importance_score DECIMAL(3,2) DEFAULT 1.0, -- How important this preference is
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, preference_type)
);

-- =============================================
-- 4. OPPORTUNITY REQUIREMENTS TABLE
-- =============================================
CREATE TABLE opportunity_requirements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
  requirement_type VARCHAR(50) NOT NULL, -- 'genre', 'skill_level', 'equipment', 'experience'
  requirement_value JSONB NOT NULL, -- Flexible requirement storage
  is_mandatory BOOLEAN DEFAULT true,
  weight DECIMAL(3,2) DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 5. MATCHING ALGORITHM CONFIG TABLE
-- =============================================
CREATE TABLE matching_algorithm_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  algorithm_name VARCHAR(100) NOT NULL,
  version VARCHAR(20) NOT NULL,
  config_data JSONB NOT NULL, -- Algorithm parameters and weights
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 6. MATCHES TABLE (Results)
-- =============================================
CREATE TABLE matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
  match_score DECIMAL(5,2) NOT NULL, -- 0-100 compatibility score
  match_reasons JSONB, -- Array of reasons why this is a good match
  algorithm_version VARCHAR(20),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'applied', 'rejected', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  UNIQUE(user_id, opportunity_id)
);

-- =============================================
-- 7. MATCH FEEDBACK TABLE
-- =============================================
CREATE TABLE match_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  feedback_type VARCHAR(50) NOT NULL, -- 'accuracy', 'relevance', 'timing'
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 8. DJ AVAILABILITY TABLE
-- =============================================
CREATE TABLE dj_availability (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  date_from TIMESTAMP WITH TIME ZONE NOT NULL,
  date_to TIMESTAMP WITH TIME ZONE NOT NULL,
  is_available BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 9. VENUE PROFILES TABLE
-- =============================================
CREATE TABLE venue_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  country VARCHAR(100) NOT NULL,
  capacity INTEGER,
  venue_type VARCHAR(50), -- 'club', 'bar', 'warehouse', 'outdoor', 'corporate'
  equipment_provided JSONB, -- List of available equipment
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  website_url TEXT,
  social_media JSONB, -- Instagram, Facebook, etc.
  rating DECIMAL(3,2) DEFAULT 0.0,
  total_reviews INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 10. DJ PERFORMANCE HISTORY
-- =============================================
CREATE TABLE dj_performance_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
  venue_id UUID REFERENCES venue_profiles(id),
  performance_date TIMESTAMP WITH TIME ZONE NOT NULL,
  rating DECIMAL(3,2), -- 1-5 star rating
  feedback TEXT,
  attendance_count INTEGER,
  payment_received DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Brief templates indexes
CREATE INDEX idx_brief_templates_category ON brief_templates(category);
CREATE INDEX idx_brief_templates_active ON brief_templates(is_active);

-- Matching criteria indexes
CREATE INDEX idx_matching_criteria_type ON matching_criteria(type);
CREATE INDEX idx_matching_criteria_required ON matching_criteria(is_required);

-- DJ preferences indexes
CREATE INDEX idx_dj_preferences_user_id ON dj_preferences(user_id);
CREATE INDEX idx_dj_preferences_type ON dj_preferences(preference_type);

-- Opportunity requirements indexes
CREATE INDEX idx_opportunity_requirements_opportunity_id ON opportunity_requirements(opportunity_id);
CREATE INDEX idx_opportunity_requirements_type ON opportunity_requirements(requirement_type);
CREATE INDEX idx_opportunity_requirements_mandatory ON opportunity_requirements(is_mandatory);

-- Matches indexes
CREATE INDEX idx_matches_user_id ON matches(user_id);
CREATE INDEX idx_matches_opportunity_id ON matches(opportunity_id);
CREATE INDEX idx_matches_score ON matches(match_score DESC);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_created_at ON matches(created_at DESC);
CREATE INDEX idx_matches_expires_at ON matches(expires_at);

-- Match feedback indexes
CREATE INDEX idx_match_feedback_match_id ON match_feedback(match_id);
CREATE INDEX idx_match_feedback_user_id ON match_feedback(user_id);
CREATE INDEX idx_match_feedback_rating ON match_feedback(rating);

-- DJ availability indexes
CREATE INDEX idx_dj_availability_user_id ON dj_availability(user_id);
CREATE INDEX idx_dj_availability_dates ON dj_availability(date_from, date_to);
CREATE INDEX idx_dj_availability_available ON dj_availability(is_available);

-- Venue profiles indexes
CREATE INDEX idx_venue_profiles_city ON venue_profiles(city);
CREATE INDEX idx_venue_profiles_type ON venue_profiles(venue_type);
CREATE INDEX idx_venue_profiles_rating ON venue_profiles(rating DESC);

-- Performance history indexes
CREATE INDEX idx_dj_performance_user_id ON dj_performance_history(user_id);
CREATE INDEX idx_dj_performance_date ON dj_performance_history(performance_date DESC);
CREATE INDEX idx_dj_performance_rating ON dj_performance_history(rating);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE brief_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE matching_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE dj_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE matching_algorithm_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE dj_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dj_performance_history ENABLE ROW LEVEL SECURITY;

-- DJ Preferences policies
CREATE POLICY "Users can view their own preferences" ON dj_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" ON dj_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" ON dj_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences" ON dj_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- Matches policies
CREATE POLICY "Users can view their own matches" ON matches
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own matches" ON matches
  FOR UPDATE USING (auth.uid() = user_id);

-- Match Feedback policies
CREATE POLICY "Users can view feedback for their matches" ON match_feedback
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert feedback for their matches" ON match_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- DJ Availability policies
CREATE POLICY "Users can manage their own availability" ON dj_availability
  FOR ALL USING (auth.uid() = user_id);

-- Performance History policies
CREATE POLICY "Users can view their own performance history" ON dj_performance_history
  FOR SELECT USING (auth.uid() = user_id);

-- Public read access for some tables
CREATE POLICY "Anyone can view brief templates" ON brief_templates
  FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can view matching criteria" ON matching_criteria
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view venue profiles" ON venue_profiles
  FOR SELECT USING (true);

-- =============================================
-- FUNCTIONS FOR MATCHMAKING
-- =============================================

-- Function to calculate match score
CREATE OR REPLACE FUNCTION calculate_match_score(
  p_user_id UUID,
  p_opportunity_id UUID
) RETURNS DECIMAL(5,2) AS $$
DECLARE
  total_score DECIMAL(5,2) := 0;
  genre_match DECIMAL(5,2) := 0;
  skill_match DECIMAL(5,2) := 0;
  location_match DECIMAL(5,2) := 0;
  availability_match DECIMAL(5,2) := 0;
BEGIN
  -- Genre matching logic
  SELECT COALESCE(
    (SELECT COUNT(*)::DECIMAL / GREATEST(
      (SELECT COUNT(*) FROM dj_preferences WHERE user_id = p_user_id AND preference_type = 'genre'),
      (SELECT COUNT(*) FROM opportunity_requirements WHERE opportunity_id = p_opportunity_id AND requirement_type = 'genre'),
      1
    ) * 25), 0
  ) INTO genre_match;

  -- Skill level matching
  SELECT COALESCE(
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM dj_preferences dp
        JOIN opportunity_requirements or ON dp.preference_value->>'skill_level' = or.requirement_value->>'skill_level'
        WHERE dp.user_id = p_user_id AND or.opportunity_id = p_opportunity_id
      ) THEN 25
      ELSE 0
    END, 0
  ) INTO skill_match;

  -- Location matching (simplified)
  SELECT COALESCE(
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM user_profiles up
        JOIN opportunities o ON up.city = o.location
        WHERE up.id = p_user_id AND o.id = p_opportunity_id
      ) THEN 25
      ELSE 10
    END, 0
  ) INTO location_match;

  -- Availability matching
  SELECT COALESCE(
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM dj_availability da
        JOIN opportunities o ON da.date_from <= o.event_date AND da.date_to >= o.event_date
        WHERE da.user_id = p_user_id AND o.id = p_opportunity_id AND da.is_available = true
      ) THEN 25
      ELSE 0
    END, 0
  ) INTO availability_match;

  total_score := genre_match + skill_match + location_match + availability_match;
  
  RETURN LEAST(total_score, 100);
END;
$$ LANGUAGE plpgsql;

-- Function to generate matches for a user
CREATE OR REPLACE FUNCTION generate_matches_for_user(p_user_id UUID)
RETURNS TABLE(opportunity_id UUID, match_score DECIMAL(5,2)) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id as opportunity_id,
    calculate_match_score(p_user_id, o.id) as match_score
  FROM opportunities o
  WHERE o.is_active = true
    AND o.event_date > NOW()
    AND NOT EXISTS (
      SELECT 1 FROM matches m 
      WHERE m.user_id = p_user_id AND m.opportunity_id = o.id
    )
    AND calculate_match_score(p_user_id, o.id) > 50 -- Only matches above 50% compatibility
  ORDER BY match_score DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;
