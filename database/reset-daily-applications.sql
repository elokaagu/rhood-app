-- Reset user's daily application count to 5
-- Run this in your Supabase SQL editor

-- WARNING: This will delete ALL applications made by the user TODAY
-- Make sure to replace 'your-user-uuid-here' with the actual user UUID

-- Delete applications made today by the user
DELETE FROM applications 
WHERE user_id = 'your-user-uuid-here'
  AND DATE(created_at) = CURRENT_DATE;

-- Verify the reset worked by checking the daily application stats
SELECT * FROM get_user_daily_application_stats('your-user-uuid-here');

-- Alternative: If you want to reset for ALL users (use with caution)
-- DELETE FROM applications WHERE DATE(created_at) = CURRENT_DATE;
