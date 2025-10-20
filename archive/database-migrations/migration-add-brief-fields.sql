-- Migration to add brief fields to applications table
-- Run this in your Supabase SQL editor

-- Add brief-related columns to applications table
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS brief_data JSONB,
ADD COLUMN IF NOT EXISTS experience TEXT,
ADD COLUMN IF NOT EXISTS availability TEXT,
ADD COLUMN IF NOT EXISTS equipment TEXT,
ADD COLUMN IF NOT EXISTS rate VARCHAR(50),
ADD COLUMN IF NOT EXISTS portfolio TEXT,
ADD COLUMN IF NOT EXISTS brief_submitted_at TIMESTAMP WITH TIME ZONE;

-- Add index for brief queries
CREATE INDEX IF NOT EXISTS idx_applications_brief_data ON applications USING GIN (brief_data);
CREATE INDEX IF NOT EXISTS idx_applications_brief_submitted ON applications(brief_submitted_at);

-- Update existing applications to have brief_submitted_at = created_at
UPDATE applications 
SET brief_submitted_at = created_at 
WHERE brief_submitted_at IS NULL AND message IS NOT NULL;

-- Add comment to explain the brief_data JSONB field
COMMENT ON COLUMN applications.brief_data IS 'Structured brief data including experience, availability, equipment, rate, portfolio, and message';
COMMENT ON COLUMN applications.experience IS 'DJ experience and background';
COMMENT ON COLUMN applications.availability IS 'Availability for the event';
COMMENT ON COLUMN applications.equipment IS 'Equipment and setup requirements';
COMMENT ON COLUMN applications.rate IS 'Rate/payment expectations';
COMMENT ON COLUMN applications.portfolio IS 'Portfolio links (SoundCloud, Mixcloud, etc.)';
COMMENT ON COLUMN applications.brief_submitted_at IS 'When the brief was submitted';
