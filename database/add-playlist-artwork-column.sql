-- Add artwork/image column to playlists table
-- Run this in your Supabase SQL Editor

-- Add image_url column if it doesn't exist
ALTER TABLE playlists 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add index for better performance when querying playlists with images
CREATE INDEX IF NOT EXISTS idx_playlists_image_url ON playlists(image_url) WHERE image_url IS NOT NULL;

-- Success message
SELECT '✅ Added image_url column to playlists table!' as status;

