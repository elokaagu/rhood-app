-- Add metadata column to messages table for structured data (e.g., opportunity cards)
-- Run this in your Supabase SQL Editor

-- Add metadata column if it doesn't exist
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add index for metadata queries (optional but recommended for performance)
CREATE INDEX IF NOT EXISTS idx_messages_metadata ON messages USING GIN(metadata) WHERE metadata IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN messages.metadata IS 'Structured data for special message types (e.g., opportunity cards, rich content)';


