-- Test query to fetch mixes and user profiles
-- This mimics what the app does (without joins)

-- Step 1: Fetch all mixes (no join)
SELECT * FROM mixes
ORDER BY created_at DESC;

-- Step 2: Get all user profiles to see what's available
SELECT id, dj_name, first_name, last_name, email
FROM user_profiles;

-- Step 3: Fetch a specific user profile by ID
-- First, get a user_id from the mixes table, then run this:
-- SELECT dj_name, first_name, last_name 
-- FROM user_profiles 
-- WHERE id = (SELECT user_id FROM mixes LIMIT 1);


