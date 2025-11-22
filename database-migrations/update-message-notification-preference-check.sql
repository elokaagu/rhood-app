-- Update message notification trigger to check user preferences
-- Messages should only trigger notifications if user has opted in

-- First, create user_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE UNIQUE,
  notifications_enabled BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  message_notifications BOOLEAN DEFAULT false, -- Default to false (opt-in)
  connection_notifications BOOLEAN DEFAULT true,
  opportunity_notifications BOOLEAN DEFAULT true,
  privacy_level VARCHAR(20) DEFAULT 'public',
  location_sharing BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add message_notifications column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_settings' 
    AND column_name = 'message_notifications'
  ) THEN
    ALTER TABLE user_settings 
    ADD COLUMN message_notifications BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Update message notification trigger function
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
  receiver_id UUID;
  thread_record RECORD;
  message_notifications_enabled BOOLEAN;
  settings_exists BOOLEAN;
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
  
  -- Check if user_settings table exists and has the column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_settings' 
    AND column_name = 'message_notifications'
  ) INTO settings_exists;
  
  -- Check if receiver has message notifications enabled
  -- Default to false (opt-in) if table doesn't exist or record doesn't exist
  IF settings_exists THEN
    SELECT COALESCE(message_notifications, false) INTO message_notifications_enabled
    FROM user_settings
    WHERE user_id = receiver_id;
  ELSE
    -- If table doesn't exist, default to false (no notifications)
    message_notifications_enabled := false;
  END IF;
  
  -- Only create notification if user has opted in for message notifications
  IF message_notifications_enabled THEN
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
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger to ensure it uses the updated function
DROP TRIGGER IF EXISTS message_notification ON messages;
CREATE TRIGGER message_notification
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();

-- Update existing user_settings to have message_notifications default to false for existing users
-- Only run if table exists and has records
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_settings') THEN
    UPDATE user_settings
    SET message_notifications = COALESCE(message_notifications, false)
    WHERE message_notifications IS NULL;
  END IF;
END $$;

