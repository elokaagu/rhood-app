-- Migration to add profile data fields to applications table
-- Run this in your Supabase SQL editor

-- Add new columns to applications table for profile data and application metadata
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS profile_data JSONB,
ADD COLUMN IF NOT EXISTS applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS application_type VARCHAR(50) DEFAULT 'swipe_apply';

-- Add index for profile data queries (useful for R/HOOD Studio dashboard)
CREATE INDEX IF NOT EXISTS idx_applications_profile_data ON applications USING GIN(profile_data);

-- Add index for application type queries
CREATE INDEX IF NOT EXISTS idx_applications_type ON applications(application_type);

-- Add index for applied_at queries (useful for sorting applications by date)
CREATE INDEX IF NOT EXISTS idx_applications_applied_at ON applications(applied_at DESC);

-- Update existing applications to have the new default values
UPDATE applications 
SET 
  applied_at = created_at,
  application_type = 'legacy_form'
WHERE applied_at IS NULL;

-- Add comment explaining the new fields
COMMENT ON COLUMN applications.profile_data IS 'Complete user profile data sent with application for R/HOOD Studio dashboard';
COMMENT ON COLUMN applications.applied_at IS 'Timestamp when application was submitted';
COMMENT ON COLUMN applications.application_type IS 'Type of application: swipe_apply, legacy_form, etc.';
