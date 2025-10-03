-- Test different status values to see which ones work
-- Run this in your Supabase SQL Editor

-- Test inserting with different status values
-- This will help us find what values are actually allowed

-- Test 1: Try with 'pending' (the default)
INSERT INTO mixes (title, artist, genre, file_url, file_name, file_size, uploaded_by, user_id)
VALUES ('Test Mix 1', 'Test Artist', 'Electronic', 'http://test.com/mix1.mp3', 'test1.mp3', 1000, '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000')
RETURNING id, status;

-- If that works, clean up and try others
-- DELETE FROM mixes WHERE title = 'Test Mix 1';

-- Test 2: Try with 'approved'
-- INSERT INTO mixes (title, artist, genre, file_url, file_name, file_size, uploaded_by, user_id, status)
-- VALUES ('Test Mix 2', 'Test Artist', 'Electronic', 'http://test.com/mix2.mp3', 'test2.mp3', 1000, '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'approved')
-- RETURNING id, status;

-- Test 3: Try with 'active'
-- INSERT INTO mixes (title, artist, genre, file_url, file_name, file_size, uploaded_by, user_id, status)
-- VALUES ('Test Mix 3', 'Test Artist', 'Electronic', 'http://test.com/mix3.mp3', 'test3.mp3', 1000, '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'active')
-- RETURNING id, status;

-- Clean up test data
-- DELETE FROM mixes WHERE title LIKE 'Test Mix%';
