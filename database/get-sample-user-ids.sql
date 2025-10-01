-- Get existing user IDs from user_profiles table
-- Run this in your Supabase SQL editor to get user IDs for creating sample connections

SELECT id, dj_name, city
FROM user_profiles
LIMIT 10;
