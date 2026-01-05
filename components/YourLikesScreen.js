import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  RefreshControl,
  ActivityIndicator,
  Platform,
  ActionSheetIOS,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { HapticPatterns } from "../lib/haptics";
import { SkeletonMix } from "./Skeleton";

const extractDurationSeconds = (mix) => {
  if (!mix || typeof mix !== "object") return null;

  const metadataSources = [
    mix.duration,
    mix.duration_seconds,
    mix.durationSeconds,
    mix.duration_secs,
    mix.metadata?.duration,
    mix.metadata?.duration_seconds,
    mix.audio_metadata?.duration,
    mix.audio_metadata?.duration_seconds,
  ];

  for (const source of metadataSources) {
    if (source == null || source === undefined) continue;
    if (typeof source === "number" && Number.isFinite(source) && source > 0) {
      return Math.round(source);
    }
    if (typeof source === "string" && source.trim()) {
      const trimmed = source.trim();
      if (trimmed === "0" || trimmed === "0:00") continue;
      const colonParts = trimmed.split(":").map((part) => part.trim());
      if (colonParts.length >= 2 && colonParts.length <= 3) {
        const numbers = colonParts.map((part) => Number(part));
        if (numbers.every((num) => Number.isFinite(num) && num >= 0)) {
          if (numbers.length === 3) {
            const [hours, minutes, seconds] = numbers;
            const totalSeconds = hours * 3600 + minutes * 60 + seconds;
            return totalSeconds > 0 ? totalSeconds : null;
          }
          const [minutes, seconds] = numbers;
          const totalSeconds = minutes * 60 + seconds;
          return totalSeconds > 0 ? totalSeconds : null;
        }
      }
    }
  }

  return null;
};

const formatDurationLabel = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0:00";
  }
  const totalSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

export default function YourLikesScreen({
  globalAudioState,
  onPlayAudio,
  onPauseAudio,
  onBack,
  user,
  onAddToQueue,
  onPlayNext,
}) {
  const [mixes, setMixes] = useState([]);
  const [likedMixIds, setLikedMixIds] = useState(() => new Set());
  const [playingMixId, setPlayingMixId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch all mixes
  const fetchMixes = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("mixes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Error fetching mixes:", error);
        setMixes([]);
        return;
      }

      // Transform mixes with user profiles
      const transformedMixes = await Promise.all(
        data.map(async (mix) => {
          let latestArtistName = null;

          let userProfile = null;
          if (mix.user_id) {
            const { data: profile } = await supabase
              .from("user_profiles")
              .select("dj_name, first_name, last_name, profile_image_url, bio")
              .eq("id", mix.user_id)
              .single();

            if (profile) {
              userProfile = profile;
              latestArtistName =
                profile.dj_name ||
                `${profile.first_name || ""} ${profile.last_name || ""}`.trim() ||
                "Unknown Artist";
            }
          }

          const fallbackArtist =
            mix.artist &&
            typeof mix.artist === "string" &&
            mix.artist.trim().length > 0
              ? mix.artist.trim()
              : "Unknown Artist";
          const resolvedArtist = latestArtistName || fallbackArtist;

          const durationSeconds = extractDurationSeconds(mix);
          const durationLabel = formatDurationLabel(durationSeconds);

          return {
            id: mix.id,
            user_id: mix.user_id,
            title: mix.title,
            artist: resolvedArtist,
            genre: mix.genre || "Electronic",
            durationSeconds,
            durationFormatted: durationLabel,
            artwork_url: mix.artwork_url || mix.image_url || mix.image || null,
            image: mix.artwork_url || mix.image_url || mix.image || null,
            audioUrl: mix.file_url,
            plays: mix.plays || mix.play_count || 0,
            created_at: mix.created_at || null,
            user: userProfile, // Include full user profile for DJ image
            user_image: userProfile?.profile_image_url,
            user_dj_name: userProfile?.dj_name,
            user_bio: userProfile?.bio,
          };
        })
      );

      setMixes(transformedMixes);
    } catch (error) {
      console.error("❌ Error in fetchMixes:", error);
      setMixes([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user's liked mixes
  const fetchUserLikedMixes = async () => {
    if (!user?.id) {
      setLikedMixIds(new Set());
      return;
    }

    try {
      const { data, error } = await supabase
        .from("mix_likes")
        .select("mix_id")
        .eq("user_id", user.id);

      if (error) {
        if (error.code === "42P01" || error.code === "PGRST205") {
          console.warn("mix_likes table not found. Skipping liked mixes fetch.");
          return;
        }
        console.error("❌ Error fetching liked mixes:", error);
        return;
      }

      const likedSet = new Set(
        (data || [])
          .map((row) => row?.mix_id)
          .filter((mixId) => mixId !== null && mixId !== undefined)
      );

      setLikedMixIds(likedSet);
    } catch (error) {
      console.error("❌ Unexpected error fetching liked mixes:", error);
    }
  };

  // Get user's liked mixes
  const userLikedMixes = useMemo(() => {
    if (!user?.id || likedMixIds.size === 0) return [];
    return mixes
      .filter((mix) => likedMixIds.has(mix.id))
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [mixes, likedMixIds, user?.id]);

  useEffect(() => {
    fetchMixes();
  }, []);

  useEffect(() => {
    fetchUserLikedMixes();
  }, [user?.id]);

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
    await Promise.all([fetchMixes(), fetchUserLikedMixes()]);
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
          options: ["Cancel", "Add to Queue", "Play Next"],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            // Add to Queue
            if (onAddToQueue) {
              onAddToQueue(normalizedMix);
              HapticPatterns.success();
            }
          } else if (buttonIndex === 2) {
            // Play Next
            if (onPlayNext) {
              onPlayNext(normalizedMix);
              HapticPatterns.success();
            }
          }
        }
      );
    } else {
      // Android
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
        ],
        { cancelable: true }
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            HapticPatterns.backButton();
            onBack();
          }}
        >
          <Ionicons name="arrow-back" size={24} color="hsl(0, 0%, 100%)" />
        </TouchableOpacity>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons
            name="heart"
            size={20}
            color="hsl(75, 100%, 60%)"
          />
          <Text style={styles.headerTitle}>YOUR LIKES</Text>
        </View>
        <View style={styles.headerSpacer} />
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
        {loading ? (
          <View style={styles.skeletonContainer}>
            <SkeletonMix />
            <SkeletonMix />
            <SkeletonMix />
            <SkeletonMix />
            <SkeletonMix />
          </View>
        ) : !user?.id ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="heart-outline"
              size={64}
              color="hsl(0, 0%, 30%)"
            />
            <Text style={styles.emptyStateTitle}>Sign in to see your likes</Text>
            <Text style={styles.emptyStateSubtitle}>
              Sign in to view mixes you've liked
            </Text>
          </View>
        ) : userLikedMixes.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="heart-outline"
              size={64}
              color="hsl(0, 0%, 30%)"
            />
            <Text style={styles.emptyStateTitle}>No liked mixes yet</Text>
            <Text style={styles.emptyStateSubtitle}>
              Start liking mixes to see them here
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.subtitle}>
              Mixes you've already liked
            </Text>
            <View style={styles.popularList}>
              {userLikedMixes.map((mix) => {
                const isPlaying = playingMixId === mix.id;
                return (
                  <TouchableOpacity
                    key={`liked-${mix.id}`}
                    style={styles.popularRow}
                    onPress={() => handleMixPress(mix)}
                    onLongPress={() => handleMixLongPress(mix)}
                    delayLongPress={500}
                    activeOpacity={0.8}
                  >
                    <View style={styles.popularImageWrap}>
                      <Image
                        source={
                          mix.artwork_url || mix.image_url || mix.image
                            ? { uri: mix.artwork_url || mix.image_url || mix.image }
                            : require("../assets/rhood_logo.webp")
                        }
                        style={styles.popularImage}
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
                    <View style={styles.popularInfo}>
                      <Text style={styles.popularTitle} numberOfLines={1}>
                        {mix.title}
                      </Text>
                      <Text style={styles.popularSubtitle} numberOfLines={1}>
                        {mix.artist || "Unknown"}
                      </Text>
                      <View style={styles.popularMetaRow}>
                        {mix.durationFormatted && (
                          <Text style={styles.popularMeta}>
                            {mix.durationFormatted}
                          </Text>
                        )}
                        {mix.genre && (
                          <>
                            {mix.durationFormatted && (
                              <Text style={styles.popularMeta}> • </Text>
                            )}
                            <Text style={styles.popularMeta}>{mix.genre}</Text>
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
          </>
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
    padding: 20,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "TS Block Bold",
    fontWeight: "900",
    color: "hsl(0, 0%, 100%)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 160,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 60%)",
    marginBottom: 16,
    paddingHorizontal: 20,
    marginTop: 16,
    lineHeight: 18,
  },
  popularList: {
    paddingHorizontal: 20,
  },
  popularRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  popularImageWrap: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "hsl(0, 0%, 12%)",
    position: "relative",
  },
  popularImage: {
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
  popularInfo: {
    flex: 1,
    gap: 4,
  },
  popularTitle: {
    fontSize: 16,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
  },
  popularSubtitle: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 80%)",
  },
  popularMeta: {
    fontSize: 13,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 60%)",
  },
  popularMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  skeletonContainer: {
    padding: 20,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 60%)",
    textAlign: "center",
    lineHeight: 20,
  },
});

