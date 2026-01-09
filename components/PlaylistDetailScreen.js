import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  RefreshControl,
  Platform,
  ActionSheetIOS,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { HapticPatterns } from "../lib/haptics";
import ProgressiveImage from "./ProgressiveImage";

export default function PlaylistDetailScreen({
  globalAudioState,
  onPlayAudio,
  onPauseAudio,
  onBack,
  user,
  onAddToQueue,
  onPlayNext,
  playlistId,
  playlistName,
}) {
  const insets = useSafeAreaInsets();
  const [mixes, setMixes] = useState([]);
  const [playingMixId, setPlayingMixId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch mixes in playlist
  const fetchPlaylistMixes = useCallback(async () => {
    if (!playlistId || !user?.id) {
      setMixes([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // First, get the playlist to verify ownership
      const { data: playlistData, error: playlistError } = await supabase
        .from("playlists")
        .select("*")
        .eq("id", playlistId)
        .eq("user_id", user.id)
        .single();

      if (playlistError || !playlistData) {
        console.error("❌ Error fetching playlist:", playlistError);
        setMixes([]);
        setLoading(false);
        return;
      }

      // Get mix IDs from playlist_mixes
      const { data: playlistMixesData, error: playlistMixesError } = await supabase
        .from("playlist_mixes")
        .select("mix_id")
        .eq("playlist_id", playlistId)
        .order("created_at", { ascending: true });

      if (playlistMixesError) {
        console.error("❌ Error fetching playlist mixes:", playlistMixesError);
        setMixes([]);
        setLoading(false);
        return;
      }

      if (!playlistMixesData || playlistMixesData.length === 0) {
        setMixes([]);
        setLoading(false);
        return;
      }

      const mixIds = playlistMixesData.map((pm) => pm.mix_id).filter(Boolean);

      // Fetch the actual mixes
      const { data: mixesData, error: mixesError } = await supabase
        .from("mixes")
        .select("*")
        .in("id", mixIds)
        .order("created_at", { ascending: false });

      if (mixesError) {
        console.error("❌ Error fetching mixes:", mixesError);
        setMixes([]);
        setLoading(false);
        return;
      }

      // Transform mixes with user profiles
      const transformedMixes = await Promise.all(
        (mixesData || []).map(async (mix) => {
          let userProfile = null;
          if (mix.user_id) {
            try {
              const { data: profileData } = await supabase
                .from("user_profiles")
                .select("dj_name, profile_image_url, bio")
                .eq("id", mix.user_id)
                .single();

              if (profileData) {
                userProfile = profileData;
              }
            } catch (error) {
              console.warn("Could not fetch user profile for mix:", error);
            }
          }

          return {
            ...mix,
            audioUrl: mix.file_url || mix.audio_url || null,
            image: mix.artwork_url || mix.image_url || mix.image || null,
            artist: mix.artist || userProfile?.dj_name || "Unknown",
            user_dj_name: userProfile?.dj_name,
            user_image: userProfile?.profile_image_url,
            user_bio: userProfile?.bio,
            user_id: mix.user_id,
            user: userProfile,
          };
        })
      );

      setMixes(transformedMixes);
    } catch (error) {
      console.error("❌ Error in fetchPlaylistMixes:", error);
      setMixes([]);
    } finally {
      setLoading(false);
    }
  }, [playlistId, user?.id]);

  useEffect(() => {
    fetchPlaylistMixes();
  }, [fetchPlaylistMixes]);

  // Sync playing state
  useEffect(() => {
    if (globalAudioState.currentTrack) {
      setPlayingMixId(globalAudioState.currentTrack.id);
    } else {
      setPlayingMixId(null);
    }
  }, [globalAudioState.currentTrack]);

  const handleRefresh = async () => {
    HapticPatterns.pullToRefresh();
    setRefreshing(true);
    await fetchPlaylistMixes();
    setRefreshing(false);
  };

  const handleMixPress = (mix) => {
    HapticPatterns.playPause();
    if (playingMixId === mix.id) {
      onPauseAudio();
    } else {
      const normalizedMix = {
        ...mix,
        audioUrl: mix.audioUrl || mix.file_url || mix.audio_url || null,
        image: mix.artwork_url || mix.image_url || mix.image || null,
        user_id: mix.user_id || mix.user?.id,
        user_image: mix.user_image || mix.user?.profile_image_url,
        user_dj_name: mix.user_dj_name || mix.user?.dj_name,
        user_bio: mix.user_bio || mix.user?.bio,
        user: mix.user,
      };

      if (!normalizedMix.audioUrl) {
        return;
      }

      onPlayAudio(normalizedMix);
    }
  };

  const handleMixLongPress = (mix) => {
    HapticPatterns.itemPress();
    const normalizedMix = {
      ...mix,
      audioUrl: mix.audioUrl || mix.file_url || mix.audio_url || null,
      image: mix.artwork_url || mix.image_url || mix.image || null,
      user_id: mix.user_id || mix.user?.id,
      user_image: mix.user_image || mix.user?.profile_image_url,
      user_dj_name: mix.user_dj_name || mix.user?.dj_name,
      user_bio: mix.user_bio || mix.user?.bio,
      user: mix.user,
    };

    if (!normalizedMix.audioUrl) {
      return;
    }

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Add to Queue", "Play Next", "Remove from Playlist"],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 3,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            if (onAddToQueue) {
              onAddToQueue(normalizedMix);
              HapticPatterns.success();
            }
          } else if (buttonIndex === 2) {
            if (onPlayNext) {
              onPlayNext(normalizedMix);
              HapticPatterns.success();
            }
          } else if (buttonIndex === 3) {
            handleRemoveFromPlaylist(mix);
          }
        }
      );
    } else {
      Alert.alert(
        mix.title || "Mix",
        "Choose an option",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Add to Queue",
            onPress: () => {
              if (onAddToQueue) {
                onAddToQueue(normalizedMix);
                HapticPatterns.success();
              }
            },
          },
          {
            text: "Play Next",
            onPress: () => {
              if (onPlayNext) {
                onPlayNext(normalizedMix);
                HapticPatterns.success();
              }
            },
          },
          {
            text: "Remove from Playlist",
            style: "destructive",
            onPress: () => handleRemoveFromPlaylist(mix),
          },
        ],
        { cancelable: true }
      );
    }
  };

  const handleRemoveFromPlaylist = async (mix) => {
    if (!playlistId || !mix.id) return;

    Alert.alert(
      "Remove from Playlist?",
      `Remove "${mix.title}" from this playlist?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("playlist_mixes")
                .delete()
                .eq("playlist_id", playlistId)
                .eq("mix_id", mix.id);

              if (error) {
                throw error;
              }

              setMixes((prev) => prev.filter((m) => m.id !== mix.id));
              HapticPatterns.success();
            } catch (error) {
              console.error("❌ Error removing mix from playlist:", error);
              Alert.alert("Error", "Failed to remove mix from playlist");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="hsl(0, 0%, 100%)" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{playlistName || "Playlist"}</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading playlist...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="hsl(0, 0%, 100%)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {playlistName || "Playlist"}
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="hsl(75, 100%, 60%)"
          />
        }
      >
        {mixes.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="musical-notes-outline" size={64} color="hsl(0, 0%, 30%)" />
            <Text style={styles.emptyTitle}>No mixes in this playlist</Text>
            <Text style={styles.emptySubtitle}>
              Add mixes to this playlist from the Listen tab
            </Text>
          </View>
        ) : (
          <View style={styles.mixesList}>
            {mixes.map((mix) => {
              const isPlaying = playingMixId === mix.id && globalAudioState.isPlaying;
              return (
                <TouchableOpacity
                  key={mix.id}
                  style={styles.mixRow}
                  onPress={() => handleMixPress(mix)}
                  onLongPress={() => handleMixLongPress(mix)}
                  delayLongPress={500}
                  activeOpacity={0.8}
                >
                  <View style={styles.mixImageWrap}>
                    <Image
                      source={
                        mix.artwork_url || mix.image_url || mix.image
                          ? { uri: mix.artwork_url || mix.image_url || mix.image }
                          : require("../assets/rhood_logo.webp")
                      }
                      style={styles.mixImage}
                      resizeMode="cover"
                    />
                    {isPlaying && (
                      <View style={styles.playingOverlay}>
                        <Ionicons
                          name="play"
                          size={20}
                          color="hsl(75, 100%, 60%)"
                        />
                      </View>
                    )}
                  </View>
                  <View style={styles.mixInfo}>
                    <Text style={styles.mixTitle} numberOfLines={1}>
                      {mix.title}
                    </Text>
                    <Text style={styles.mixSubtitle} numberOfLines={1}>
                      {mix.artist || mix.user_dj_name || "Unknown"}
                    </Text>
                    <View style={styles.mixMetaRow}>
                      {mix.durationFormatted && (
                        <Text style={styles.mixMeta}>{mix.durationFormatted}</Text>
                      )}
                      {mix.genre && (
                        <>
                          {mix.durationFormatted && (
                            <Text style={styles.mixMeta}> • </Text>
                          )}
                          <Text style={styles.mixMeta}>{mix.genre}</Text>
                        </>
                      )}
                    </View>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color="hsl(0, 0%, 60%)"
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 0%)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    textAlign: "center",
    textTransform: "uppercase",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "hsl(0, 0%, 70%)",
    fontSize: 16,
    fontFamily: "Helvetica Neue",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    minHeight: 400,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
    textAlign: "center",
  },
  mixesList: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  mixRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  mixImageWrap: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "hsl(0, 0%, 12%)",
    position: "relative",
  },
  mixImage: {
    width: "100%",
    height: "100%",
  },
  playingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  mixInfo: {
    flex: 1,
    gap: 4,
  },
  mixTitle: {
    fontSize: 16,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
  },
  mixSubtitle: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 80%)",
  },
  mixMetaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  mixMeta: {
    fontSize: 13,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 60%)",
  },
});

