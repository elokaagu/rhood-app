/**
 * Full-screen now-playing UI: title / artist / like, scrub bar + times, transport controls.
 * Matches R/HOOD tokens (black canvas, lime accent, TS Block title).
 */
import React, { memo } from "react";
import { View, Text, StyleSheet, Pressable, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

const LIME = "hsl(75, 100%, 60%)";
const BG = "hsl(0, 0%, 0%)";
const PAD = 24;

function formatTime(ms) {
  if (ms == null || ms < 0) return "0:00";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}

function FullScreenPlayerModal({
  visible,
  onClose,
  track,
  isPlaying,
  isShuffled,
  repeatMode,
  playbackError,
  displayPositionMillis,
  durationMillis,
  durationUnknown,
  displayProgress,
  canScrub,
  progressBarRef,
  onProgressBarLayout,
  progressPanHandlers,
  onPlayPause,
  onShuffle,
  onSkipPrev,
  onSkipNext,
  onToggleRepeat,
  onToggleLike,
  onArtistPress,
  onOpenQueue,
  /** Optional overlay style from App.js */
  overlayStyle,
}) {
  if (!track) return null;

  const title = String(track.title ?? "Unknown track").trim() || "Unknown track";
  const artist = String(track.artist ?? "Unknown").trim() || "Unknown";
  const liked = !!track.isLiked;
  const widthPct = Math.max(
    displayProgress * 100,
    displayProgress > 0.001 ? 1.2 : 0
  );
  const thumbLeft = `${Math.min(100, Math.max(0, displayProgress * 100))}%`;

  const handleMainPlay = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPlayPause?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, overlayStyle]}>
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
          <View style={styles.topBar}>
            <Pressable
              onPress={onClose}
              style={styles.iconHit}
              hitSlop={12}
              accessibilityLabel="Close player"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-down" size={28} color="hsl(0, 0%, 100%)" />
            </Pressable>
            <Pressable
              onPress={onOpenQueue}
              style={styles.iconHit}
              hitSlop={12}
              accessibilityLabel="Open queue"
              accessibilityRole="button"
            >
              <Ionicons name="list-outline" size={24} color="hsl(0, 0%, 100%)" />
            </Pressable>
          </View>

          <View style={styles.body}>
            <View style={styles.titleRow}>
              <Text style={styles.trackTitle} numberOfLines={2}>
                {title.toUpperCase()}
              </Text>
              <Pressable
                onPress={() => onToggleLike?.()}
                style={styles.likeHit}
                hitSlop={12}
                accessibilityLabel={liked ? "Unlike" : "Like"}
                accessibilityRole="button"
              >
                <Ionicons
                  name={liked ? "heart" : "heart-outline"}
                  size={26}
                  color={liked ? LIME : "hsl(0, 0%, 70%)"}
                />
              </Pressable>
            </View>

            <Pressable
              onPress={onArtistPress}
              disabled={!track?.user_id}
              style={styles.artistPress}
            >
              <Text style={styles.artist}>{artist}</Text>
            </Pressable>

            <View style={styles.progressBlock}>
              <View
                ref={progressBarRef}
                collapsable={false}
                onLayout={onProgressBarLayout}
                {...(canScrub ? progressPanHandlers : {})}
                style={styles.scrubHit}
                accessibilityLabel="Progress"
                accessibilityRole="adjustable"
                accessibilityHint={canScrub ? "Drag to seek" : undefined}
              >
                <View style={styles.trackBg}>
                  <View style={[styles.trackFill, { width: `${widthPct}%` }]} />
                </View>
                {(canScrub || displayProgress > 0) && (
                  <View style={[styles.thumb, { left: thumbLeft }]} pointerEvents="none" />
                )}
              </View>

              <View style={styles.timeRow}>
                <Text style={styles.timeText}>{formatTime(displayPositionMillis)}</Text>
                <Text style={styles.timeText}>
                  {durationUnknown ? "–:––" : formatTime(durationMillis)}
                </Text>
              </View>

              {playbackError ? (
                <Text style={styles.errorText} numberOfLines={2}>
                  {playbackError}
                </Text>
              ) : null}
            </View>

            <View style={styles.spacer} />

            <View style={styles.controlsRow}>
              <Pressable
                style={styles.sideBtn}
                onPress={() => onShuffle?.()}
                accessibilityLabel={isShuffled ? "Shuffle on" : "Shuffle off"}
              >
                <Ionicons
                  name="shuffle"
                  size={22}
                  color={isShuffled ? LIME : "hsl(0, 0%, 100%)"}
                />
              </Pressable>

              <Pressable
                style={styles.sideBtn}
                onPress={() => onSkipPrev?.()}
                accessibilityLabel="Previous"
              >
                <Ionicons name="play-skip-back" size={28} color="hsl(0, 0%, 100%)" />
              </Pressable>

              <Pressable
                style={styles.playBtn}
                onPress={handleMainPlay}
                accessibilityLabel={isPlaying ? "Pause" : "Play"}
              >
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={36}
                  color="hsl(0, 0%, 0%)"
                />
              </Pressable>

              <Pressable
                style={styles.sideBtn}
                onPress={() => onSkipNext?.()}
                accessibilityLabel="Next"
              >
                <Ionicons name="play-skip-forward" size={28} color="hsl(0, 0%, 100%)" />
              </Pressable>

              <Pressable
                style={styles.sideBtn}
                onPress={() => onToggleRepeat?.()}
                accessibilityLabel={`Repeat ${repeatMode ?? "off"}`}
              >
                <Ionicons
                  name="repeat"
                  size={22}
                  color={repeatMode !== "none" ? LIME : "hsl(0, 0%, 100%)"}
                />
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: BG,
  },
  safe: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: PAD - 4,
    paddingBottom: 8,
  },
  iconHit: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  body: {
    flex: 1,
    paddingHorizontal: PAD,
    paddingTop: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  trackTitle: {
    flex: 1,
    fontFamily: "TS Block Bold",
    fontSize: 22,
    lineHeight: 28,
    color: "hsl(0, 0%, 100%)",
    letterSpacing: 0.8,
  },
  likeHit: {
    paddingTop: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  artistPress: {
    alignSelf: "flex-start",
    marginTop: 10,
  },
  artist: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 55%)",
    fontWeight: "400",
  },
  progressBlock: {
    marginTop: 40,
    width: "100%",
  },
  scrubHit: {
    width: "100%",
    height: 44,
    justifyContent: "center",
  },
  trackBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "hsl(0, 0%, 18%)",
    overflow: "hidden",
    width: "100%",
  },
  trackFill: {
    height: "100%",
    backgroundColor: LIME,
    borderRadius: 2,
  },
  thumb: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: LIME,
    marginLeft: -7,
    top: 15,
    borderWidth: 2,
    borderColor: BG,
    shadowColor: LIME,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingHorizontal: 2,
  },
  timeText: {
    fontSize: 13,
    fontFamily: "Helvetica Neue",
    fontWeight: "500",
    color: "hsl(0, 0%, 100%)",
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    color: "hsl(0, 75%, 55%)",
  },
  spacer: {
    flex: 1,
    minHeight: 24,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingBottom: 28,
    maxWidth: 400,
    width: "100%",
    alignSelf: "center",
  },
  sideBtn: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  playBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: LIME,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: LIME,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 10,
  },
});

export default memo(FullScreenPlayerModal);
