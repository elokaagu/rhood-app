-- Allow users who share an accepted connection to view each other's playlists
-- and the mixes in those playlists (same visibility as messaging a connection).
-- Run in Supabase SQL Editor after `create-playlists-table.sql`.

-- Playlists: connected users can SELECT each other's rows (private or public)
CREATE POLICY "Connected users can view each other's playlists"
  ON playlists
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM connections c
      WHERE
        LOWER(TRIM(COALESCE(c.status, ''))) IN ('accepted', 'approved', 'connected')
        AND (
          (c.user_id_1 = auth.uid() AND c.user_id_2 = playlists.user_id)
          OR (c.user_id_2 = auth.uid() AND c.user_id_1 = playlists.user_id)
        )
    )
  );

-- Playlist mixes: readable when the parent playlist belongs to someone you're connected with
CREATE POLICY "Connected users can view mixes in connected user's playlists"
  ON playlist_mixes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM playlists p
      WHERE
        p.id = playlist_mixes.playlist_id
        AND EXISTS (
          SELECT 1
          FROM connections c
          WHERE
            LOWER(TRIM(COALESCE(c.status, ''))) IN ('accepted', 'approved', 'connected')
            AND (
              (c.user_id_1 = auth.uid() AND c.user_id_2 = p.user_id)
              OR (c.user_id_2 = auth.uid() AND c.user_id_1 = p.user_id)
            )
        )
    )
  );
