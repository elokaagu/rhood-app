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

export default function TrendingMixesScreen({
  globalAudioState,
  onPlayAudio,
  onPauseAudio,
  onBack,
  user,
}) {
  const [mixes, setMixes] = useState([]);
  const [playingMixId, setPlayingMixId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mixLikeCounts, setMixLikeCounts] = useState({});

  // Fetch all mixes and calculate trending
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

      const mixIds = data
        .map((mix) => mix.id)
        .filter((id) => id !== null && id !== undefined);
      let likeCountsMap = {};

      if (mixIds.length > 0) {
        try {
          const { data: likeRows, error: likeError } = await supabase
            .from("mix_likes")
            .select("mix_id")
            .in("mix_id", mixIds);

          if (!likeError && Array.isArray(likeRows)) {
            likeCountsMap = likeRows.reduce((acc, row) => {
              if (!row?.mix_id) return acc;
              acc[row.mix_id] = (acc[row.mix_id] || 0) + 1;
              return acc;
            }, {});
          }
        } catch (likeFetchError) {
          console.error("❌ Error fetching like counts:", likeFetchError);
        }
      }

      // Transform mixes with user profiles
      const transformedMixes = await Promise.all(
        data.map(async (mix) => {
          let latestArtistName = null;

          if (mix.user_id) {
            const { data: profile } = await supabase
              .from("user_profiles")
              .select("dj_name, first_name, last_name")
              .eq("id", mix.user_id)
              .single();

            if (profile) {
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

          const resolvedLikeCount =
            likeCountsMap[mix.id] ??
            mix.like_count ??
            mix.likes_count ??
            mix.likes ??
            mix.likeCount ??
            0;

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
            likeCount:
              Number.isFinite(Number(resolvedLikeCount)) &&
              Number(resolvedLikeCount) >= 0
                ? Number(resolvedLikeCount)
                : 0,
          };
        })
      );

      setMixLikeCounts(likeCountsMap);
      setMixes(transformedMixes);
    } catch (error) {
      console.error("❌ Error in fetchMixes:", error);
      setMixes([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate trending mixes (ordered by likes + plays)
  const trendingMixes = useMemo(() => {
    return [...mixes]
      .map((mix) => {
        const likes = mixLikeCounts[mix.id] ?? mix.likeCount ?? 0;
        const plays = mix.plays ?? mix.play_count ?? 0;
        const score = likes * 2 + plays;
        return { ...mix, trendingScore: score };
      })
      .filter((mix) => mix.trendingScore > 0)
      .sort((a, b) => b.trendingScore - a.trendingScore);
  }, [mixes, mixLikeCounts]);

  useEffect(() => {
    fetchMixes();
  }, []);

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
    await fetchMixes();
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
      };

      if (!normalizedMix.audioUrl) {
        return;
      }

      onPlayAudio(normalizedMix);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="hsl(0, 0%, 100%)" />
        </TouchableOpacity>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons
            name="flame"
            size={20}
            color="hsl(75, 100%, 60%)"
          />
          <Text style={styles.headerTitle}>TRENDING</Text>
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
        ) : trendingMixes.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="flame-outline"
              size={64}
              color="hsl(0, 0%, 30%)"
            />
            <Text style={styles.emptyStateTitle}>No trending mixes</Text>
            <Text style={styles.emptyStateSubtitle}>
              Check back later for trending content
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.subtitle}>
              Who's hottest on the platform right now
            </Text>
            <View style={styles.popularList}>
              {trendingMixes.map((mix) => {
                const isPlaying = playingMixId === mix.id;
                return (
                  <TouchableOpacity
                    key={`trending-${mix.id}`}
                    style={styles.popularRow}
                    onPress={() => handleMixPress(mix)}
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

