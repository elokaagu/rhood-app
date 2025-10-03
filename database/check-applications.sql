-- Check applications in the database
-- Run this in your Supabase SQL Editor to verify brief submissions are stored correctly

-- Get all applications with brief data
SELECT 
  a.id,
  a.opportunity_id,
  a.user_id,
  a.status,
  a.message,
  a.experience,
  a.availability,
  a.equipment,
  a.rate,
  a.portfolio,
  a.brief_data,
  a.brief_submitted_at,
  a.created_at,
  o.title as opportunity_title,
  up.dj_name as applicant_name
FROM applications a
LEFT JOIN opportunities o ON a.opportunity_id = o.id
LEFT JOIN user_profiles up ON a.user_id = up.id
ORDER BY a.created_at DESC;

-- Check if brief fields exist in the applications table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'applications' 
AND column_name IN ('brief_data', 'experience', 'availability', 'equipment', 'rate', 'portfolio', 'brief_submitted_at')
ORDER BY column_name;

-- Count applications by status
SELECT 
  status,
  COUNT(*) as count,
  COUNT(CASE WHEN brief_data IS NOT NULL THEN 1 END) as with_brief_data,
  COUNT(CASE WHEN experience IS NOT NULL THEN 1 END) as with_experience,
  COUNT(CASE WHEN brief_submitted_at IS NOT NULL THEN 1 END) as with_brief_timestamp
FROM applications 
GROUP BY status
ORDER BY status;

-- Get recent applications with brief data
SELECT 
  a.id,
  o.title as opportunity,
  up.dj_name as applicant,
  a.experience,
  a.availability,
  a.equipment,
  a.rate,
  a.portfolio,
  a.brief_submitted_at
FROM applications a
JOIN opportunities o ON a.opportunity_id = o.id
JOIN user_profiles up ON a.user_id = up.id
WHERE a.brief_submitted_at IS NOT NULL
ORDER BY a.brief_submitted_at DESC
LIMIT 10;
