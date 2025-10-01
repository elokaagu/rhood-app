-- Test query to fetch mixes and user profiles
-- This mimics what the app does (without joins)

-- Step 1: Fetch all mixes (no join)
SELECT * FROM mixes
ORDER BY created_at DESC;

-- Step 2: For each mix, fetch the user profile separately
-- Replace 'USER_ID_HERE' with an actual user_id from the mixes table
SELECT dj_name, first_name, last_name 
FROM user_profiles 
WHERE id = 'USER_ID_HERE';

-- Or get all user profiles to see what's available
SELECT id, dj_name, first_name, last_name, email
FROM user_profiles;

