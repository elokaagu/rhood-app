-- Manually accept a connection for testing
-- Run this in your Supabase SQL Editor

-- First, let's see the current connections
SELECT 
  id,
  user_id_1,
  user_id_2,
  status,
  initiated_by,
  created_at,
  accepted_at
FROM connections 
ORDER BY created_at DESC;

-- Accept the connection between the two users
-- Replace the connection_id with the actual ID from the query above
UPDATE connections 
SET 
  status = 'accepted',
  accepted_at = NOW(),
  updated_at = NOW()
WHERE id = (
  SELECT id 
  FROM connections 
  WHERE user_id_1 = '64ee29a2-dfd1-4c0a-824a-81b15398ff32'::UUID 
    AND user_id_2 = 'dfee6a12-a337-46f9-8bf0-307b4262f60f'::UUID
    AND status = 'pending'
  LIMIT 1
);

-- Verify the update
SELECT 
  id,
  user_id_1,
  user_id_2,
  status,
  initiated_by,
  created_at,
  accepted_at
FROM connections 
WHERE user_id_1 = '64ee29a2-dfd1-4c0a-824a-81b15398ff32'::UUID 
  AND user_id_2 = 'dfee6a12-a337-46f9-8bf0-307b4262f60f'::UUID;

COMMENT ON TABLE connections IS 'Connection manually accepted for testing real-time updates';
