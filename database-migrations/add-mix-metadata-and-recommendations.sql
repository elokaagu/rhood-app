-- Add Mix Metadata and Recommendation System
-- Run this in your Supabase SQL editor

-- ============================================
-- STEP 1: Add metadata columns to mixes table
-- ============================================
ALTER TABLE mixes 
ADD COLUMN IF NOT EXISTS bpm INTEGER,
ADD COLUMN IF NOT EXISTS sub_genre VARCHAR(100),
ADD COLUMN IF NOT EXISTS mood_tags TEXT[], -- Array of mood tags
ADD COLUMN IF NOT EXISTS audio_features JSONB, -- Store waveform, energy, etc.
ADD COLUMN IF NOT EXISTS metadata_extracted BOOLEAN DEFAULT false;

-- Create indexes for metadata queries
CREATE INDEX IF NOT EXISTS idx_mixes_bpm ON mixes(bpm) WHERE bpm IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mixes_sub_genre ON mixes(sub_genre) WHERE sub_genre IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mixes_mood_tags ON mixes USING GIN(mood_tags) WHERE mood_tags IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mixes_metadata_extracted ON mixes(metadata_extracted);

-- ============================================
-- STEP 2: Create listening behavior tracking table
-- ============================================
CREATE TABLE IF NOT EXISTS mix_listening_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  mix_id UUID NOT NULL REFERENCES mixes(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  listen_duration_seconds INTEGER, -- How long they actually listened
  completion_percentage DECIMAL(5,2), -- 0-100
  was_skipped BOOLEAN DEFAULT false,
  skip_time_seconds INTEGER, -- When they skipped (if < 10 seconds, strong negative signal)
  was_liked BOOLEAN DEFAULT false,
  was_saved BOOLEAN DEFAULT false,
  device_type VARCHAR(50), -- 'ios', 'android', 'web'
  city VARCHAR(100),
  country VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, mix_id, started_at) -- Prevent duplicate sessions
);

-- Create indexes for behavior queries
CREATE INDEX IF NOT EXISTS idx_listening_sessions_user_id ON mix_listening_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_listening_sessions_mix_id ON mix_listening_sessions(mix_id);
CREATE INDEX IF NOT EXISTS idx_listening_sessions_started_at ON mix_listening_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_listening_sessions_completion ON mix_listening_sessions(completion_percentage);

-- ============================================
-- STEP 3: Create user embeddings table
-- ============================================
CREATE TABLE IF NOT EXISTS user_embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,
  embedding VECTOR(128), -- Vector embedding representing user taste (adjust dimension as needed)
  genre_weights JSONB, -- { "house": 0.8, "techno": 0.6, ... }
  skip_rate_weights JSONB, -- Genre-specific skip rates
  avg_listen_duration INTEGER, -- Average seconds listened
  completion_rate DECIMAL(5,2), -- Overall completion percentage
  preferred_bpm_range INTEGER[], -- [min_bpm, max_bpm]
  geographic_signals JSONB, -- { "city": "Miami", "country": "US", ... }
  time_patterns JSONB, -- { "peak_hours": [20, 21, 22], "preferred_day": "weekend" }
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for vector similarity search (requires pgvector extension)
-- Note: You may need to enable pgvector extension first:
-- CREATE EXTENSION IF NOT EXISTS vector;
CREATE INDEX IF NOT EXISTS idx_user_embeddings_user_id ON user_embeddings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_embeddings_last_updated ON user_embeddings(last_updated);

-- ============================================
-- STEP 4: Create mix embeddings table
-- ============================================
CREATE TABLE IF NOT EXISTS mix_embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mix_id UUID NOT NULL UNIQUE REFERENCES mixes(id) ON DELETE CASCADE,
  embedding VECTOR(128), -- Vector embedding representing mix characteristics
  genre_vector JSONB, -- Genre representation
  bpm INTEGER,
  mood_vector JSONB, -- Mood tags as vector
  audio_features JSONB, -- Waveform, energy, etc.
  dj_quality_score DECIMAL(5,2), -- Based on credits, ratings, etc.
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_mix_embeddings_mix_id ON mix_embeddings(mix_id);
CREATE INDEX IF NOT EXISTS idx_mix_embeddings_bpm ON mix_embeddings(bpm) WHERE bpm IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mix_embeddings_last_updated ON mix_embeddings(last_updated);

-- ============================================
-- STEP 5: Create user-mix similarity cache
-- ============================================
CREATE TABLE IF NOT EXISTS user_mix_similarity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  mix_id UUID NOT NULL REFERENCES mixes(id) ON DELETE CASCADE,
  similarity_score DECIMAL(5,4), -- Cosine similarity score (0-1)
  recommendation_weight DECIMAL(5,4), -- Final weighted score for ranking
  last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, mix_id)
);

-- Create indexes for recommendation queries
CREATE INDEX IF NOT EXISTS idx_user_mix_similarity_user_id ON user_mix_similarity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_mix_similarity_mix_id ON user_mix_similarity(mix_id);
CREATE INDEX IF NOT EXISTS idx_user_mix_similarity_score ON user_mix_similarity(user_id, recommendation_weight DESC);
CREATE INDEX IF NOT EXISTS idx_user_mix_similarity_last_calculated ON user_mix_similarity(last_calculated);

-- ============================================
-- STEP 6: Function to calculate user embedding
-- ============================================
CREATE OR REPLACE FUNCTION calculate_user_embedding(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  genre_weights JSONB := '{}'::JSONB;
  skip_rates JSONB := '{}'::JSONB;
  total_listens INTEGER := 0;
  total_duration INTEGER := 0;
  total_completion DECIMAL := 0;
  avg_duration INTEGER := 0;
  completion_rate DECIMAL := 0;
  user_city VARCHAR(100);
  user_country VARCHAR(100);
  preferred_bpm_min INTEGER;
  preferred_bpm_max INTEGER;
BEGIN
  -- Get user's genre preferences from listening behavior
  SELECT 
    jsonb_object_agg(genre, listen_count::DECIMAL / total_listens)
  INTO genre_weights
  FROM (
    SELECT 
      m.genre,
      COUNT(*) as listen_count
    FROM mix_listening_sessions ls
    JOIN mixes m ON ls.mix_id = m.id
    WHERE ls.user_id = p_user_id
      AND ls.completion_percentage > 50 -- Only count meaningful listens
    GROUP BY m.genre
  ) genre_counts
  CROSS JOIN (
    SELECT COUNT(*)::DECIMAL as total_listens
    FROM mix_listening_sessions
    WHERE user_id = p_user_id AND completion_percentage > 50
  ) total;

  -- Calculate skip rates by genre
  SELECT 
    jsonb_object_agg(genre, skip_rate)
  INTO skip_rates
  FROM (
    SELECT 
      m.genre,
      COUNT(CASE WHEN ls.was_skipped AND ls.skip_time_seconds < 10 THEN 1 END)::DECIMAL / 
      NULLIF(COUNT(*), 0) as skip_rate
    FROM mix_listening_sessions ls
    JOIN mixes m ON ls.mix_id = m.id
    WHERE ls.user_id = p_user_id
    GROUP BY m.genre
  ) skip_data;

  -- Calculate average listen duration
  SELECT 
    AVG(listen_duration_seconds)::INTEGER,
    AVG(completion_percentage)
  INTO avg_duration, completion_rate
  FROM mix_listening_sessions
  WHERE user_id = p_user_id;

  -- Get user location
  SELECT city, country
  INTO user_city, user_country
  FROM user_profiles
  WHERE id = p_user_id;

  -- Calculate preferred BPM range from completed listens
  SELECT 
    MIN(m.bpm),
    MAX(m.bpm)
  INTO preferred_bpm_min, preferred_bpm_max
  FROM mix_listening_sessions ls
  JOIN mixes m ON ls.mix_id = m.id
  WHERE ls.user_id = p_user_id
    AND ls.completion_percentage >= 80
    AND m.bpm IS NOT NULL;

  -- Upsert user embedding
  INSERT INTO user_embeddings (
    user_id,
    genre_weights,
    skip_rate_weights,
    avg_listen_duration,
    completion_rate,
    preferred_bpm_range,
    geographic_signals,
    last_updated
  ) VALUES (
    p_user_id,
    COALESCE(genre_weights, '{}'::JSONB),
    COALESCE(skip_rates, '{}'::JSONB),
    COALESCE(avg_duration, 0),
    COALESCE(completion_rate, 0),
    CASE 
      WHEN preferred_bpm_min IS NOT NULL THEN ARRAY[preferred_bpm_min, preferred_bpm_max]
      ELSE NULL
    END,
    jsonb_build_object(
      'city', user_city,
      'country', user_country
    ),
    NOW()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    genre_weights = EXCLUDED.genre_weights,
    skip_rate_weights = EXCLUDED.skip_rate_weights,
    avg_listen_duration = EXCLUDED.avg_listen_duration,
    completion_rate = EXCLUDED.completion_rate,
    preferred_bpm_range = EXCLUDED.preferred_bpm_range,
    geographic_signals = EXCLUDED.geographic_signals,
    last_updated = NOW();

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 7: Function to calculate mix embedding
-- ============================================
CREATE OR REPLACE FUNCTION calculate_mix_embedding(p_mix_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  mix_record RECORD;
  dj_quality_score DECIMAL := 0;
BEGIN
  -- Get mix details
  SELECT 
    m.*,
    up.credits,
    up.gigs_completed
  INTO mix_record
  FROM mixes m
  JOIN user_profiles up ON m.user_id = up.id
  WHERE m.id = p_mix_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Calculate DJ quality score (based on credits, gigs, likes)
  dj_quality_score := (
    (COALESCE(mix_record.credits, 0)::DECIMAL / 1000) * 0.3 +
    (COALESCE(mix_record.gigs_completed, 0)::DECIMAL / 100) * 0.3 +
    (COALESCE(mix_record.likes_count, 0)::DECIMAL / 100) * 0.2 +
    (COALESCE(mix_record.play_count, 0)::DECIMAL / 1000) * 0.2
  );

  -- Upsert mix embedding
  INSERT INTO mix_embeddings (
    mix_id,
    bpm,
    genre_vector,
    mood_vector,
    audio_features,
    dj_quality_score,
    last_updated
  ) VALUES (
    p_mix_id,
    mix_record.bpm,
    jsonb_build_object('genre', mix_record.genre, 'sub_genre', mix_record.sub_genre),
    jsonb_build_object('moods', mix_record.mood_tags),
    mix_record.audio_features,
    dj_quality_score,
    NOW()
  )
  ON CONFLICT (mix_id)
  DO UPDATE SET
    bpm = EXCLUDED.bpm,
    genre_vector = EXCLUDED.genre_vector,
    mood_vector = EXCLUDED.mood_vector,
    audio_features = EXCLUDED.audio_features,
    dj_quality_score = EXCLUDED.dj_quality_score,
    last_updated = NOW();

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 8: Function to get recommended mixes for user
-- ============================================
CREATE OR REPLACE FUNCTION get_recommended_mixes(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10,
  p_include_played BOOLEAN DEFAULT false
)
RETURNS TABLE (
  mix_id UUID,
  similarity_score DECIMAL,
  recommendation_weight DECIMAL,
  title VARCHAR,
  artist VARCHAR,
  genre VARCHAR,
  sub_genre VARCHAR,
  bpm INTEGER,
  image TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id as mix_id,
    ums.similarity_score,
    ums.recommendation_weight,
    m.title,
    up.dj_name as artist,
    m.genre,
    m.sub_genre,
    m.bpm,
    m.artwork_url as image
  FROM user_mix_similarity ums
  JOIN mixes m ON ums.mix_id = m.id
  JOIN user_profiles up ON m.user_id = up.id
  WHERE ums.user_id = p_user_id
    AND m.is_public = true
    AND (p_include_played OR NOT EXISTS (
      SELECT 1 FROM mix_listening_sessions ls
      WHERE ls.user_id = p_user_id AND ls.mix_id = m.id
    ))
  ORDER BY ums.recommendation_weight DESC, m.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 9: Function to record listening session
-- ============================================
CREATE OR REPLACE FUNCTION record_listening_session(
  p_user_id UUID,
  p_mix_id UUID,
  p_listen_duration_seconds INTEGER,
  p_completion_percentage DECIMAL,
  p_was_skipped BOOLEAN DEFAULT false,
  p_skip_time_seconds INTEGER DEFAULT NULL,
  p_was_liked BOOLEAN DEFAULT false,
  p_was_saved BOOLEAN DEFAULT false,
  p_device_type VARCHAR DEFAULT NULL,
  p_city VARCHAR DEFAULT NULL,
  p_country VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  session_id UUID;
BEGIN
  INSERT INTO mix_listening_sessions (
    user_id,
    mix_id,
    listen_duration_seconds,
    completion_percentage,
    was_skipped,
    skip_time_seconds,
    was_liked,
    was_saved,
    device_type,
    city,
    country,
    ended_at
  ) VALUES (
    p_user_id,
    p_mix_id,
    p_listen_duration_seconds,
    p_completion_percentage,
    p_was_skipped,
    p_skip_time_seconds,
    p_was_liked,
    p_was_saved,
    p_device_type,
    p_city,
    p_country,
    NOW()
  )
  RETURNING id INTO session_id;

  -- Update mix play count
  UPDATE mixes
  SET play_count = play_count + 1
  WHERE id = p_mix_id;

  -- Trigger user embedding recalculation (async, can be done via trigger or job)
  -- For now, we'll just mark that recalculation is needed
  -- You can set up a cron job to recalculate embeddings periodically

  RETURN session_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 10: Enable Row Level Security
-- ============================================
ALTER TABLE mix_listening_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mix_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_mix_similarity ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only see their own data
CREATE POLICY "Users can view own listening sessions" ON mix_listening_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own listening sessions" ON mix_listening_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own embeddings" ON user_embeddings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own similarity scores" ON user_mix_similarity
  FOR SELECT USING (auth.uid() = user_id);

-- Mix embeddings are public (for recommendation calculations)
CREATE POLICY "Anyone can view mix embeddings" ON mix_embeddings
  FOR SELECT USING (true);

-- ============================================
-- STEP 11: Add comments for documentation
-- ============================================
COMMENT ON TABLE mix_listening_sessions IS 'Tracks user listening behavior for ML recommendations';
COMMENT ON TABLE user_embeddings IS 'Vector embeddings representing user taste and preferences';
COMMENT ON TABLE mix_embeddings IS 'Vector embeddings representing mix characteristics';
COMMENT ON TABLE user_mix_similarity IS 'Cached similarity scores between users and mixes';
COMMENT ON COLUMN mixes.bpm IS 'Beats per minute (BPM) of the mix';
COMMENT ON COLUMN mixes.sub_genre IS 'Sub-genre classification (e.g., Deep House, Melodic Techno)';
COMMENT ON COLUMN mixes.mood_tags IS 'Array of mood descriptors (e.g., ["Upbeat", "Hypnotic", "Energetic"])';
COMMENT ON COLUMN mixes.audio_features IS 'JSON object containing waveform, energy, and other audio characteristics';

