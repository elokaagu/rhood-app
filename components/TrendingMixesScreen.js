import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  RefreshControl,
  Platform,
  ActionSheetIOS,
  Alert,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { HapticPatterns } from "../lib/haptics";
import { SkeletonMix } from "./Skeleton";
import { LIST_PERFORMANCE } from "../lib/performanceConstants";
import { fetchMixesWithProfilesAndLikeCounts } from "../lib/fetchMixesWithAggregates";
import { normalizeMixForPlayback } from "../lib/yourLikesUtils";

const TrendingMixRow = memo(function TrendingMixRow({ mix, isPlaying, onPress, onLongPress }) {
  return (
    <TouchableOpacity
      style={rowStyles.popularRow}
      onPress={() => onPress(mix)}
      onLongPress={() => onLongPress(mix)}
      delayLongPress={500}
      activeOpacity={0.8}
    >
      <View style={rowStyles.popularImageWrap}>
        <Image
          source={
            mix.artwork_url || mix.image_url || mix.image
              ? { uri: mix.artwork_url || mix.image_url || mix.image }
              : require("../assets/rhood_logo.webp")
          }
          style={rowStyles.popularImage}
          resizeMode="cover"
        />
        {isPlaying && (
          <View style={rowStyles.playingOverlay}>
            <Ionicons name="play" size={20} color="hsl(75, 100%, 60%)" />
          </View>
        )}
      </View>
      <View style={rowStyles.popularInfo}>
        <Text style={rowStyles.popularTitle} numberOfLines={1}>
          {mix.title}
        </Text>
        <Text style={rowStyles.popularSubtitle} numberOfLines={1}>
          {mix.artist || "Unknown"}
        </Text>
        <View style={rowStyles.popularMetaRow}>
          {mix.durationFormatted && (
            <Text style={rowStyles.popularMeta}>{mix.durationFormatted}</Text>
          )}
          {mix.genre && (
            <>
              {mix.durationFormatted && (
                <Text style={rowStyles.popularMeta}> • </Text>
              )}
              <Text style={rowStyles.popularMeta}>{mix.genre}</Text>
            </>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color="hsl(0, 0%, 60%)" />
    </TouchableOpacity>
  );
});

const rowStyles = StyleSheet.create({
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
  popularImage: { width: "100%", height: "100%" },
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
  popularInfo: { flex: 1, gap: 4 },
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
  popularMetaRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
});

export default function TrendingMixesScreen({
  globalAudioState,
  onPlayAudio,
  onPauseAudio,
  onResumeAudio,
  onBack,
  onAddToQueue,
  onPlayNext,
}) {
  const [mixes, setMixes] = useState([]);
  const [playingMixId, setPlayingMixId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadMixes = useCallback(async ({ isInitial = false } = {}) => {
    if (isInitial) setLoading(true);
    try {
      const { mixes: next, error } =
        await fetchMixesWithProfilesAndLikeCounts();
      if (error) {
        console.error("❌ Error fetching mixes:", error);
        setMixes([]);
        return;
      }
      setMixes(next);
    } catch (error) {
      console.error("❌ Error in loadMixes:", error);
      setMixes([]);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  // Calculate trending mixes (ordered by likes + plays)
  const trendingMixes = useMemo(() => {
    return [...mixes]
      .map((mix) => {
        const likes = mix.likeCount ?? 0;
        const plays = mix.plays ?? mix.play_count ?? 0;
        const score = likes * 2 + plays;
        return { ...mix, trendingScore: score };
      })
      .filter((mix) => mix.trendingScore > 0)
      .sort((a, b) => b.trendingScore - a.trendingScore);
  }, [mixes]);

  useEffect(() => {
    loadMixes({ isInitial: true });
  }, [loadMixes]);

  // Sync playing state
  useEffect(() => {
    if (globalAudioState.currentTrack) {
      setPlayingMixId(globalAudioState.currentTrack.id);
    } else {
      setPlayingMixId(null);
    }
  }, [globalAudioState.currentTrack]);

  const handleRefresh = useCallback(async () => {
    HapticPatterns.pullToRefresh();
    setRefreshing(true);
    try {
      await loadMixes({ isInitial: false });
    } finally {
      setRefreshing(false);
    }
  }, [loadMixes]);

  const handleMixPress = useCallback(
    (mix) => {
      HapticPatterns.playPause();
      const current = globalAudioState.currentTrack;
      const sameTrack =
        current &&
        (String(current.id) === String(mix.id) ||
          String(current.id) === String(mix?.id));

      if (sameTrack) {
        if (globalAudioState.isPlaying) {
          onPauseAudio?.();
        } else {
          onResumeAudio?.();
        }
        return;
      }

      const normalized = normalizeMixForPlayback(mix);
      if (!normalized?.audioUrl) return;
      onPlayAudio?.(normalized);
    },
    [
      globalAudioState.currentTrack,
      globalAudioState.isPlaying,
      onPauseAudio,
      onResumeAudio,
      onPlayAudio,
    ]
  );

  const handleMixLongPress = useCallback(
    (mix) => {
      HapticPatterns.itemPress();
      const normalizedMix = normalizeMixForPlayback(mix);

      if (!normalizedMix?.audioUrl) {
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
              if (onAddToQueue) {
                onAddToQueue(normalizedMix);
                HapticPatterns.success();
              }
            } else if (buttonIndex === 2) {
              if (onPlayNext) {
                onPlayNext(normalizedMix);
                HapticPatterns.success();
              }
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
          ],
          { cancelable: true }
        );
      }
    },
    [onAddToQueue, onPlayNext]
  );

  const renderListHeader = useCallback(
    () => (
      <Text style={styles.subtitle}>
        Who's hottest on the platform right now
      </Text>
    ),
    []
  );

  const renderItem = useCallback(
    ({ item: mix }) => (
      <View style={styles.popularList}>
        <TrendingMixRow
          mix={mix}
          isPlaying={
            playingMixId != null &&
            mix.id != null &&
            String(playingMixId) === String(mix.id) &&
            globalAudioState.isPlaying
          }
          onPress={handleMixPress}
          onLongPress={handleMixLongPress}
        />
      </View>
    ),
    [
      playingMixId,
      globalAudioState.isPlaying,
      handleMixPress,
      handleMixLongPress,
    ]
  );

  const keyExtractor = useCallback((item) => `trending-${item.id}`, []);

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
            name="flame"
            size={20}
            color="hsl(75, 100%, 60%)"
          />
          <Text style={styles.headerTitle}>TRENDING</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
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
          <View style={styles.skeletonContainer}>
            <SkeletonMix />
            <SkeletonMix />
            <SkeletonMix />
            <SkeletonMix />
            <SkeletonMix />
          </View>
        </ScrollView>
      ) : trendingMixes.length === 0 ? (
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
          <View style={styles.emptyState}>
            <Ionicons name="flame-outline" size={64} color="hsl(0, 0%, 30%)" />
            <Text style={styles.emptyStateTitle}>No trending mixes</Text>
            <Text style={styles.emptyStateSubtitle}>
              Check back later for trending content
            </Text>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={trendingMixes}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListHeaderComponent={renderListHeader}
          initialNumToRender={LIST_PERFORMANCE.INITIAL_NUM_TO_RENDER}
          maxToRenderPerBatch={LIST_PERFORMANCE.MAX_TO_RENDER_PER_BATCH}
          windowSize={LIST_PERFORMANCE.WINDOW_SIZE}
          removeClippedSubviews={LIST_PERFORMANCE.REMOVE_CLIPPED_SUBVIEWS}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="hsl(75, 100%, 60%)"
            />
          }
          contentContainerStyle={styles.scrollContent}
          style={styles.scrollView}
        />
      )}
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

