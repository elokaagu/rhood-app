-- Simplified Connections Schema Update
-- Run this in your Supabase SQL Editor

-- 0. Ensure message_threads table has all required columns
DO $$ 
BEGIN
  -- Create message_threads table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'message_threads') THEN
    CREATE TABLE message_threads (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      type VARCHAR(20) NOT NULL DEFAULT 'individual',
      user_id_1 UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
      user_id_2 UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
      community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
      
      CONSTRAINT check_thread_type CHECK (
        (type = 'individual' AND user_id_1 IS NOT NULL AND user_id_2 IS NOT NULL AND community_id IS NULL) OR
        (type = 'group' AND community_id IS NOT NULL AND user_id_1 IS NULL AND user_id_2 IS NULL)
      )
    );
  END IF;
  
  -- Add type column if it doesn't exist (for existing tables)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'message_threads' AND column_name = 'type') THEN
    ALTER TABLE message_threads ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'individual';
  END IF;
  
  -- Add user_id_1 column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'message_threads' AND column_name = 'user_id_1') THEN
    ALTER TABLE message_threads ADD COLUMN user_id_1 UUID REFERENCES user_profiles(id) ON DELETE CASCADE;
  END IF;
  
  -- Add user_id_2 column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'message_threads' AND column_name = 'user_id_2') THEN
    ALTER TABLE message_threads ADD COLUMN user_id_2 UUID REFERENCES user_profiles(id) ON DELETE CASCADE;
  END IF;
  
  -- Add community_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'message_threads' AND column_name = 'community_id') THEN
    ALTER TABLE message_threads ADD COLUMN community_id UUID REFERENCES communities(id) ON DELETE CASCADE;
  END IF;
  
  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'message_threads' AND column_name = 'updated_at') THEN
    ALTER TABLE message_threads ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

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

-- 4. Create message_threads table (if not exists)
CREATE TABLE IF NOT EXISTS message_threads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(20) NOT NULL DEFAULT 'individual',
  user_id_1 UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  user_id_2 UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure we have either individual users or community, but not both
  CONSTRAINT check_thread_type CHECK (
    (type = 'individual' AND user_id_1 IS NOT NULL AND user_id_2 IS NOT NULL AND community_id IS NULL) OR
    (type = 'group' AND community_id IS NOT NULL AND user_id_1 IS NULL AND user_id_2 IS NULL)
  )
);

-- Add missing columns to existing message_threads table if they don't exist
DO $$ 
BEGIN
  -- Add type column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'message_threads' AND column_name = 'type') THEN
    ALTER TABLE message_threads ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'individual';
  END IF;
  
  -- Add user_id_1 column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'message_threads' AND column_name = 'user_id_1') THEN
    ALTER TABLE message_threads ADD COLUMN user_id_1 UUID REFERENCES user_profiles(id) ON DELETE CASCADE;
  END IF;
  
  -- Add user_id_2 column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'message_threads' AND column_name = 'user_id_2') THEN
    ALTER TABLE message_threads ADD COLUMN user_id_2 UUID REFERENCES user_profiles(id) ON DELETE CASCADE;
  END IF;
  
  -- Add community_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'message_threads' AND column_name = 'community_id') THEN
    ALTER TABLE message_threads ADD COLUMN community_id UUID REFERENCES communities(id) ON DELETE CASCADE;
  END IF;
  
  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'message_threads' AND column_name = 'updated_at') THEN
    ALTER TABLE message_threads ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Create unique constraint for individual threads (if not exists)
CREATE UNIQUE INDEX IF NOT EXISTS idx_message_threads_individual 
ON message_threads (LEAST(user_id_1, user_id_2), GREATEST(user_id_1, user_id_2)) 
WHERE type = 'individual';

-- 5. Create notifications table (if not exists)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  related_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_connections_user_id_1 ON connections(user_id_1);
CREATE INDEX IF NOT EXISTS idx_connections_user_id_2 ON connections(user_id_2);
CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);
CREATE INDEX IF NOT EXISTS idx_connections_initiated_by ON connections(initiated_by);
CREATE INDEX IF NOT EXISTS idx_message_threads_users ON message_threads(user_id_1, user_id_2);
CREATE INDEX IF NOT EXISTS idx_message_threads_community ON message_threads(community_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);

-- 7. Enable Row Level Security
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 8. Create comprehensive RLS policies
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

-- RLS policies for message_threads
DROP POLICY IF EXISTS "Users can view their own message threads" ON message_threads;
CREATE POLICY "Users can view their own message threads"
  ON message_threads FOR SELECT
  USING (
    auth.uid() = user_id_1 OR 
    auth.uid() = user_id_2 OR 
    auth.uid() IN (SELECT user_id FROM community_members WHERE community_id = message_threads.community_id)
  );

DROP POLICY IF EXISTS "Users can create message threads" ON message_threads;
CREATE POLICY "Users can create message threads"
  ON message_threads FOR INSERT
  WITH CHECK (
    (type = 'individual' AND (auth.uid() = user_id_1 OR auth.uid() = user_id_2)) OR
    (type = 'group' AND auth.uid() IN (SELECT user_id FROM community_members WHERE community_id = message_threads.community_id))
  );

DROP POLICY IF EXISTS "Users can update their message threads" ON message_threads;
CREATE POLICY "Users can update their message threads"
  ON message_threads FOR UPDATE
  USING (
    auth.uid() = user_id_1 OR 
    auth.uid() = user_id_2 OR 
    auth.uid() IN (SELECT user_id FROM community_members WHERE community_id = message_threads.community_id)
  );

-- RLS policies for notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can create notifications" ON notifications;
CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true); -- Allow system to create notifications

-- 9. Grant permissions
GRANT ALL ON connections TO authenticated;
GRANT ALL ON message_threads TO authenticated;
GRANT ALL ON notifications TO authenticated;

-- 10. Enable realtime (with safe checks)
DO $$ 
BEGIN
  -- Add tables to realtime publication if they're not already there
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables 
                 WHERE pubname = 'supabase_realtime' AND tablename = 'connections') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE connections;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables 
                 WHERE pubname = 'supabase_realtime' AND tablename = 'message_threads') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE message_threads;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables 
                 WHERE pubname = 'supabase_realtime' AND tablename = 'notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;

-- 11. Create helper function to get user connections
CREATE OR REPLACE FUNCTION get_user_connections(user_uuid UUID)
RETURNS TABLE (
  connected_user_id UUID,
  connected_user_name VARCHAR,
  connected_user_image VARCHAR,
  connection_status VARCHAR,
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
      WHEN c.user_id_1 = user_uuid THEN COALESCE(up2.dj_name, up2.full_name, 'Unknown User')
      ELSE COALESCE(up1.dj_name, up1.full_name, 'Unknown User')
    END::VARCHAR as connected_user_name,
    CASE 
      WHEN c.user_id_1 = user_uuid THEN up2.profile_image_url
      ELSE up1.profile_image_url
    END::VARCHAR as connected_user_image,
    c.status::VARCHAR as connection_status,
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
