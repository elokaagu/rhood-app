-- Create a placeholder opportunity for mock applications
-- Run this in your Supabase SQL editor

-- Insert a placeholder opportunity that can be referenced by mock applications
INSERT INTO opportunities (
  id,
  title,
  description,
  location,
  organizer_name,
  image_url,
  is_active,
  created_at,
  updated_at
) VALUES 
(
  '00000000-0000-0000-0000-000000000000',
  'Mock Opportunity Placeholder',
  'This is a placeholder opportunity for testing brief submissions from mock data.',
  'Test Location',
  'Test Organizer',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING; -- Don't insert if it already exists
