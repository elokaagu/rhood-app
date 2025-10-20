-- Comprehensive connection reset for testing
-- Run this in your Supabase SQL Editor

-- Step 1: Clear all connections
DELETE FROM connections;

-- Step 2: Clear connection-related notifications
DELETE FROM notifications WHERE type = 'connection_request';

-- Step 3: Clear any existing message threads (optional - only if you want to reset messaging too)
-- DELETE FROM message_threads;

-- Step 4: Clear any existing messages (optional - only if you want to reset messaging too)
-- DELETE FROM messages;

-- Step 5: Verify cleanup
SELECT 
  (SELECT COUNT(*) FROM connections) as connections_count,
  (SELECT COUNT(*) FROM notifications WHERE type = 'connection_request') as connection_notifications_count;

-- Step 6: Show current user profiles (so you know which users exist for testing)
SELECT 
  id,
  dj_name,
  full_name,
  first_name,
  last_name
FROM user_profiles 
ORDER BY created_at DESC 
LIMIT 10;

COMMENT ON TABLE connections IS 'All connections cleared for testing - ready for fresh connection flow testing';
