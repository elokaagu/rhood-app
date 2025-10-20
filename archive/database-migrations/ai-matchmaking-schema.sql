-- R/HOOD AI Matchmaking Schema Extension
-- Additional tables for AI-powered matching results and analytics

-- =============================================
-- 1. AI MATCHING SESSIONS
-- =============================================
CREATE TABLE ai_matching_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  session_name VARCHAR(100),
  provider VARCHAR(50) NOT NULL, -- 'openai', 'claude'
  model VARCHAR(100) NOT NULL, -- 'gpt-4-turbo-preview', 'claude-3-sonnet-20240229'
  scenario VARCHAR(50) NOT NULL, -- 'standardMatching', 'festivalMatching', etc.
  configuration JSONB NOT NULL, -- AI configuration used
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  estimated_cost DECIMAL(10,4) DEFAULT 0,
  processing_time_ms INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- =============================================
-- 2. AI MATCHING RESULTS
-- =============================================
CREATE TABLE ai_matching_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES ai_matching_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
  compatibility_score DECIMAL(5,2) NOT NULL, -- 0-100
  ranking INTEGER NOT NULL, -- Position in ranked list
  match_type VARCHAR(50) NOT NULL, -- 'perfect_fit', 'good_fit', 'interesting_opportunity', etc.
  confidence DECIMAL(3,2) NOT NULL, -- 0-1 confidence level
  reasoning TEXT NOT NULL, -- AI reasoning for the match
  strengths JSONB, -- Array of match strengths
  considerations JSONB, -- Array of considerations/concerns
  detailed_reasons JSONB, -- Structured reasoning breakdown
  confidence_breakdown JSONB, -- Confidence scores by category
  ai_metadata JSONB, -- Additional AI-generated metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 3. AI MATCHING FEEDBACK
-- =============================================
CREATE TABLE ai_matching_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  result_id UUID REFERENCES ai_matching_results(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  feedback_type VARCHAR(50) NOT NULL, -- 'accuracy', 'relevance', 'usefulness', 'reasoning_quality'
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  was_applied BOOLEAN DEFAULT false,
  was_successful BOOLEAN, -- If applied, was it successful?
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 4. AI INSIGHTS SESSIONS
-- =============================================
CREATE TABLE ai_insights_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  insight_type VARCHAR(50) NOT NULL, -- 'career_analysis', 'market_analysis', 'performance_insights'
  input_data JSONB NOT NULL, -- User profile, preferences, performance history
  insights JSONB NOT NULL, -- AI-generated insights
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  estimated_cost DECIMAL(10,4) DEFAULT 0,
  processing_time_ms INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 5. AI USAGE ANALYTICS
-- =============================================
CREATE TABLE ai_usage_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  session_type VARCHAR(50) NOT NULL, -- 'matching', 'insights', 'analysis'
  request_count INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  total_cost DECIMAL(10,4) DEFAULT 0,
  average_processing_time_ms INTEGER DEFAULT 0,
  success_rate DECIMAL(3,2) DEFAULT 0, -- 0-1
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date, provider, model, session_type)
);

-- =============================================
-- 6. AI MODEL PERFORMANCE
-- =============================================
CREATE TABLE ai_model_performance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  scenario VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  average_response_time_ms INTEGER DEFAULT 0,
  average_tokens_per_request INTEGER DEFAULT 0,
  average_cost_per_request DECIMAL(10,4) DEFAULT 0,
  user_satisfaction_score DECIMAL(3,2) DEFAULT 0, -- 0-1
  match_quality_score DECIMAL(3,2) DEFAULT 0, -- 0-1
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(provider, model, scenario, date)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- AI matching sessions indexes
CREATE INDEX idx_ai_matching_sessions_user_id ON ai_matching_sessions(user_id);
CREATE INDEX idx_ai_matching_sessions_provider ON ai_matching_sessions(provider);
CREATE INDEX idx_ai_matching_sessions_scenario ON ai_matching_sessions(scenario);
CREATE INDEX idx_ai_matching_sessions_created_at ON ai_matching_sessions(created_at DESC);
CREATE INDEX idx_ai_matching_sessions_status ON ai_matching_sessions(status);

-- AI matching results indexes
CREATE INDEX idx_ai_matching_results_session_id ON ai_matching_results(session_id);
CREATE INDEX idx_ai_matching_results_user_id ON ai_matching_results(user_id);
CREATE INDEX idx_ai_matching_results_opportunity_id ON ai_matching_results(opportunity_id);
CREATE INDEX idx_ai_matching_results_score ON ai_matching_results(compatibility_score DESC);
CREATE INDEX idx_ai_matching_results_ranking ON ai_matching_results(ranking);
CREATE INDEX idx_ai_matching_results_match_type ON ai_matching_results(match_type);
CREATE INDEX idx_ai_matching_results_confidence ON ai_matching_results(confidence DESC);

-- AI matching feedback indexes
CREATE INDEX idx_ai_matching_feedback_result_id ON ai_matching_feedback(result_id);
CREATE INDEX idx_ai_matching_feedback_user_id ON ai_matching_feedback(user_id);
CREATE INDEX idx_ai_matching_feedback_rating ON ai_matching_feedback(rating);
CREATE INDEX idx_ai_matching_feedback_type ON ai_matching_feedback(feedback_type);

-- AI insights sessions indexes
CREATE INDEX idx_ai_insights_sessions_user_id ON ai_insights_sessions(user_id);
CREATE INDEX idx_ai_insights_sessions_provider ON ai_insights_sessions(provider);
CREATE INDEX idx_ai_insights_sessions_insight_type ON ai_insights_sessions(insight_type);
CREATE INDEX idx_ai_insights_sessions_created_at ON ai_insights_sessions(created_at DESC);

-- AI usage analytics indexes
CREATE INDEX idx_ai_usage_analytics_user_id ON ai_usage_analytics(user_id);
CREATE INDEX idx_ai_usage_analytics_date ON ai_usage_analytics(date DESC);
CREATE INDEX idx_ai_usage_analytics_provider ON ai_usage_analytics(provider);
CREATE INDEX idx_ai_usage_analytics_session_type ON ai_usage_analytics(session_type);

-- AI model performance indexes
CREATE INDEX idx_ai_model_performance_provider ON ai_model_performance(provider);
CREATE INDEX idx_ai_model_performance_model ON ai_model_performance(model);
CREATE INDEX idx_ai_model_performance_scenario ON ai_model_performance(scenario);
CREATE INDEX idx_ai_model_performance_date ON ai_model_performance(date DESC);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE ai_matching_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_matching_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_matching_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_performance ENABLE ROW LEVEL SECURITY;

-- AI matching sessions policies
CREATE POLICY "Users can view their own AI sessions" ON ai_matching_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own AI sessions" ON ai_matching_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI sessions" ON ai_matching_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- AI matching results policies
CREATE POLICY "Users can view their own AI results" ON ai_matching_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own AI results" ON ai_matching_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- AI matching feedback policies
CREATE POLICY "Users can view their own AI feedback" ON ai_matching_feedback
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own AI feedback" ON ai_matching_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI feedback" ON ai_matching_feedback
  FOR UPDATE USING (auth.uid() = user_id);

-- AI insights sessions policies
CREATE POLICY "Users can view their own AI insights" ON ai_insights_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own AI insights" ON ai_insights_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- AI usage analytics policies
CREATE POLICY "Users can view their own usage analytics" ON ai_usage_analytics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own usage analytics" ON ai_usage_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- AI model performance policies (public read access for analytics)
CREATE POLICY "Anyone can view model performance" ON ai_model_performance
  FOR SELECT USING (true);

-- =============================================
-- FUNCTIONS FOR AI MATCHING
-- =============================================

-- Function to get AI matching statistics for a user
CREATE OR REPLACE FUNCTION get_ai_matching_stats(p_user_id UUID)
RETURNS TABLE(
  total_sessions BIGINT,
  total_matches BIGINT,
  average_score DECIMAL(5,2),
  average_confidence DECIMAL(3,2),
  total_cost DECIMAL(10,4),
  favorite_scenario VARCHAR(50),
  most_used_provider VARCHAR(50)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT ams.id) as total_sessions,
    COUNT(amr.id) as total_matches,
    AVG(amr.compatibility_score) as average_score,
    AVG(amr.confidence) as average_confidence,
    SUM(ams.estimated_cost) as total_cost,
    MODE() WITHIN GROUP (ORDER BY ams.scenario) as favorite_scenario,
    MODE() WITHIN GROUP (ORDER BY ams.provider) as most_used_provider
  FROM ai_matching_sessions ams
  LEFT JOIN ai_matching_results amr ON ams.id = amr.session_id
  WHERE ams.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get AI model performance metrics
CREATE OR REPLACE FUNCTION get_ai_model_performance(
  p_provider VARCHAR(50) DEFAULT NULL,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
  provider VARCHAR(50),
  model VARCHAR(100),
  scenario VARCHAR(50),
  total_requests BIGINT,
  success_rate DECIMAL(3,2),
  average_response_time_ms INTEGER,
  average_cost_per_request DECIMAL(10,4),
  user_satisfaction_score DECIMAL(3,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    amp.provider,
    amp.model,
    amp.scenario,
    amp.total_requests,
    (amp.successful_requests::DECIMAL / NULLIF(amp.total_requests, 0)) as success_rate,
    amp.average_response_time_ms,
    amp.average_cost_per_request,
    amp.user_satisfaction_score
  FROM ai_model_performance amp
  WHERE (p_provider IS NULL OR amp.provider = p_provider)
    AND amp.date >= CURRENT_DATE - INTERVAL '1 day' * p_days
  ORDER BY amp.date DESC, amp.total_requests DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to track AI usage analytics
CREATE OR REPLACE FUNCTION track_ai_usage(
  p_user_id UUID,
  p_provider VARCHAR(50),
  p_model VARCHAR(100),
  p_session_type VARCHAR(50),
  p_tokens INTEGER,
  p_cost DECIMAL(10,4),
  p_processing_time_ms INTEGER,
  p_success BOOLEAN
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO ai_usage_analytics (
    user_id, date, provider, model, session_type,
    request_count, total_tokens, total_cost, average_processing_time_ms, success_rate
  )
  VALUES (
    p_user_id, CURRENT_DATE, p_provider, p_model, p_session_type,
    1, p_tokens, p_cost, p_processing_time_ms, 
    CASE WHEN p_success THEN 1.0 ELSE 0.0 END
  )
  ON CONFLICT (user_id, date, provider, model, session_type)
  DO UPDATE SET
    request_count = ai_usage_analytics.request_count + 1,
    total_tokens = ai_usage_analytics.total_tokens + p_tokens,
    total_cost = ai_usage_analytics.total_cost + p_cost,
    average_processing_time_ms = (ai_usage_analytics.average_processing_time_ms + p_processing_time_ms) / 2,
    success_rate = (ai_usage_analytics.success_rate * ai_usage_analytics.request_count + 
                   CASE WHEN p_success THEN 1.0 ELSE 0.0 END) / (ai_usage_analytics.request_count + 1);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- VIEWS FOR ANALYTICS
-- =============================================

-- View for AI matching summary
CREATE VIEW ai_matching_summary AS
SELECT 
  ams.user_id,
  ams.provider,
  ams.model,
  ams.scenario,
  COUNT(amr.id) as matches_generated,
  AVG(amr.compatibility_score) as avg_compatibility_score,
  AVG(amr.confidence) as avg_confidence,
  SUM(ams.estimated_cost) as total_cost,
  ams.created_at as session_date
FROM ai_matching_sessions ams
LEFT JOIN ai_matching_results amr ON ams.id = amr.session_id
GROUP BY ams.user_id, ams.provider, ams.model, ams.scenario, ams.created_at;

-- View for AI feedback analysis
CREATE VIEW ai_feedback_analysis AS
SELECT 
  amr.opportunity_id,
  amr.match_type,
  AVG(amf.rating) as avg_rating,
  COUNT(amf.id) as feedback_count,
  SUM(CASE WHEN amf.was_applied THEN 1 ELSE 0 END) as applications,
  SUM(CASE WHEN amf.was_successful THEN 1 ELSE 0 END) as successful_applications
FROM ai_matching_results amr
LEFT JOIN ai_matching_feedback amf ON amr.id = amf.result_id
GROUP BY amr.opportunity_id, amr.match_type;
