/**
 * Load playlists for a given profile user with mix counts (Supabase + RLS).
 * Used on another user's profile when the viewer is allowed to see those rows.
 */
import { supabase } from "./supabase";

const isMissingTableError = (error) =>
  error?.code === "42P01" || error?.code === "PGRST205";

export async function fetchPlaylistsForUser(profileUserId) {
  if (!profileUserId) return [];

  try {
    const { data, error } = await supabase
      .from("playlists")
      .select("*")
      .eq("user_id", profileUserId)
      .order("created_at", { ascending: false });

    if (error) {
      if (isMissingTableError(error)) return [];
      if (__DEV__) console.warn("fetchPlaylistsForUser:", error);
      return [];
    }

    const playlistsList = data || [];
    let mixCountByPlaylistId = {};
    if (playlistsList.length > 0) {
      const playlistIds = playlistsList.map((p) => p.id).filter(Boolean);
      try {
        const { data: mixRows, error: countError } = await supabase
          .from("playlist_mixes")
          .select("playlist_id")
          .in("playlist_id", playlistIds);

        if (!countError && Array.isArray(mixRows)) {
          mixCountByPlaylistId = mixRows.reduce((acc, row) => {
            if (row?.playlist_id) {
              acc[row.playlist_id] = (acc[row.playlist_id] || 0) + 1;
            }
            return acc;
          }, {});
        }
      } catch (err) {
        if (__DEV__) console.warn("fetchPlaylistsForUser mix counts:", err);
      }
    }

    return playlistsList.map((playlist) => ({
      ...playlist,
      mixCount: mixCountByPlaylistId[playlist.id] ?? 0,
    }));
  } catch (e) {
    if (__DEV__) console.warn("fetchPlaylistsForUser:", e);
    return [];
  }
}
