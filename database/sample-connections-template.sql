-- Sample connections script - REPLACE THE UUIDs BELOW WITH YOUR ACTUAL USER IDs
-- First run: SELECT id, dj_name, city FROM user_profiles LIMIT 5;

-- Replace these placeholder UUIDs with actual user IDs from your user_profiles table:
INSERT INTO connections (follower_id, following_id)
VALUES
    -- Example: User A follows User B
    ('REPLACE_WITH_USER_ID_1', 'REPLACE_WITH_USER_ID_2'),
    -- Example: User B follows User A  
    ('REPLACE_WITH_USER_ID_2', 'REPLACE_WITH_USER_ID_1'),
    -- Example: User A follows User C
    ('REPLACE_WITH_USER_ID_1', 'REPLACE_WITH_USER_ID_3'),
    -- Example: User C follows User A
    ('REPLACE_WITH_USER_ID_3', 'REPLACE_WITH_USER_ID_1'),
    -- Example: User B follows User C
    ('REPLACE_WITH_USER_ID_2', 'REPLACE_WITH_USER_ID_3')
ON CONFLICT (follower_id, following_id) DO NOTHING;

-- After running this, check your connections:
-- SELECT * FROM connections;
