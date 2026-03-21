/**
 * Floating mini player above the tab bar. Visuals match R/HOOD tokens used in App.js / Discover.
 * Parent supplies absolute left/right/bottom (safe area + tab clearance).
 */
import React, { memo, useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProgressiveImage from "./ProgressiveImage";

const LIME = "hsl(75, 100%, 60%)";
const CARD_BG = "hsl(0, 0%, 8%)";
const BORDER = "hsl(0, 0%, 15%)";

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
  durationUnknown,
  onOpenFullScreen,
  onPlayPause,
  onClose,
  layoutStyle,
  /** 'none' when full-screen or queue modal is open so touches pass through */
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
        <View style={styles.row}>
          <View style={styles.leading}>
            <Pressable
              style={({ pressed }) => [styles.leadingPress, pressed && styles.leadingPressed]}
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
                        <Ionicons name="musical-notes" size={22} color={LIME} />
                      </View>
                    }
                  />
                ) : (
                  <View style={styles.artPh}>
                    <Ionicons name="musical-notes" size={22} color={LIME} />
                  </View>
                )}
              </View>
              <View style={styles.textCol}>
                <Text style={styles.trackTitle} numberOfLines={1}>
                  {title}
                </Text>
                <Text style={styles.trackArtist} numberOfLines={1}>
                  {artist}
                </Text>
              </View>
            </Pressable>
          </View>

          <View style={styles.trailing}>
            <Text
              style={styles.time}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {formatMiniTime(positionMillis)} /{" "}
              {durationUnknown ? "–:––" : formatMiniTime(durationMillis)}
            </Text>
            <Pressable
              style={({ pressed }) => [styles.play, pressed && styles.playPressed]}
              onPress={onPlayPause}
              hitSlop={10}
              accessibilityLabel={isPlaying ? "Pause" : "Play"}
              accessibilityRole="button"
            >
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={22}
                color="hsl(0, 0%, 0%)"
              />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.iconPlain, pressed && styles.playPressed]}
              onPress={onClose}
              hitSlop={10}
              accessibilityLabel="Stop playback"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={22} color="hsl(0, 0%, 55%)" />
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
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    zIndex: 10001,
    elevation: 21,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  /** Flex slot for “tap to expand” — no row direction here (that’s on leadingPress). */
  leading: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
    justifyContent: "center",
  },
  leadingPress: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },
  leadingPressed: {
    opacity: 0.92,
  },
  artFrame: {
    width: 48,
    height: 48,
    borderRadius: 8,
    overflow: "hidden",
    marginRight: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "hsl(0, 0%, 22%)",
    backgroundColor: "hsl(0, 0%, 14%)",
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
  textCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  trackTitle: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "700",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 2,
  },
  trackArtist: {
    fontSize: 13,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 65%)",
  },
  trailing: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    flexWrap: "nowrap",
    gap: 6,
  },
  time: {
    fontSize: 11,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 48%)",
    marginRight: 2,
    maxWidth: 86,
    flexShrink: 1,
  },
  play: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: LIME,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: LIME,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  playPressed: {
    opacity: 0.9,
  },
  iconPlain: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  progressTrack: {
    height: 3,
    backgroundColor: "hsl(0, 0%, 16%)",
    width: "100%",
  },
  progressFill: {
    height: "100%",
    backgroundColor: LIME,
  },
});

export default memo(MiniPlayerBar);
