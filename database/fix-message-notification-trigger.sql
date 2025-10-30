-- Fix message notification trigger to work with thread-based messaging
-- This updates the notify_new_message function to get receiver from thread_id

CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
  receiver_id UUID;
  thread_record RECORD;
BEGIN
  -- Get sender's name
  SELECT dj_name INTO sender_name
  FROM user_profiles
  WHERE id = NEW.sender_id;
  
  -- Get thread info to determine receiver
  SELECT user_id_1, user_id_2 INTO thread_record
  FROM message_threads
  WHERE id = NEW.thread_id;
  
  -- Determine receiver (the other participant)
  IF thread_record.user_id_1 = NEW.sender_id THEN
    receiver_id := thread_record.user_id_2;
  ELSE
    receiver_id := thread_record.user_id_1;
  END IF;
  
  -- Create notification for receiver
  INSERT INTO notifications (user_id, title, message, type, related_id, is_read)
  VALUES (
    receiver_id,
    'New Message',
    sender_name || ': ' || LEFT(NEW.content, 50) || CASE WHEN LENGTH(NEW.content) > 50 THEN '...' ELSE '' END,
    'message',
    NEW.id,
    false
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger to ensure it uses the updated function
DROP TRIGGER IF EXISTS message_notification ON messages;
CREATE TRIGGER message_notification
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();

