import React, { useEffect, useCallback, useMemo, memo, useState } from "react";
import { View, Text, SectionList, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useListenPlaylists } from "../hooks/useListenPlaylists";
import { ListenPlaylistRow, ListenMixRow } from "./ListenScreenRows";
import styles from "./ListenScreen.styles";
import { supabase } from "../lib/supabase";
import { extractDurationSeconds } from "../lib/listenScreenUtils";
import { HapticPatterns } from "../lib/haptics";

const ICON_COLOR = "hsl(75, 100%, 60%)";
const TRENDING_LIMIT = 15;

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function PlaylistsSectionHeader() {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="musical-notes" size={18} color={ICON_COLOR} />
          <Text style={styles.sectionTitle}>YOUR PLAYLISTS</Text>
        </View>
      </View>
      <Text style={styles.sectionSubtitle}>Your saved collections of mixes</Text>
    </View>
  );
}

function TrendingSectionHeader({ onSeeAll }) {
  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => {
          HapticPatterns.itemPress();
          onSeeAll?.();
        }}
        activeOpacity={0.7}
      >
        <View style={styles.sectionTitleRow}>
          <Ionicons name="flame" size={18} color={ICON_COLOR} />
          <Text style={styles.sectionTitle}>TRENDING</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="hsl(0, 0%, 60%)" />
      </TouchableOpacity>
      <Text style={styles.sectionSubtitle}>
        Who&apos;s hottest on the platform right now
      </Text>
    </View>
  );
}

function ListenScreen({
  user,
  onNavigate,
  globalAudioState,
  onPlayAudio,
  onPauseAudio,
}) {
  const { playlists, fetchPlaylists } = useListenPlaylists(user);
  const [trendingMixes, setTrendingMixes] = useState([]);

  useEffect(() => {
    if (user?.id) fetchPlaylists();
  }, [user?.id, fetchPlaylists]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("mixes")
          .select("*")
          .eq("is_public", true)
          .order("created_at", { ascending: false })
          .limit(TRENDING_LIMIT);
        if (error || cancelled) return;
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
          const artist =
            profile?.dj_name || mix.artist || "Unknown";
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
        if (!cancelled) setTrendingMixes(transformed);
      } catch (e) {
        if (__DEV__) console.warn("Trending mixes fetch failed:", e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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
        onPlayAudio({
          ...mix,
          id: mix.id,
          title: mix.title,
          artist: mix.artist,
          audioUrl: url,
          image: mix.artwork_url || mix.image_url || mix.image,
          user_id: mix.user_id,
        });
      }
    },
    [onPlayAudio, onPauseAudio, playingMixId]
  );

  const handleMixLongPress = useCallback(() => {}, []);

  const sections = useMemo(() => {
    const s = [
      {
        key: "playlists",
        title: "YOUR PLAYLISTS",
        data: playlists,
      },
    ];
    if (trendingMixes.length > 0) {
      s.push({
        key: "trending",
        title: "TRENDING",
        data: trendingMixes,
      });
    }
    return s;
  }, [playlists, trendingMixes]);

  const renderSectionHeader = useCallback(
    ({ section }) => {
      if (section.key === "playlists") return <PlaylistsSectionHeader />;
      if (section.key === "trending")
        return (
          <TrendingSectionHeader
            onSeeAll={() => onNavigate?.("trending-mixes")}
          />
        );
      return null;
    },
    [onNavigate]
  );

  const renderItem = useCallback(
    ({ item, section }) => {
      if (section.key === "playlists") {
        return (
          <View style={styles.playlistRowWrap}>
            <ListenPlaylistRow playlist={item} onPress={onPlaylistPress} />
          </View>
        );
      }
      if (section.key === "trending") {
        const isPlaying = playingMixId === item.id && globalAudioState?.isPlaying;
        return (
          <View style={styles.trendingRowWrap}>
            <ListenMixRow
              mix={item}
              isPlaying={!!isPlaying}
              isLiked={false}
              likeLoading={false}
              onPress={handleMixPress}
              onLongPress={handleMixLongPress}
              onToggleLike={() => {}}
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
    ]
  );

  const keyExtractor = useCallback((item) => item.id, []);

  return (
    <View style={styles.container}>
      <SectionList
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
      />
    </View>
  );
}

export default memo(ListenScreen);
