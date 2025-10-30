-- Fix RLS Policy for messages table to only use thread_id
-- This removes the dependency on receiver_id which no longer exists in the schema

-- Drop old policy if it exists
DROP POLICY IF EXISTS "Users can send messages in their threads" ON messages;
DROP POLICY IF EXISTS "Users can insert messages" ON messages;

-- Create new policy that only checks thread participation
CREATE POLICY "Users can insert messages" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM message_threads mt
      WHERE mt.id = messages.thread_id
      AND (mt.user_id_1 = auth.uid() OR mt.user_id_2 = auth.uid())
    )
  );

-- Also ensure the view policy is correct
DROP POLICY IF EXISTS "Users can view messages in their threads" ON messages;
DROP POLICY IF EXISTS "Users can view thread messages" ON messages;

CREATE POLICY "Users can view thread messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM message_threads mt
      WHERE mt.id = messages.thread_id
      AND (mt.user_id_1 = auth.uid() OR mt.user_id_2 = auth.uid())
    )
  );

-- Success message
SELECT '✅ Message RLS policies updated to use only thread-based checks!' as status;

