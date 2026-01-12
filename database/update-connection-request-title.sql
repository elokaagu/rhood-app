-- Update connection request notification title to "Connection Request" instead of "New Connection Request"
-- This prevents title truncation in the notifications UI

-- Update the notify_connection_request function to use "Connection Request" as the title
CREATE OR REPLACE FUNCTION notify_connection_request()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id UUID;
  requester_name TEXT;
BEGIN
  -- Determine who should receive the notification
  IF NEW.user_id_1 = NEW.initiated_by THEN
    target_user_id := NEW.user_id_2;
  ELSE
    target_user_id := NEW.user_id_1;
  END IF;
  
  -- Get requester's name
  SELECT dj_name INTO requester_name
  FROM user_profiles
  WHERE id = NEW.initiated_by;
  
  -- Create notification with "Connection Request" (not "New Connection Request")
  INSERT INTO notifications (user_id, title, message, type, related_id, is_read)
  VALUES (
    target_user_id,
    'Connection Request',
    requester_name || ' wants to connect with you',
    'connection_request',
    NEW.id,
    false
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Optional: Update existing notifications in the database
-- Uncomment the following if you want to update existing notifications:
-- UPDATE notifications
-- SET title = 'Connection Request'
-- WHERE type = 'connection_request' AND title = 'New Connection Request';

SELECT '✅ Updated notify_connection_request function to use "Connection Request" title.' as status;

