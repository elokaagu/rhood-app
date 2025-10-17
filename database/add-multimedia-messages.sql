-- Add multimedia support to messages table
-- Run this in your Supabase SQL Editor

-- 1. Add multimedia columns to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'file', 'document')),
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS media_filename TEXT,
ADD COLUMN IF NOT EXISTS media_size BIGINT,
ADD COLUMN IF NOT EXISTS media_mime_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS file_extension VARCHAR(10);

-- 2. Add multimedia columns to community_posts table (for group chats)
ALTER TABLE community_posts 
ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'file', 'document')),
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS media_filename TEXT,
ADD COLUMN IF NOT EXISTS media_size BIGINT,
ADD COLUMN IF NOT EXISTS media_mime_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS file_extension VARCHAR(10);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_media_url ON messages(media_url);
CREATE INDEX IF NOT EXISTS idx_community_posts_type ON community_posts(message_type);
CREATE INDEX IF NOT EXISTS idx_community_posts_media_url ON community_posts(media_url);

-- 4. Add comments for documentation
COMMENT ON COLUMN messages.message_type IS 'Type of message: text, image, video, audio, file, document';
COMMENT ON COLUMN messages.media_url IS 'URL to the media file in Supabase storage';
COMMENT ON COLUMN messages.media_filename IS 'Original filename of the uploaded media';
COMMENT ON COLUMN messages.media_size IS 'Size of the media file in bytes';
COMMENT ON COLUMN messages.media_mime_type IS 'MIME type of the media file';
COMMENT ON COLUMN messages.thumbnail_url IS 'URL to thumbnail/preview image for videos and documents';
COMMENT ON COLUMN messages.file_extension IS 'File extension for documents and files';

COMMENT ON COLUMN community_posts.message_type IS 'Type of message: text, image, video, audio, file, document';
COMMENT ON COLUMN community_posts.media_url IS 'URL to the media file in Supabase storage';
COMMENT ON COLUMN community_posts.media_filename IS 'Original filename of the uploaded media';
COMMENT ON COLUMN community_posts.media_size IS 'Size of the media file in bytes';
COMMENT ON COLUMN community_posts.media_mime_type IS 'MIME type of the media file';
COMMENT ON COLUMN community_posts.thumbnail_url IS 'URL to thumbnail/preview image for videos and documents';
COMMENT ON COLUMN community_posts.file_extension IS 'File extension for documents and files';

-- 5. Create storage bucket for message media if it doesn't exist
-- Note: This will be handled by the app code, but documenting here for reference
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('message-media', 'message-media', true)
-- ON CONFLICT (id) DO NOTHING;

-- 6. Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND column_name IN ('message_type', 'media_url', 'media_filename', 'media_size', 'media_mime_type', 'thumbnail_url', 'file_extension')
ORDER BY ordinal_position;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'community_posts' 
AND column_name IN ('message_type', 'media_url', 'media_filename', 'media_size', 'media_mime_type', 'thumbnail_url', 'file_extension')
ORDER BY ordinal_position;
