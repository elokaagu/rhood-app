-- Create table for storing DJ mixes
CREATE TABLE IF NOT EXISTS mixes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  genre VARCHAR(100),
  duration INTEGER, -- Duration in seconds
  file_url TEXT NOT NULL, -- Supabase storage URL
  file_size BIGINT, -- File size in bytes
  artwork_url TEXT, -- Optional cover art
  play_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_mixes_user_id ON mixes(user_id);
CREATE INDEX IF NOT EXISTS idx_mixes_created_at ON mixes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mixes_genre ON mixes(genre);
CREATE INDEX IF NOT EXISTS idx_mixes_is_public ON mixes(is_public);

-- Add comments for documentation
COMMENT ON TABLE mixes IS 'Stores DJ mixes uploaded by users';
COMMENT ON COLUMN mixes.user_id IS 'Reference to user_profiles table';
COMMENT ON COLUMN mixes.file_url IS 'URL to audio file in Supabase storage';
COMMENT ON COLUMN mixes.duration IS 'Duration in seconds';
COMMENT ON COLUMN mixes.play_count IS 'Number of times the mix has been played';
COMMENT ON COLUMN mixes.is_public IS 'Whether the mix is visible to other users';

-- Enable Row Level Security
ALTER TABLE mixes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own mixes and public mixes
CREATE POLICY "Users can view their own mixes and public mixes"
  ON mixes
  FOR SELECT
  USING (
    auth.uid() = user_id OR is_public = true
  );

-- Policy: Users can insert their own mixes
CREATE POLICY "Users can insert their own mixes"
  ON mixes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own mixes
CREATE POLICY "Users can update their own mixes"
  ON mixes
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own mixes
CREATE POLICY "Users can delete their own mixes"
  ON mixes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_mixes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER mixes_updated_at_trigger
  BEFORE UPDATE ON mixes
  FOR EACH ROW
  EXECUTE FUNCTION update_mixes_updated_at();
