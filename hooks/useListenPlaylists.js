import { useState, useCallback } from "react";
import { Alert } from "react-native";
import { supabase } from "../lib/supabase";
import { HapticPatterns } from "../lib/haptics";
import { createScreenCache } from "../lib/screenCache";

const playlistsCache = createScreenCache("playlists", { userScoped: true });

/** Call after mutating playlists outside this hook (e.g. rename on detail screen) so Listen refetches. */
export function invalidateUserPlaylistsCache(userId) {
  if (userId) playlistsCache.invalidate(String(userId));
}

const isMissingTableError = (error) =>
  error?.code === "42P01" || error?.code === "PGRST205";

/**
 * Playlists and "Save to Playlist" modal state + handlers for Listen screen.
 * Parent should call fetchPlaylists() when user?.id is set (e.g. in a user effect).
 */
export function useListenPlaylists(user) {
  const [playlists, setPlaylists] = useState([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [playlistsError, setPlaylistsError] = useState(null);
  const [showSaveToPlaylistModal, setShowSaveToPlaylistModal] = useState(false);
  const [selectedMixForPlaylist, setSelectedMixForPlaylist] = useState(null);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);

  const closeSaveModal = useCallback(() => {
    setShowSaveToPlaylistModal(false);
    setSelectedMixForPlaylist(null);
  }, []);

  const syncPlaylistsState = useCallback((nextPlaylists) => {
    setPlaylists(nextPlaylists);
    if (user?.id) {
      playlistsCache.set(user.id, { playlists: nextPlaylists });
    }
  }, [user?.id]);

  const fetchPlaylists = useCallback(async () => {
    if (!user?.id) {
      setPlaylists([]);
      setPlaylistsError(null);
      return;
    }

    const cached = playlistsCache.getIfFresh(user.id);
    if (cached && Array.isArray(cached.playlists)) {
      setPlaylists(cached.playlists);
      setPlaylistsLoading(false);
      setPlaylistsError(null);
      return;
    }

    setPlaylistsLoading(true);
    setPlaylistsError(null);
    try {
      const { data, error } = await supabase
        .from("playlists")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        if (isMissingTableError(error)) {
          if (__DEV__) console.log("Playlists table doesn't exist yet");
          setPlaylists([]);
          return;
        }
        console.error("❌ Error fetching playlists:", error);
        setPlaylists([]);
        return;
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
              if (row?.playlist_id) acc[row.playlist_id] = (acc[row.playlist_id] || 0) + 1;
              return acc;
            }, {});
          }
        } catch (err) {
          if (__DEV__) console.warn("Error batch-fetching playlist mix counts:", err);
        }
      }

      const playlistsWithCounts = playlistsList.map((playlist) => ({
        ...playlist,
        mixCount: mixCountByPlaylistId[playlist.id] ?? 0,
      }));

      syncPlaylistsState(playlistsWithCounts);
      setPlaylistsError(null);
    } catch (error) {
      console.error("❌ Error fetching playlists:", error);
      setPlaylistsError(error?.message || "Failed to load playlists");
      setPlaylists([]);
    } finally {
      setPlaylistsLoading(false);
    }
  }, [user?.id, syncPlaylistsState]);

  const handleSaveToPlaylist = useCallback(
    async (mix) => {
      if (!user?.id) {
        Alert.alert("Sign In Required", "You need to be signed in to save mixes to playlists.");
        return;
      }
      setSelectedMixForPlaylist(mix);
      await fetchPlaylists();
      setNewPlaylistName((prev) => (prev?.trim() ? prev : "My first playlist"));
      setShowSaveToPlaylistModal(true);
    },
    [user?.id, fetchPlaylists]
  );

  /**
   * @returns {Promise<{ ok: boolean; duplicate?: boolean }>}
   */
  const handleAddMixToPlaylist = useCallback(async (playlistId, mixId) => {
    try {
      if (__DEV__) console.log("📝 Adding mix to playlist:", { playlistId, mixId });
      const { data, error } = await supabase
        .from("playlist_mixes")
        .insert({
          playlist_id: playlistId,
          mix_id: mixId,
        })
        .select();

      if (error) {
        if (error.code === "23505") {
          if (__DEV__) console.log("✅ Mix already in playlist");
          return { ok: true, duplicate: true };
        }
        if (isMissingTableError(error)) {
          Alert.alert(
            "Database Setup Required",
            "The playlists feature requires database setup. Please contact support."
          );
          return { ok: false };
        }
        throw error;
      }

      if (__DEV__) console.log("✅ Successfully added mix to playlist:", data);
      HapticPatterns.success();
      return { ok: true, duplicate: false };
    } catch (error) {
      console.error("❌ Error adding mix to playlist:", error);
      throw error;
    }
  }, []);

  const handleCreatePlaylist = useCallback(async () => {
    const playlistName = newPlaylistName.trim();
    if (!playlistName) {
      Alert.alert("Error", "Please enter a playlist name");
      return;
    }

    if (!user?.id) {
      Alert.alert("Error", "You must be signed in to create playlists");
      return;
    }

    try {
      setCreatingPlaylist(true);
      const { data, error } = await supabase
        .from("playlists")
        .insert({
          user_id: user.id,
          name: playlistName,
          description: null,
        })
        .select()
        .single();

      if (error) {
        if (isMissingTableError(error)) {
          Alert.alert(
            "Database Setup Required",
            "The playlists feature requires database setup. Please contact support."
          );
          return;
        }
        throw error;
      }

      let addResult = { ok: true, duplicate: false };
      if (selectedMixForPlaylist?.id && data?.id) {
        addResult = await handleAddMixToPlaylist(data.id, selectedMixForPlaylist.id);
        if (!addResult.ok) {
          return;
        }
      }

      const mixCount =
        selectedMixForPlaylist?.id && !addResult.duplicate ? 1 : 0;
      const newEntry = {
        ...data,
        mixCount,
      };

      setNewPlaylistName("");
      closeSaveModal();

      setPlaylists((prev) => {
        const next = [newEntry, ...prev.filter((p) => p.id !== newEntry.id)];
        if (user?.id) {
          playlistsCache.set(user.id, { playlists: next });
        }
        return next;
      });

      fetchPlaylists();
      if (!selectedMixForPlaylist?.id) {
        HapticPatterns.success();
      }
      Alert.alert(
        "Success",
        selectedMixForPlaylist?.id
          ? `"${playlistName}" created and mix added!`
          : `"${playlistName}" created!`
      );
    } catch (error) {
      console.error("❌ Error creating playlist:", error);
      Alert.alert("Error", "Failed to create playlist. Please try again.");
    } finally {
      setCreatingPlaylist(false);
    }
  }, [
    newPlaylistName,
    user?.id,
    selectedMixForPlaylist,
    fetchPlaylists,
    handleAddMixToPlaylist,
    closeSaveModal,
  ]);

  const handleSelectPlaylist = useCallback(
    async (playlist) => {
      if (!selectedMixForPlaylist?.id) return;

      try {
        const res = await handleAddMixToPlaylist(playlist.id, selectedMixForPlaylist.id);
        if (!res?.ok) return;

        closeSaveModal();

        if (!res.duplicate) {
          setPlaylists((prev) => {
            const next = prev.map((p) =>
              p.id === playlist.id
                ? { ...p, mixCount: (p.mixCount ?? 0) + 1 }
                : p
            );
            if (user?.id) {
              playlistsCache.set(user.id, { playlists: next });
            }
            return next;
          });
        }

        fetchPlaylists();
        Alert.alert(
          "Success",
          res.duplicate
            ? `Already in "${playlist.name}"`
            : `Added to "${playlist.name}"`
        );
      } catch (error) {
        Alert.alert("Error", "Failed to add mix to playlist. Please try again.");
      }
    },
    [selectedMixForPlaylist, handleAddMixToPlaylist, fetchPlaylists, closeSaveModal, user?.id]
  );

  return {
    playlists,
    playlistsLoading,
    playlistsError,
    fetchPlaylists,
    showSaveToPlaylistModal,
    setShowSaveToPlaylistModal,
    selectedMixForPlaylist,
    setSelectedMixForPlaylist,
    newPlaylistName,
    setNewPlaylistName,
    creatingPlaylist,
    handleSaveToPlaylist,
    handleCreatePlaylist,
    handleAddMixToPlaylist,
    handleSelectPlaylist,
  };
}
