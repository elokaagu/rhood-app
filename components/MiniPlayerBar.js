/**
 * Spotify-style floating mini player: #282828 bar, title • artist, device row,
 * outline headphones + white play/pause, thin white progress at bottom.
 */
import React, { memo, useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProgressiveImage from "./ProgressiveImage";

/** R/HOOD lime — device + headphones accent (Spotify green analogue) */
const ACCENT = "hsl(75, 100%, 60%)";
/** Spotify mini player canvas */
const BAR_BG = "#282828";
const TRACK_BG = "hsl(0, 0%, 22%)";
const PLAYED = "hsl(0, 0%, 100%)";
const ARTIST_MUTED = "#B3B3B3";

export function formatMiniTime(ms) {
  if (ms == null || ms < 0) return "0:00";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}

function MiniPlayerBar({
  track,
  isPlaying,
  positionMillis,
  durationMillis,
  durationUnknown: _durationUnknown,
  onOpenFullScreen,
  onPlayPause,
  onClose,
  layoutStyle,
  wrapperPointerEvents = "box-none",
  fadeOverlayStyle,
}) {
  const progress = useMemo(() => {
    if (!durationMillis || durationMillis <= 0) return 0;
    return Math.max(0, Math.min(1, (positionMillis ?? 0) / durationMillis));
  }, [positionMillis, durationMillis]);

  const uri = track?.image || track?.artwork_url || track?.image_url;

  const title = track?.title?.trim() || "Unknown track";
  const artist = track?.artist?.trim() || "Unknown";

  return (
    <View
      style={[styles.anchor, { pointerEvents: wrapperPointerEvents }]}
      collapsable={false}
    >
      {fadeOverlayStyle ? (
        <View style={fadeOverlayStyle} pointerEvents="none" />
      ) : null}

      <View style={[styles.card, layoutStyle]}>
        <View style={styles.mainRow}>
          <Pressable
            style={({ pressed }) => [styles.leading, pressed && styles.leadingPressed]}
            onPress={onOpenFullScreen}
            android_ripple={{ color: "rgba(255,255,255,0.06)" }}
          >
            <View style={styles.artFrame}>
              {uri ? (
                <ProgressiveImage
                  source={{ uri }}
                  style={styles.art}
                  contentFit="cover"
                  placeholder={
                    <View style={styles.artPh}>
                      <Ionicons name="musical-notes" size={20} color={ACCENT} />
                    </View>
                  }
                />
              ) : (
                <View style={styles.artPh}>
                  <Ionicons name="musical-notes" size={20} color={ACCENT} />
                </View>
              )}
            </View>

            <View style={styles.textBlock}>
              <Text style={styles.titleLine} numberOfLines={1} ellipsizeMode="tail">
                <Text style={styles.titleBold}>{title}</Text>
                <Text style={styles.titleDot}> • </Text>
                <Text style={styles.titleArtist}>{artist}</Text>
              </Text>
              <View style={styles.deviceRow}>
                <Ionicons name="bluetooth-outline" size={15} color={ACCENT} />
                <Text style={styles.deviceLabel} numberOfLines={1}>
                  R/HOOD
                </Text>
              </View>
            </View>
          </Pressable>

          <View style={styles.trailing}>
            <Ionicons name="headset-outline" size={22} color={ACCENT} />
            <Pressable
              style={({ pressed }) => [styles.playHit, pressed && styles.hitPressed]}
              onPress={onPlayPause}
              hitSlop={{ top: 14, bottom: 14, left: 14, right: 8 }}
              accessibilityLabel={isPlaying ? "Pause" : "Play"}
              accessibilityRole="button"
            >
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={28}
                color={PLAYED}
                style={isPlaying ? undefined : styles.playIconNudge}
              />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.closeHit, pressed && styles.hitPressed]}
              onPress={onClose}
              hitSlop={12}
              accessibilityLabel="Stop playback"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={20} color="hsl(0, 0%, 45%)" />
            </Pressable>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    zIndex: 10000,
    elevation: 10000,
  },
  card: {
    position: "absolute",
    overflow: "hidden",
    backgroundColor: BAR_BG,
    borderRadius: 10,
    zIndex: 10001,
    elevation: 21,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 12,
    paddingRight: 10,
    paddingTop: 10,
    paddingBottom: 10,
    minHeight: 64,
  },
  leading: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
    marginRight: 8,
  },
  leadingPressed: {
    opacity: 0.94,
  },
  artFrame: {
    width: 48,
    height: 48,
    borderRadius: 6,
    overflow: "hidden",
    marginRight: 12,
    backgroundColor: "hsl(0, 0%, 18%)",
  },
  art: {
    width: 48,
    height: 48,
  },
  artPh: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    gap: 4,
  },
  titleLine: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    lineHeight: 18,
  },
  titleBold: {
    fontWeight: "700",
    color: "hsl(0, 0%, 100%)",
  },
  titleDot: {
    fontWeight: "400",
    color: ARTIST_MUTED,
  },
  titleArtist: {
    fontWeight: "400",
    color: ARTIST_MUTED,
  },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  deviceLabel: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: ACCENT,
    flex: 1,
  },
  trailing: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    gap: 4,
  },
  playHit: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  playIconNudge: {
    marginLeft: 4,
  },
  closeHit: {
    width: 32,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  hitPressed: {
    opacity: 0.75,
  },
  progressTrack: {
    height: 2,
    backgroundColor: TRACK_BG,
    width: "100%",
  },
  progressFill: {
    height: "100%",
    backgroundColor: PLAYED,
  },
});

export default memo(MiniPlayerBar);
