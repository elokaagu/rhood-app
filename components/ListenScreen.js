import React, { useEffect, useCallback, useMemo, memo, useState, useRef } from "react";
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useListenPlaylists } from "../hooks/useListenPlaylists";
import { ListenPlaylistStrip, ListenMixRow } from "./ListenScreenRows";
import styles from "./ListenScreen.styles";
import { supabase, db } from "../lib/supabase";
import { extractDurationSeconds } from "../lib/listenScreenUtils";
import { HapticPatterns } from "../lib/haptics";
import { createScreenCache } from "../lib/screenCache";
import RhoodScreenTitleBlock from "./RhoodScreenTitleBlock";
import ListenScreenFooter from "./ListenScreenFooter";
import { SkeletonMix } from "./Skeleton";
import AppScreenTutorialModal from "./AppScreenTutorialModal";
import { useAppTutorialModal } from "../hooks/useAppTutorialModal";
import { APP_TUTORIAL_SCREEN_IDS } from "../lib/appTutorialContent";

const ICON_COLOR = "hsl(75, 100%, 60%)";
const TRENDING_LIMIT = 15;
const TRENDING_SKELETON_ROWS = 5;
const TRENDING_CACHE_KEY = "trending";
const trendingCache = createScreenCache("trending");

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function PlaylistsSectionHeader() {
  return (
    <View style={styles.section}>
      <RhoodScreenTitleBlock
        title="Your playlists"
        subtitle="Your saved collections of mixes"
        showTopRule
        subtitleBottomSpacing={12}
        titleStyle={styles.listenSectionHeroTitleCompact}
      />
    </View>
  );
}

function TrendingSectionHeader({ onSeeAll }) {
  return (
    <View style={styles.section}>
      <RhoodScreenTitleBlock
        title="Trending"
        subtitle="Who's hottest on the platform right now"
        subtitleBottomSpacing={12}
        titleStyle={styles.listenSectionHeroTitleCompact}
        titleRight={
          <TouchableOpacity
            onPress={() => {
              HapticPatterns.itemPress();
              onSeeAll?.();
            }}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="See all trending mixes"
          >
            <Text style={styles.sectionHeaderLink}>See all</Text>
          </TouchableOpacity>
        }
      />
    </View>
  );
}

function ListenScreen({
  user,
  onNavigate,
  globalAudioState,
  onPlayAudio,
  onPauseAudio,
  onAddToQueue,
  onPlayNext,
}) {
  const [hasUserMixes, setHasUserMixes] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { tutorialModalProps } = useAppTutorialModal(APP_TUTORIAL_SCREEN_IDS.LISTEN);

  const {
    playlists,
    playlistsLoading,
    playlistsError,
    fetchPlaylists,
  } = useListenPlaylists(user);

  const [trendingMixes, setTrendingMixes] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [trendingError, setTrendingError] = useState(null);
  const [likedMixIds, setLikedMixIds] = useState(() => new Set());
  const [likeLoadingId, setLikeLoadingId] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchTrending = useCallback(async () => {
    const cached = trendingCache.getIfFresh(TRENDING_CACHE_KEY);
    if (cached && Array.isArray(cached.trendingMixes)) {
      setTrendingMixes(cached.trendingMixes);
      setTrendingLoading(false);
      setTrendingError(null);
      return;
    }
    setTrendingLoading(true);
    setTrendingError(null);
    try {
      const { data, error } = await supabase
        .from("mixes")
        .select("*")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(TRENDING_LIMIT);
      if (error) {
        if (mountedRef.current) setTrendingError(error.message || "Failed to load trending");
        return;
      }
      const ids = (data || []).map((m) => m.user_id).filter(Boolean);
      const userIds = [...new Set(ids)];
      let profiles = {};
      if (userIds.length > 0) {
        const { data: prof } = await supabase
          .from("user_profiles")
          .select("id, dj_name")
          .in("id", userIds);
        if (prof) profiles = (prof || []).reduce((a, p) => ({ ...a, [p.id]: p }), {});
      }
      const transformed = (data || []).map((mix) => {
        const sec = extractDurationSeconds(mix);
        const profile = mix.user_id ? profiles[mix.user_id] : null;
        const artist = profile?.dj_name || mix.artist || "Unknown";
        return {
          ...mix,
          id: mix.id,
          title: mix.title,
          artist,
          artwork_url: mix.artwork_url || mix.image_url || mix.image || null,
          image_url: mix.artwork_url || mix.image_url || mix.image || null,
          image: mix.artwork_url || mix.image_url || mix.image || null,
          file_url: mix.file_url,
          audio_url: mix.audio_url,
          durationFormatted: formatDuration(sec),
          genre: mix.genre || null,
          user_id: mix.user_id,
        };
      });
      if (mountedRef.current) {
        setTrendingMixes(transformed);
        trendingCache.set(TRENDING_CACHE_KEY, { trendingMixes: transformed });
      }
    } catch (e) {
      if (mountedRef.current) setTrendingError(e?.message || "Failed to load trending");
      if (__DEV__) console.warn("Trending mixes fetch failed:", e);
    } finally {
      if (mountedRef.current) setTrendingLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.id) fetchPlaylists();
  }, [user?.id, fetchPlaylists]);

  useEffect(() => {
    fetchTrending();
  }, [fetchTrending]);

  const refreshUserMixPresence = useCallback(async () => {
    if (!user?.id) {
      setHasUserMixes(false);
      return;
    }
    try {
      const mixes = await db.getUserMixes(user.id);
      setHasUserMixes(Array.isArray(mixes) && mixes.length > 0);
    } catch {
      setHasUserMixes(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refreshUserMixPresence();
  }, [refreshUserMixPresence]);

  // Fetch liked state for trending mix IDs
  const trendingMixIdsStr = trendingMixes.map((m) => m.id).filter(Boolean).join(",");
  useEffect(() => {
    if (!user?.id || !trendingMixIdsStr) return;
    let cancelled = false;
    (async () => {
      try {
        const mixIds = trendingMixIdsStr.split(",").filter(Boolean);
        const { data, error } = await supabase
          .from("mix_likes")
          .select("mix_id")
          .eq("user_id", user.id)
          .in("mix_id", mixIds);
        if (error || cancelled) return;
        const liked = new Set((data || []).map((r) => r.mix_id).filter(Boolean));
        if (!cancelled) setLikedMixIds(liked);
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [user?.id, trendingMixIdsStr]);

  const onRefresh = useCallback(async () => {
    await Promise.all([
      fetchPlaylists(),
      fetchTrending(),
      refreshUserMixPresence(),
    ]);
  }, [fetchPlaylists, fetchTrending, refreshUserMixPresence]);

  const handleOpenUpload = useCallback(() => {
    HapticPatterns.buttonPress();
    if (!user?.id) {
      Alert.alert(
        "Sign in required",
        "Sign in to upload a mix to R/HOOD."
      );
      return;
    }
    onNavigate?.("upload-mix");
  }, [user?.id, onNavigate]);

  const retryPlaylists = useCallback(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  const retryTrending = useCallback(() => {
    fetchTrending();
  }, [fetchTrending]);

  const handleToggleLike = useCallback(
    async (mix) => {
      if (!user?.id) return;
      const mixId = mix.id;
      if (!mixId) return;
      setLikeLoadingId(mixId);
      const wasLiked = likedMixIds.has(mixId);
      try {
        if (wasLiked) {
          const { error } = await supabase
            .from("mix_likes")
            .delete()
            .eq("user_id", user.id)
            .eq("mix_id", mixId);
          if (error) throw error;
          setLikedMixIds((prev) => {
            const next = new Set(prev);
            next.delete(mixId);
            return next;
          });
        } else {
          const { error } = await supabase
            .from("mix_likes")
            .insert({ user_id: user.id, mix_id: mixId });
          if (error) throw error;
          setLikedMixIds((prev) => new Set([...prev, mixId]));
        }
        HapticPatterns.like();
      } catch (e) {
        if (__DEV__) console.warn("Toggle like failed:", e);
        Alert.alert("Error", "Couldn't update like. Try again.");
      } finally {
        setLikeLoadingId(null);
      }
    },
    [user?.id, likedMixIds]
  );

  const onPlaylistPress = useCallback(
    (playlist) => {
      onNavigate?.("playlist-detail", {
        playlistId: playlist.id,
        playlistName: playlist.name,
      });
    },
    [onNavigate]
  );

  const playingMixId =
    globalAudioState?.currentTrack && globalAudioState?.isPlaying
      ? globalAudioState.currentTrack.id
      : null;

  const handleMixPress = useCallback(
    (mix) => {
      if (!onPlayAudio) return;
      const url = mix.file_url || mix.audio_url || mix.audioUrl;
      if (!url) return;
      HapticPatterns.playPause();
      if (playingMixId === mix.id) {
        onPauseAudio?.();
      } else {
        const sec = extractDurationSeconds(mix);
        onPlayAudio({
          ...mix,
          id: mix.id,
          title: mix.title,
          artist: mix.artist,
          audioUrl: url,
          image: mix.artwork_url || mix.image_url || mix.image,
          user_id: mix.user_id,
          durationSeconds: sec > 0 ? sec : undefined,
          durationMillis: sec > 0 ? Math.round(sec * 1000) : undefined,
        });
      }
    },
    [onPlayAudio, onPauseAudio, playingMixId]
  );

  const normalizeMixForQueue = useCallback((mix) => {
    const url = mix.file_url || mix.audio_url || mix.audioUrl;
    const sec = extractDurationSeconds(mix);
    return {
      ...mix,
      id: mix.id,
      title: mix.title,
      artist: mix.artist,
      audioUrl: url,
      image: mix.artwork_url || mix.image_url || mix.image,
      user_id: mix.user_id,
      durationSeconds: sec > 0 ? sec : undefined,
      durationMillis: sec > 0 ? Math.round(sec * 1000) : undefined,
    };
  }, []);

  const handleMixLongPress = useCallback(
    (mix) => {
      if (!onAddToQueue && !onPlayNext) return;
      HapticPatterns.itemLongPress();
      const normalized = normalizeMixForQueue(mix);
      const options = [];
      if (onAddToQueue) options.push({ text: "Add to queue", onPress: () => onAddToQueue(normalized) });
      if (onPlayNext) options.push({ text: "Play next", onPress: () => onPlayNext(normalized) });
      if (options.length === 0) return;
      Alert.alert(
        mix.title || "Mix",
        "What would you like to do?",
        [
          ...options.map((o) => ({ text: o.text, onPress: o.onPress })),
          { text: "Cancel", style: "cancel" },
        ]
      );
    },
    [onAddToQueue, onPlayNext, normalizeMixForQueue]
  );

  const filteredTrendingMixes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return trendingMixes;
    return trendingMixes.filter((mix) => {
      const title = (mix.title || "").toLowerCase();
      const artist = (mix.artist || "").toLowerCase();
      const genre = (mix.genre || "").toLowerCase();
      return title.includes(q) || artist.includes(q) || genre.includes(q);
    });
  }, [trendingMixes, searchQuery]);

  const filteredPlaylists = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return playlists;
    return playlists.filter((p) => (p.name || "").toLowerCase().includes(q));
  }, [playlists, searchQuery]);

  const playlistsSectionData = useMemo(() => {
    if (playlistsError) return [{ id: "__error_playlists", _error: true, message: playlistsError }];
    if (!playlistsLoading && playlists.length === 0) return [{ id: "__empty_playlists", _empty: true }];
    const q = searchQuery.trim();
    if (!playlistsLoading && q && playlists.length > 0 && filteredPlaylists.length === 0) {
      return [{ id: "__empty_search_playlists", _emptySearch: true }];
    }
    return [
      {
        id: "__horizontal_playlists",
        _horizontal: true,
        playlists: filteredPlaylists,
      },
    ];
  }, [
    playlists,
    filteredPlaylists,
    playlistsLoading,
    playlistsError,
    searchQuery,
  ]);

  const trendingData = useMemo(() => {
    if (trendingError) return [{ id: "__error_trending", _error: true, message: trendingError }];
    // Placeholder rows so Trending occupies the list before mixes arrive (top-to-bottom load order).
    if (
      trendingLoading &&
      trendingMixes.length === 0 &&
      !trendingError &&
      !searchQuery.trim()
    ) {
      return Array.from({ length: TRENDING_SKELETON_ROWS }, (_, i) => ({
        id: `__trending_skeleton_${i}`,
        _skeleton: true,
      }));
    }
    if (!trendingLoading && trendingMixes.length === 0) return [{ id: "__empty_trending", _empty: true }];
    const q = searchQuery.trim();
    if (!trendingLoading && q && trendingMixes.length > 0 && filteredTrendingMixes.length === 0) {
      return [{ id: "__empty_search_trending", _emptySearch: true }];
    }
    return filteredTrendingMixes;
  }, [
    trendingMixes,
    filteredTrendingMixes,
    trendingLoading,
    trendingError,
    searchQuery,
  ]);

  /** Don't mount playlists below until trending fetch has settled — avoids playlists populating first. */
  const trendingSettled = !trendingLoading || trendingError != null;

  const sections = useMemo(() => {
    const next = [
      { key: "trending", title: "Trending", data: trendingData },
    ];
    if (trendingSettled) {
      next.push({
        key: "playlists",
        title: "Your playlists",
        data: playlistsSectionData,
      });
    }
    return next;
  }, [playlistsSectionData, trendingData, trendingSettled]);

  const renderSectionHeader = useCallback(
    ({ section }) => {
      if (section.key === "trending")
        return (
          <TrendingSectionHeader
            onSeeAll={() => onNavigate?.("trending-mixes")}
          />
        );
      if (section.key === "playlists") return <PlaylistsSectionHeader />;
      return null;
    },
    [onNavigate]
  );

  const renderItem = useCallback(
    ({ item, section }) => {
      if (item._error) {
        return (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText} numberOfLines={2}>{item.message}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={section.key === "playlists" ? retryPlaylists : retryTrending}
            >
              <Text style={styles.retryButtonText}>Try again</Text>
            </TouchableOpacity>
          </View>
        );
      }
      if (item._emptySearch) {
        return (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="search-outline" size={44} color="hsl(0, 0%, 40%)" />
            </View>
            <Text style={styles.emptyTitle}>No matches</Text>
            <Text style={styles.emptySubtitle}>
              {section.key === "playlists"
                ? "No playlists match your search. Try another name."
                : "No mixes match that search. Try a different title or DJ name."}
            </Text>
          </View>
        );
      }
      if (item._empty) {
        return (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name={section.key === "playlists" ? "folder-open-outline" : "flame-outline"}
                size={48}
                color="hsl(0, 0%, 40%)"
              />
            </View>
            <Text style={styles.emptyTitle}>
              {section.key === "playlists" ? "No playlists yet" : "No trending mixes"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {section.key === "playlists"
                ? "Create playlists from the playlist detail screen"
                : "Check back later for new mixes"}
            </Text>
          </View>
        );
      }
      if (item._skeleton && section.key === "trending") {
        return (
          <View style={styles.trendingRowWrap}>
            <SkeletonMix />
          </View>
        );
      }
      if (section.key === "playlists") {
        if (item._horizontal && Array.isArray(item.playlists)) {
          return (
            <ListenPlaylistStrip
              playlists={item.playlists}
              onPlaylistPress={onPlaylistPress}
            />
          );
        }
        return null;
      }
      if (section.key === "trending") {
        const isPlaying = playingMixId === item.id && globalAudioState?.isPlaying;
        return (
          <View style={styles.trendingRowWrap}>
            <ListenMixRow
              mix={item}
              isPlaying={!!isPlaying}
              isLiked={likedMixIds.has(item.id)}
              likeLoading={likeLoadingId === item.id}
              onPress={handleMixPress}
              onLongPress={handleMixLongPress}
              onToggleLike={handleToggleLike}
            />
          </View>
        );
      }
      return null;
    },
    [
      onPlaylistPress,
      playingMixId,
      globalAudioState?.isPlaying,
      handleMixPress,
      handleMixLongPress,
      handleToggleLike,
      likedMixIds,
      likeLoadingId,
      retryPlaylists,
      retryTrending,
    ]
  );

  const keyExtractor = useCallback((item) => item.id, []);

  const refreshing = playlistsLoading || trendingLoading;

  /**
   * Title + search live outside SectionList so the TextInput is not remounted on every
   * keystroke (ListHeaderComponent used to use useCallback([searchQuery]), which changed
   * the header callback each render and killed focus).
   */
  const renderListFooter = useCallback(
    () => (
      <ListenScreenFooter
        hasUserMixes={hasUserMixes}
        onUploadMix={handleOpenUpload}
      />
    ),
    [hasUserMixes, handleOpenUpload]
  );

  return (
    <View style={styles.container}>
      <View style={styles.listenScreenHeaderRoot}>
        <View style={styles.listenHomeTop}>
          <RhoodScreenTitleBlock
            title="Listen"
            subtitle="DJ mixes from the R/HOOD community."
            subtitleBottomSpacing={10}
          />
          <View style={styles.listenHomeSearchSection}>
            <View style={styles.listenHomeSearchContainer}>
              <Ionicons name="search" size={20} color="hsl(0, 0%, 50%)" />
              <TextInput
                style={styles.listenHomeSearchInput}
                placeholder="Search mixes, DJs, or genres…"
                placeholderTextColor="hsl(0, 0%, 45%)"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
              {searchQuery.length > 0 ? (
                <TouchableOpacity
                  onPress={() => setSearchQuery("")}
                  style={styles.clearButton}
                  accessibilityLabel="Clear search"
                >
                  <Ionicons name="close-circle" size={20} color="hsl(0, 0%, 50%)" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      </View>
      <SectionList
        style={{ flex: 1 }}
        sections={sections}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={6}
        removeClippedSubviews={true}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={ICON_COLOR}
          />
        }
        ListFooterComponent={renderListFooter}
      />
      {tutorialModalProps ? (
        <AppScreenTutorialModal {...tutorialModalProps} />
      ) : null}
    </View>
  );
}

export default memo(ListenScreen);
