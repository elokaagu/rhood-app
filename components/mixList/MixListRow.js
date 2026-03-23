import React, { memo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProgressiveImage from "../ProgressiveImage";

/** TS Block list title: 60% of former 16px (matches Listen `popularTitle`) */
const MIX_ROW_TS_BLOCK_TITLE_SIZE = 16 * 0.6;

/** @param {number} n */
export function formatEngagementCount(n) {
  const x = Math.max(0, Math.round(Number(n) || 0));
  if (x >= 1_000_000) return `${(x / 1_000_000).toFixed(1)}M`;
  if (x >= 10_000) return `${Math.round(x / 1000)}k`;
  if (x >= 1_000) return `${(x / 1_000).toFixed(1)}k`;
  return String(x);
}

/**
 * Shared list row for mixes (likes, trending, discovery).
 *
 * @param {object} props
 * @param {object} props.mix
 * @param {boolean} props.isPlaying
 * @param {(mix: object) => void} props.onPress
 * @param {(mix: object) => void} props.onLongPress
 * @param {number} [props.rank] — 1-based rank (shows leading index)
 * @param {boolean} [props.showHotBadge] — flame on artwork (e.g. top 3)
 * @param {boolean} [props.showEngagementStats] — plays / likes line
 */
const MixListRow = memo(function MixListRow({
  mix,
  isPlaying,
  onPress,
  onLongPress,
  rank,
  showHotBadge = false,
  showEngagementStats = false,
}) {
  const uri = mix.artwork_url || mix.image_url || mix.image;
  const likes = mix.likeCount ?? mix.like_count ?? mix.likes ?? 0;
  const plays =
    mix.plays ??
    mix.play_count ??
    mix.plays_count ??
    mix.total_plays ??
    0;

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onPress(mix)}
      onLongPress={() => onLongPress(mix)}
      delayLongPress={500}
      activeOpacity={0.8}
    >
      {rank != null ? (
        <View style={styles.rankCol} accessibilityLabel={`Rank ${rank}`}>
          <Text
            style={[styles.rankText, rank <= 3 && styles.rankTextTop]}
            numberOfLines={1}
          >
            {rank}
          </Text>
        </View>
      ) : null}

      <View style={styles.imageWrap}>
        <ProgressiveImage
          source={uri ? { uri } : require("../../assets/rhood_logo.webp")}
          style={styles.image}
          contentFit="cover"
          placeholder={
            <View
              style={[
                styles.image,
                {
                  backgroundColor: "hsl(0, 0%, 12%)",
                  justifyContent: "center",
                  alignItems: "center",
                },
              ]}
            >
              <Ionicons
                name="musical-notes"
                size={24}
                color="hsl(75, 100%, 60%)"
              />
            </View>
          }
        />
        {showHotBadge ? (
          <View style={styles.hotBadge} accessibilityLabel="Trending top mix">
            <Ionicons name="flame" size={13} color="hsl(0, 0%, 100%)" />
          </View>
        ) : null}
        {isPlaying ? (
          <View style={styles.playingOverlay}>
            <Ionicons name="play" size={20} color="hsl(75, 100%, 60%)" />
          </View>
        ) : null}
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {mix.title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {mix.artist || "Unknown"}
        </Text>
        <View style={styles.metaRow}>
          {mix.durationFormatted ? (
            <Text style={styles.meta}>{mix.durationFormatted}</Text>
          ) : null}
          {mix.genre ? (
            <>
              {mix.durationFormatted ? (
                <Text style={styles.meta}> • </Text>
              ) : null}
              <Text style={styles.meta}>{mix.genre}</Text>
            </>
          ) : null}
        </View>
        {showEngagementStats ? (
          <Text style={styles.statsLine} numberOfLines={1}>
            {formatEngagementCount(plays)} plays · {formatEngagementCount(likes)}{" "}
            likes
          </Text>
        ) : null}
      </View>

      <Ionicons name="chevron-forward" size={18} color="hsl(0, 0%, 60%)" />
    </TouchableOpacity>
  );
});

/** Stable row height for FlatList getItemLayout when stats + rank are shown */
export const MIX_LIST_ROW_HEIGHT_TRENDING = 106;
/** Same layout as default row without rank/stats (approximate). */
export const MIX_LIST_ROW_HEIGHT_DEFAULT = 97;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
    minHeight: 88,
  },
  rankCol: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    fontSize: 15,
    fontFamily: "Helvetica Neue",
    fontWeight: "700",
    color: "hsl(0, 0%, 45%)",
  },
  rankTextTop: {
    color: "hsl(75, 100%, 60%)",
  },
  imageWrap: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "hsl(0, 0%, 12%)",
    position: "relative",
  },
  image: { width: "100%", height: "100%" },
  hotBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "hsl(25, 95%, 48%)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.35)",
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
  info: { flex: 1, gap: 3, minWidth: 0 },
  title: {
    fontSize: MIX_ROW_TS_BLOCK_TITLE_SIZE,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    fontWeight: "400",
    color: "hsl(0, 0%, 80%)",
  },
  meta: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 60%)",
  },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  statsLine: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 50%)",
    marginTop: 2,
  },
});

export default MixListRow;
