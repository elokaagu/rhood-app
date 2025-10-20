-- Clear all existing connections to test connection flow
-- Run this in your Supabase SQL Editor

-- Delete all existing connections
DELETE FROM connections;

-- Reset any related data
-- Note: This will remove all connection requests and accepted connections

-- Verify the table is empty
SELECT COUNT(*) as connection_count FROM connections;

-- Optional: Reset any connection-related notifications
-- DELETE FROM notifications WHERE type = 'connection_request';

COMMENT ON TABLE connections IS 'Connections table cleared for testing - all connections removed';
