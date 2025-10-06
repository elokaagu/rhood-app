-- Create gigs/bookings table for tracking DJ performances
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS gigs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Foreign Keys
  dj_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  venue_id UUID, -- Could link to venues table if you create one
  
  -- Gig Details
  name VARCHAR(200) NOT NULL,
  venue VARCHAR(200) NOT NULL,
  location VARCHAR(200),
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  
  -- Financial
  payment DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'GBP',
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'cancelled')),
  
  -- Status & Rating
  status VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'cancelled', 'in_progress')),
  dj_rating DECIMAL(2,1) CHECK (dj_rating >= 0 AND dj_rating <= 5.0),
  venue_rating DECIMAL(2,1) CHECK (venue_rating >= 0 AND venue_rating <= 5.0),
  
  -- Additional Info
  description TEXT,
  genre VARCHAR(100),
  audience_size INTEGER,
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_gigs_dj_id ON gigs(dj_id);
CREATE INDEX IF NOT EXISTS idx_gigs_opportunity_id ON gigs(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_gigs_event_date ON gigs(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_gigs_status ON gigs(status);
CREATE INDEX IF NOT EXISTS idx_gigs_dj_rating ON gigs(dj_rating DESC);

-- Enable Row Level Security
ALTER TABLE gigs ENABLE ROW LEVEL SECURITY;

-- Policy: DJs can view their own gigs
CREATE POLICY "DJs can view their own gigs"
  ON gigs
  FOR SELECT
  USING (auth.uid()::text = dj_id::text);

-- Policy: DJs can insert their own gigs
CREATE POLICY "DJs can insert their own gigs"
  ON gigs
  FOR INSERT
  WITH CHECK (auth.uid()::text = dj_id::text);

-- Policy: DJs can update their own gigs
CREATE POLICY "DJs can update their own gigs"
  ON gigs
  FOR UPDATE
  USING (auth.uid()::text = dj_id::text);

-- Policy: DJs can delete their own gigs
CREATE POLICY "DJs can delete their own gigs"
  ON gigs
  FOR DELETE
  USING (auth.uid()::text = dj_id::text);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_gigs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_gigs_updated_at_trigger ON gigs;
CREATE TRIGGER update_gigs_updated_at_trigger
BEFORE UPDATE ON gigs
FOR EACH ROW
EXECUTE FUNCTION update_gigs_updated_at();

-- Create trigger to update user stats when gig is completed
CREATE OR REPLACE FUNCTION update_user_stats_on_gig_complete()
RETURNS TRIGGER AS $$
BEGIN
    -- When gig status changes to 'completed'
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        -- Increment gigs_completed
        UPDATE user_profiles
        SET gigs_completed = COALESCE(gigs_completed, 0) + 1
        WHERE id = NEW.dj_id;
        
        -- Update average rating if dj_rating is provided
        IF NEW.dj_rating IS NOT NULL THEN
            UPDATE user_profiles
            SET rating = (
                SELECT AVG(dj_rating)
                FROM gigs
                WHERE dj_id = NEW.dj_id 
                  AND status = 'completed'
                  AND dj_rating IS NOT NULL
            )
            WHERE id = NEW.dj_id;
        END IF;
        
        -- Set completed_at timestamp
        NEW.completed_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_stats_on_gig_complete_trigger ON gigs;
CREATE TRIGGER update_user_stats_on_gig_complete_trigger
BEFORE UPDATE ON gigs
FOR EACH ROW
EXECUTE FUNCTION update_user_stats_on_gig_complete();

-- Add comments for documentation
COMMENT ON TABLE gigs IS 'Tracks DJ performances and bookings';
COMMENT ON COLUMN gigs.dj_id IS 'Reference to user_profiles table';
COMMENT ON COLUMN gigs.opportunity_id IS 'Reference to opportunity that led to this gig (if applicable)';
COMMENT ON COLUMN gigs.status IS 'Current status of the gig';
COMMENT ON COLUMN gigs.dj_rating IS 'Rating given to DJ by venue/organizer (0.0 to 5.0)';
COMMENT ON COLUMN gigs.venue_rating IS 'Rating given to venue by DJ (0.0 to 5.0)';
COMMENT ON COLUMN gigs.payment_status IS 'Status of payment for the gig';

-- Sample data (optional - remove if you want to start fresh)
-- Uncomment to insert sample gigs
/*
INSERT INTO gigs (dj_id, name, venue, event_date, payment, status, dj_rating, genre) 
SELECT 
    id,
    'Soul Sessions #8',
    'Blue Note London',
    '2024-07-20',
    300.00,
    'completed',
    5.0,
    'Soul'
FROM user_profiles 
WHERE dj_name = 'Eloka Agu'
LIMIT 1;

INSERT INTO gigs (dj_id, name, venue, event_date, payment, status, dj_rating, genre) 
SELECT 
    id,
    'R&B Night',
    'Ronnie Scott''s',
    '2024-07-08',
    250.00,
    'completed',
    4.5,
    'R&B'
FROM user_profiles 
WHERE dj_name = 'Eloka Agu'
LIMIT 1;
*/

