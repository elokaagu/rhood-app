-- Create connections/network table for DJ connections
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- The two users in the connection
  user_id_1 UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  user_id_2 UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  -- Connection status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  
  -- Who initiated the connectionsetup conne tions
  initiated_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  
  -- Ensure no duplicate connections and no self-connections
  CHECK (user_id_1 < user_id_2), -- Ensures consistent ordering
  UNIQUE(user_id_1, user_id_2)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_connections_user_id_1 ON connections(user_id_1);
CREATE INDEX IF NOT EXISTS idx_connections_user_id_2 ON connections(user_id_2);
CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);
CREATE INDEX IF NOT EXISTS idx_connections_initiated_by ON connections(initiated_by);

-- Enable Row Level Security
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own connections
CREATE POLICY "Users can view their own connections"
  ON connections
  FOR SELECT
  USING (
    auth.uid()::text = user_id_1::text OR 
    auth.uid()::text = user_id_2::text
  );

-- Policy: Users can create connections
CREATE POLICY "Users can create connections"
  ON connections
  FOR INSERT
  WITH CHECK (
    auth.uid()::text = initiated_by::text AND
    (auth.uid()::text = user_id_1::text OR auth.uid()::text = user_id_2::text)
  );

-- Policy: Users can update their connections (accept/block)
CREATE POLICY "Users can update their connections"
  ON connections
  FOR UPDATE
  USING (
    auth.uid()::text = user_id_1::text OR 
    auth.uid()::text = user_id_2::text
  );

-- Policy: Users can delete their connections
CREATE POLICY "Users can delete their connections"
  ON connections
  FOR DELETE
  USING (
    auth.uid()::text = user_id_1::text OR 
    auth.uid()::text = user_id_2::text
  );

-- Function to normalize connection user IDs (always user_id_1 < user_id_2)
CREATE OR REPLACE FUNCTION normalize_connection_user_ids()
RETURNS TRIGGER AS $$
BEGIN
  -- Swap IDs if needed to maintain user_id_1 < user_id_2
  IF NEW.user_id_1 > NEW.user_id_2 THEN
    DECLARE
      temp_id UUID;
    BEGIN
      temp_id := NEW.user_id_1;
      NEW.user_id_1 := NEW.user_id_2;
      NEW.user_id_2 := temp_id;
    END;
  END IF;
  
  -- Prevent self-connections
  IF NEW.user_id_1 = NEW.user_id_2 THEN
    RAISE EXCEPTION 'Cannot create connection with yourself';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to normalize connection IDs before insert
DROP TRIGGER IF EXISTS normalize_connection_trigger ON connections;
CREATE TRIGGER normalize_connection_trigger
BEFORE INSERT ON connections
FOR EACH ROW
EXECUTE FUNCTION normalize_connection_user_ids();

-- Function to update accepted_at timestamp
CREATE OR REPLACE FUNCTION update_connection_accepted_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    NEW.accepted_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set accepted_at
DROP TRIGGER IF EXISTS update_connection_accepted_at_trigger ON connections;
CREATE TRIGGER update_connection_accepted_at_trigger
BEFORE UPDATE ON connections
FOR EACH ROW
EXECUTE FUNCTION update_connection_accepted_at();

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_connections_updated_at_trigger ON connections;
CREATE TRIGGER update_connections_updated_at_trigger
BEFORE UPDATE ON connections
FOR EACH ROW
EXECUTE FUNCTION update_connections_updated_at();

-- Helper function to get all connections for a user
CREATE OR REPLACE FUNCTION get_user_connections(p_user_id UUID, p_status VARCHAR DEFAULT 'accepted')
RETURNS TABLE (
  connection_id UUID,
  connected_user_id UUID,
  connected_user_name VARCHAR,
  connected_user_username VARCHAR,
  connected_user_city VARCHAR,
  connected_user_genres TEXT[],
  connected_user_image TEXT,
  connected_user_rating DECIMAL,
  connected_user_gigs INTEGER,
  connected_user_verified BOOLEAN,
  connection_status VARCHAR,
  connected_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as connection_id,
    CASE 
      WHEN c.user_id_1 = p_user_id THEN c.user_id_2
      ELSE c.user_id_1
    END as connected_user_id,
    up.dj_name as connected_user_name,
    up.username as connected_user_username,
    up.city as connected_user_city,
    up.genres as connected_user_genres,
    up.profile_image_url as connected_user_image,
    up.rating as connected_user_rating,
    up.gigs_completed as connected_user_gigs,
    up.is_verified as connected_user_verified,
    c.status as connection_status,
    c.accepted_at as connected_at
  FROM connections c
  JOIN user_profiles up ON (
    CASE 
      WHEN c.user_id_1 = p_user_id THEN up.id = c.user_id_2
      ELSE up.id = c.user_id_1
    END
  )
  WHERE 
    (c.user_id_1 = p_user_id OR c.user_id_2 = p_user_id)
    AND (p_status IS NULL OR c.status = p_status)
  ORDER BY c.accepted_at DESC NULLS LAST, c.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON TABLE connections IS 'Stores connections/network relationships between DJs';
COMMENT ON COLUMN connections.status IS 'Status of connection: pending (awaiting acceptance), accepted (active connection), blocked';
COMMENT ON COLUMN connections.initiated_by IS 'User who sent the connection request';
COMMENT ON FUNCTION get_user_connections IS 'Helper function to get all connections for a user with their profile details';

