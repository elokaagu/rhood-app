import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
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
import { fetchMixesWithAggregates } from "../lib/fetchMixesWithAggregates";
import { normalizeMixForPlayback } from "../lib/yourLikesUtils";
import { rankTrendingMixes } from "../lib/trendingScore";
import MixListRow, {
  MIX_LIST_ROW_HEIGHT_TRENDING,
} from "./mixList/MixListRow";

const TRENDING_ROW_HEIGHT = MIX_LIST_ROW_HEIGHT_TRENDING;

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
  /** Set when fetch fails — never conflate with “empty trending”. */
  const [loadError, setLoadError] = useState(null);

  const loadMixes = useCallback(async ({ isInitial = false } = {}) => {
    if (isInitial) setLoading(true);
    setLoadError(null);
    try {
      const { mixes: next, error } =
        await fetchMixesWithAggregates();
      if (error) {
        console.error("❌ Error fetching mixes:", error);
        setMixes([]);
        const msg =
          (typeof error.message === "string" && error.message) ||
          (typeof error.details === "string" && error.details) ||
          (typeof error.hint === "string" && error.hint) ||
          null;
        setLoadError(
          msg || "Could not load mixes. Check your connection and try again."
        );
        return;
      }
      setMixes(next);
    } catch (error) {
      console.error("❌ Error in loadMixes:", error);
      setMixes([]);
      setLoadError(
        error?.message ||
          "Something went wrong while loading trending mixes."
      );
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  const trendingMixes = useMemo(
    () => rankTrendingMixes(mixes, Date.now()),
    [mixes]
  );

  useEffect(() => {
    loadMixes({ isInitial: true });
  }, [loadMixes]);

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

  const handleRetry = useCallback(() => {
    HapticPatterns.buttonPress();
    loadMixes({ isInitial: true });
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
      <View style={styles.listHeaderBlock}>
        <Text style={styles.subtitle}>
          Hot right now — ranked by plays, likes, and recency (newer mixes get
          a fair shot).
        </Text>
      </View>
    ),
    []
  );

  const renderItem = useCallback(
    ({ item: mix, index }) => (
      <View style={styles.popularList}>
        <MixListRow
          mix={mix}
          rank={index + 1}
          showHotBadge={index < 3}
          showEngagementStats
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

  const getItemLayout = useCallback(
    (_, index) => ({
      length: TRENDING_ROW_HEIGHT,
      offset: TRENDING_ROW_HEIGHT * index,
      index,
    }),
    []
  );

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      tintColor="hsl(75, 100%, 60%)"
    />
  );

  const showError = !loading && loadError;
  const showEmpty =
    !loading && !loadError && trendingMixes.length === 0;
  const showList =
    !loading && !loadError && trendingMixes.length > 0;

  return (
    <View style={styles.container}>
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
        <Text style={styles.headerTitle}>Trending</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={refreshControl}
        >
          <View style={styles.skeletonContainer}>
            <SkeletonMix />
            <SkeletonMix />
            <SkeletonMix />
            <SkeletonMix />
            <SkeletonMix />
          </View>
        </ScrollView>
      ) : showError ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={refreshControl}
        >
          <View style={styles.errorState}>
            <Ionicons
              name="cloud-offline-outline"
              size={64}
              color="hsl(0, 0%, 35%)"
            />
            <Text style={styles.errorStateTitle}>Could not load trending</Text>
            <Text style={styles.errorStateSubtitle}>{loadError}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleRetry}
              activeOpacity={0.85}
            >
              <Ionicons
                name="refresh"
                size={20}
                color="hsl(0, 0%, 0%)"
                style={styles.retryIcon}
              />
              <Text style={styles.retryButtonText}>Try again</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : showEmpty ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={refreshControl}
        >
          <View style={styles.emptyState}>
            <Ionicons name="flame-outline" size={64} color="hsl(0, 0%, 30%)" />
            <Text style={styles.emptyStateTitle}>
              {mixes.length === 0
                ? "No mixes yet"
                : "Nothing trending yet"}
            </Text>
            <Text style={styles.emptyStateSubtitle}>
              {mixes.length === 0
                ? "When DJs publish mixes, they will show up here."
                : "Once mixes pick up plays and likes, they will rank here. Pull to refresh."}
            </Text>
          </View>
        </ScrollView>
      ) : showList ? (
        <FlatList
          data={trendingMixes}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListHeaderComponent={renderListHeader}
          getItemLayout={getItemLayout}
          initialNumToRender={LIST_PERFORMANCE.INITIAL_NUM_TO_RENDER}
          maxToRenderPerBatch={LIST_PERFORMANCE.MAX_TO_RENDER_PER_BATCH}
          windowSize={LIST_PERFORMANCE.WINDOW_SIZE}
          removeClippedSubviews={LIST_PERFORMANCE.REMOVE_CLIPPED_SUBVIEWS}
          refreshControl={refreshControl}
          contentContainerStyle={styles.scrollContent}
          style={styles.scrollView}
        />
      ) : null}
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
    color: "hsl(0, 0%, 100%)",
    letterSpacing: 0.5,
    flex: 1,
    textAlign: "center",
    marginHorizontal: 8,
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
  listHeaderBlock: {
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 60%)",
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
    textAlign: "center",
  },
  emptyStateSubtitle: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 60%)",
    textAlign: "center",
    lineHeight: 20,
  },
  errorState: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  errorStateTitle: {
    fontSize: 18,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  errorStateSubtitle: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 55%)",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "hsl(75, 100%, 60%)",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryIcon: {
    marginRight: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "700",
    color: "hsl(0, 0%, 0%)",
  },
});
