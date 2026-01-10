-- Create playlists and playlist_mixes tables
-- Run this in your Supabase SQL Editor

-- Step 1: Create playlists table
CREATE TABLE IF NOT EXISTS playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create playlist_mixes table (junction table)
CREATE TABLE IF NOT EXISTS playlist_mixes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  mix_id UUID NOT NULL REFERENCES mixes(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0, -- Order within playlist
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(playlist_id, mix_id) -- Prevent duplicate mixes in same playlist
);

-- Step 3: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_playlists_created_at ON playlists(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_playlist_mixes_playlist_id ON playlist_mixes(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_mixes_mix_id ON playlist_mixes(mix_id);
CREATE INDEX IF NOT EXISTS idx_playlist_mixes_position ON playlist_mixes(playlist_id, position);

-- Step 4: Enable Row Level Security
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_mixes ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies for playlists
-- Users can view their own playlists and public playlists
CREATE POLICY "Users can view their own playlists and public playlists" ON playlists
  FOR SELECT USING (
    auth.uid() = user_id OR is_public = true
  );

-- Users can create their own playlists
CREATE POLICY "Users can create their own playlists" ON playlists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own playlists
CREATE POLICY "Users can update their own playlists" ON playlists
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own playlists
CREATE POLICY "Users can delete their own playlists" ON playlists
  FOR DELETE USING (auth.uid() = user_id);

-- Step 6: Create RLS policies for playlist_mixes
-- Users can view mixes in playlists they own or in public playlists
CREATE POLICY "Users can view mixes in accessible playlists" ON playlist_mixes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM playlists p
      WHERE p.id = playlist_mixes.playlist_id
      AND (p.user_id = auth.uid() OR p.is_public = true)
    )
  );

-- Users can add mixes to their own playlists
CREATE POLICY "Users can add mixes to their own playlists" ON playlist_mixes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM playlists p
      WHERE p.id = playlist_mixes.playlist_id
      AND p.user_id = auth.uid()
    )
  );

-- Users can update mixes in their own playlists
CREATE POLICY "Users can update mixes in their own playlists" ON playlist_mixes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM playlists p
      WHERE p.id = playlist_mixes.playlist_id
      AND p.user_id = auth.uid()
    )
  );

-- Users can remove mixes from their own playlists
CREATE POLICY "Users can remove mixes from their own playlists" ON playlist_mixes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM playlists p
      WHERE p.id = playlist_mixes.playlist_id
      AND p.user_id = auth.uid()
    )
  );

-- Step 7: Create updated_at trigger function (if it doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Add updated_at trigger to playlists
DROP TRIGGER IF EXISTS update_playlists_updated_at ON playlists;
CREATE TRIGGER update_playlists_updated_at
  BEFORE UPDATE ON playlists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 9: Grant permissions
GRANT ALL ON playlists TO authenticated;
GRANT ALL ON playlist_mixes TO authenticated;
GRANT SELECT ON playlists TO anon;
GRANT SELECT ON playlist_mixes TO anon;

-- Step 10: Verify tables created
SELECT '=== TABLES CREATED ===' as status;
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN ('playlists', 'playlist_mixes')
ORDER BY table_name;

-- Step 11: Show RLS policies
SELECT '=== RLS POLICIES ===' as status;
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('playlists', 'playlist_mixes')
ORDER BY tablename, policyname;

-- Success message
SELECT '✅ Playlists tables created successfully!' as status;
SELECT '✅ RLS policies configured' as note;
SELECT '✅ You can now create and manage playlists in the app' as note;

