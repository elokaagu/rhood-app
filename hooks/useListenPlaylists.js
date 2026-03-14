import { useState, useCallback } from "react";
import { Alert } from "react-native";
import { supabase } from "../lib/supabase";
import { HapticPatterns } from "../lib/haptics";

/**
 * Playlists and "Save to Playlist" modal state + handlers for Listen screen.
 * Parent should call fetchPlaylists() when user?.id is set (e.g. in a user effect).
 */
export function useListenPlaylists(user) {
  const [playlists, setPlaylists] = useState([]);
  const [showSaveToPlaylistModal, setShowSaveToPlaylistModal] = useState(false);
  const [selectedMixForPlaylist, setSelectedMixForPlaylist] = useState(null);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);

  const fetchPlaylists = useCallback(async () => {
    if (!user?.id) {
      setPlaylists([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("playlists")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        if (error.code === "42P01" || error.code === "PGRST205") {
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

      setPlaylists(playlistsWithCounts);
    } catch (error) {
      console.error("❌ Error fetching playlists:", error);
      setPlaylists([]);
    }
  }, [user?.id]);

  const handleSaveToPlaylist = useCallback((mix) => {
    if (!user?.id) {
      Alert.alert("Sign In Required", "You need to be signed in to save mixes to playlists.");
      return;
    }
    setSelectedMixForPlaylist(mix);
    setShowSaveToPlaylistModal(true);
    fetchPlaylists();
  }, [user?.id, fetchPlaylists]);

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
          return;
        }
        if (error.code === "42P01" || error.code === "PGRST205") {
          Alert.alert(
            "Database Setup Required",
            "The playlists feature requires database setup. Please contact support."
          );
          return;
        }
        throw error;
      }

      if (__DEV__) console.log("✅ Successfully added mix to playlist:", data);
      HapticPatterns.success();
    } catch (error) {
      console.error("❌ Error adding mix to playlist:", error);
      throw error;
    }
  }, []);

  const handleCreatePlaylist = useCallback(async () => {
    if (!newPlaylistName.trim()) {
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
          name: newPlaylistName.trim(),
          description: null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "42P01" || error.code === "PGRST205") {
          Alert.alert(
            "Database Setup Required",
            "The playlists feature requires database setup. Please contact support."
          );
          return;
        }
        throw error;
      }

      if (selectedMixForPlaylist?.id && data?.id) {
        await handleAddMixToPlaylist(data.id, selectedMixForPlaylist.id);
      }

      setNewPlaylistName("");
      setShowSaveToPlaylistModal(false);
      setSelectedMixForPlaylist(null);
      fetchPlaylists();
      HapticPatterns.success();
      Alert.alert("Success", `"${newPlaylistName.trim()}" created and mix added!`);
    } catch (error) {
      console.error("❌ Error creating playlist:", error);
      Alert.alert("Error", "Failed to create playlist. Please try again.");
    } finally {
      setCreatingPlaylist(false);
    }
  }, [newPlaylistName, user?.id, selectedMixForPlaylist, fetchPlaylists, handleAddMixToPlaylist]);

  const handleSelectPlaylist = useCallback(async (playlist) => {
    if (!selectedMixForPlaylist?.id) return;

    try {
      await handleAddMixToPlaylist(playlist.id, selectedMixForPlaylist.id);
      setShowSaveToPlaylistModal(false);
      setSelectedMixForPlaylist(null);
      fetchPlaylists();
      Alert.alert("Success", `Added to "${playlist.name}"`);
    } catch (error) {
      Alert.alert("Error", "Failed to add mix to playlist. Please try again.");
    }
  }, [selectedMixForPlaylist, handleAddMixToPlaylist, fetchPlaylists]);

  return {
    playlists,
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
