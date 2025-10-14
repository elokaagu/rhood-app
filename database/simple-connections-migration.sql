-- Simplified Connections Schema Update
-- Run this in your Supabase SQL Editor

-- 1. First, let's check what columns exist in the current connections table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'connections' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Drop the old connections table if it exists (this will remove any existing data)
DROP TABLE IF EXISTS connections CASCADE;

-- 3. Create the new connections table with proper schema
CREATE TABLE connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- The two users in the connection
  user_id_1 UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  user_id_2 UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  -- Connection status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  
  -- Who initiated the connection
  initiated_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  
  -- Ensure no duplicate connections and no self-connections
  CHECK (user_id_1 < user_id_2), -- Ensures consistent ordering
  UNIQUE(user_id_1, user_id_2)
);

-- 4. Create indexes for better performance
CREATE INDEX idx_connections_user_id_1 ON connections(user_id_1);
CREATE INDEX idx_connections_user_id_2 ON connections(user_id_2);
CREATE INDEX idx_connections_status ON connections(status);
CREATE INDEX idx_connections_initiated_by ON connections(initiated_by);

-- 5. Enable Row Level Security
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

-- 6. Create comprehensive RLS policies
CREATE POLICY "Users can view their own connections"
  ON connections FOR SELECT
  USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

CREATE POLICY "Users can create connections"
  ON connections FOR INSERT
  WITH CHECK (auth.uid() = initiated_by);

CREATE POLICY "Users can update their connections"
  ON connections FOR UPDATE
  USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2)
  WITH CHECK (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

CREATE POLICY "Users can delete their connections"
  ON connections FOR DELETE
  USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- 7. Grant permissions
GRANT ALL ON connections TO authenticated;

-- 8. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE connections;

-- 9. Create helper function to get user connections
CREATE OR REPLACE FUNCTION get_user_connections(user_uuid UUID)
RETURNS TABLE (
  connected_user_id UUID,
  connected_user_name TEXT,
  connected_user_image TEXT,
  connection_status TEXT,
  initiated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN c.user_id_1 = user_uuid THEN c.user_id_2
      ELSE c.user_id_1
    END as connected_user_id,
    CASE 
      WHEN c.user_id_1 = user_uuid THEN up2.dj_name
      ELSE up1.dj_name
    END as connected_user_name,
    CASE 
      WHEN c.user_id_1 = user_uuid THEN up2.profile_image_url
      ELSE up1.profile_image_url
    END as connected_user_image,
    c.status as connection_status,
    c.initiated_by,
    c.created_at,
    c.accepted_at
  FROM connections c
  LEFT JOIN user_profiles up1 ON c.user_id_1 = up1.id
  LEFT JOIN user_profiles up2 ON c.user_id_2 = up2.id
  WHERE c.user_id_1 = user_uuid OR c.user_id_2 = user_uuid
  ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create function to create connection requests
CREATE OR REPLACE FUNCTION create_connection_request(
  target_user_id UUID,
  requester_user_id UUID DEFAULT auth.uid()
)
RETURNS UUID AS $$
DECLARE
  connection_id UUID;
  user_id_1 UUID;
  user_id_2 UUID;
BEGIN
  -- Ensure consistent ordering
  IF requester_user_id < target_user_id THEN
    user_id_1 := requester_user_id;
    user_id_2 := target_user_id;
  ELSE
    user_id_1 := target_user_id;
    user_id_2 := requester_user_id;
  END IF;
  
  -- Check if connection already exists
  SELECT id INTO connection_id
  FROM connections
  WHERE user_id_1 = create_connection_request.user_id_1 
    AND user_id_2 = create_connection_request.user_id_2;
  
  IF connection_id IS NOT NULL THEN
    RETURN connection_id; -- Return existing connection
  END IF;
  
  -- Create new connection request
  INSERT INTO connections (user_id_1, user_id_2, status, initiated_by)
  VALUES (user_id_1, user_id_2, 'pending', requester_user_id)
  RETURNING id INTO connection_id;
  
  RETURN connection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create function to accept connection requests
CREATE OR REPLACE FUNCTION accept_connection_request(
  connection_id UUID,
  accepter_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
DECLARE
  connection_record RECORD;
BEGIN
  -- Get the connection record
  SELECT * INTO connection_record
  FROM connections
  WHERE id = connection_id
    AND (user_id_1 = accepter_user_id OR user_id_2 = accepter_user_id)
    AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Update the connection status
  UPDATE connections
  SET status = 'accepted',
      accepted_at = NOW(),
      updated_at = NOW()
  WHERE id = connection_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Add notification types for connections
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN ('opportunity', 'application', 'message', 'system', 'connection_request', 'connection_accepted'));

-- 13. Create notification triggers for connection events
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
  
  -- Create notification
  INSERT INTO notifications (user_id, title, message, type, related_id, is_read)
  VALUES (
    target_user_id,
    'New Connection Request',
    requester_name || ' wants to connect with you',
    'connection_request',
    NEW.id,
    false
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION notify_connection_accepted()
RETURNS TRIGGER AS $$
DECLARE
  accepter_user_id UUID;
  requester_name TEXT;
BEGIN
  -- Only trigger on status change to accepted
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    
    -- Determine who should receive the notification (the original requester)
    accepter_user_id := NEW.initiated_by;
    
    -- Get accepter's name
    SELECT dj_name INTO requester_name
    FROM user_profiles
    WHERE id = CASE 
      WHEN NEW.user_id_1 = NEW.initiated_by THEN NEW.user_id_2
      ELSE NEW.user_id_1
    END;
    
    -- Create notification for the original requester
    INSERT INTO notifications (user_id, title, message, type, related_id, is_read)
    VALUES (
      accepter_user_id,
      'Connection Accepted',
      requester_name || ' accepted your connection request',
      'connection_accepted',
      NEW.id,
      false
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 14. Create triggers
DROP TRIGGER IF EXISTS connection_request_notification ON connections;
CREATE TRIGGER connection_request_notification
  AFTER INSERT ON connections
  FOR EACH ROW
  EXECUTE FUNCTION notify_connection_request();

DROP TRIGGER IF EXISTS connection_accepted_notification ON connections;
CREATE TRIGGER connection_accepted_notification
  AFTER UPDATE ON connections
  FOR EACH ROW
  EXECUTE FUNCTION notify_connection_accepted();

-- 15. Create message notification trigger
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
BEGIN
  -- Get sender's name
  SELECT dj_name INTO sender_name
  FROM user_profiles
  WHERE id = NEW.sender_id;
  
  -- Create notification for receiver
  INSERT INTO notifications (user_id, title, message, type, related_id, is_read)
  VALUES (
    NEW.receiver_id,
    'New Message',
    sender_name || ': ' || LEFT(NEW.content, 50) || CASE WHEN LENGTH(NEW.content) > 50 THEN '...' ELSE '' END,
    'message',
    NEW.id,
    false
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 16. Create message notification trigger
DROP TRIGGER IF EXISTS message_notification ON messages;
CREATE TRIGGER message_notification
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();

-- 17. Create function to get unread notification counts
CREATE OR REPLACE FUNCTION get_unread_notification_count(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM notifications
    WHERE user_id = user_uuid AND is_read = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 18. Create function to get unread message count
CREATE OR REPLACE FUNCTION get_unread_message_count(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM messages
    WHERE receiver_id = user_uuid AND is_read = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
SELECT 'Connections schema updated successfully! New features: connection requests, notifications, and proper status tracking.' as result;
