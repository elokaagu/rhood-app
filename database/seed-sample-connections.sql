-- Create sample connections between existing users
-- IMPORTANT: Replace the placeholder UUIDs below with actual user IDs
-- from your 'user_profiles' table. You can get them by running:
-- SELECT id, dj_name, city FROM user_profiles LIMIT 10;

-- Example connections (replace with your actual user IDs):
INSERT INTO connections (follower_id, following_id)
VALUES
    -- User 1 follows User 2
    ('YOUR_USER_ID_1', 'YOUR_USER_ID_2'),
    -- User 1 follows User 3
    ('YOUR_USER_ID_1', 'YOUR_USER_ID_3'),
    -- User 2 follows User 1
    ('YOUR_USER_ID_2', 'YOUR_USER_ID_1'),
    -- User 3 follows User 1
    ('YOUR_USER_ID_3', 'YOUR_USER_ID_1'),
    -- User 4 follows User 5
    ('YOUR_USER_ID_4', 'YOUR_USER_ID_5'),
    -- User 5 follows User 4
    ('YOUR_USER_ID_5', 'YOUR_USER_ID_4'),
    -- User 2 follows User 4
    ('YOUR_USER_ID_2', 'YOUR_USER_ID_4'),
    -- User 3 follows User 5
    ('YOUR_USER_ID_3', 'YOUR_USER_ID_5')
ON CONFLICT (follower_id, following_id) DO NOTHING; -- Prevents duplicate connections

-- You can add more connections as needed.
