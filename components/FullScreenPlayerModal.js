/**
 * Full-screen now playing — Spotify-style layout (large art, scrub + remaining time,
 * white main play, shuffle/repeat accents, bottom Share / Queue).
 * R/HOOD lime for brand accents (shuffle on, repeat on, device hint).
 */
import React, { memo, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Image,
  Alert,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

const LIME = "hsl(75, 100%, 60%)";
/** Spotify-like canvas */
const BG = "hsl(0, 0%, 7%)";
const PAD = 20;
const TRACK_GREY = "hsl(0, 0%, 34%)";
const PLAYED_WHITE = "hsl(0, 0%, 100%)";

function formatElapsed(ms) {
  if (ms == null || ms < 0) return "0:00";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}

/** Remaining time like Spotify: `-1:57` */
function formatRemaining(currentMs, durationMs) {
  if (!durationMs || durationMs <= 0) return "–:––";
  const rem = Math.max(0, durationMs - (currentMs ?? 0));
  const s = Math.ceil(rem / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m === 0 && sec === 0) return "-0:00";
  return `-${m}:${sec.toString().padStart(2, "0")}`;
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
  onShare,
  onArtistPress,
  onOpenQueue,
  overlayStyle,
}) {
  const { width: windowWidth } = useWindowDimensions();

  const artUri = useMemo(
    () => track?.image || track?.artwork_url || track?.image_url,
    [track]
  );

  const artSize = useMemo(
    () => Math.min(windowWidth - PAD * 2, Math.floor(windowWidth * 0.92)),
    [windowWidth]
  );

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

  const openOverflow = () => {
    Alert.alert(
      "More",
      undefined,
      [
        { text: "Share", onPress: () => onShare?.() },
        { text: "View queue", onPress: () => onOpenQueue?.() },
        { text: "Cancel", style: "cancel" },
      ],
      { cancelable: true }
    );
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
              hitSlop={14}
              accessibilityLabel="Minimize player"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-down" size={30} color="hsl(0, 0%, 100%)" />
            </Pressable>
            <View style={styles.topBarCenter} />
            <Pressable
              onPress={openOverflow}
              style={styles.iconHit}
              hitSlop={14}
              accessibilityLabel="More options"
              accessibilityRole="button"
            >
              <Ionicons name="ellipsis-horizontal" size={26} color="hsl(0, 0%, 100%)" />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={[styles.artShadow, { width: artSize, height: artSize }]}>
              <View style={[styles.artFrame, { width: artSize, height: artSize }]}>
                {artUri ? (
                  <Image
                    source={{ uri: artUri }}
                    style={styles.artImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.artPlaceholder}>
                    <Ionicons name="musical-notes" size={artSize * 0.22} color={LIME} />
                  </View>
                )}
              </View>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaText}>
                <Text style={styles.trackTitle} numberOfLines={2}>
                  {title}
                </Text>
                <Pressable
                  onPress={onArtistPress}
                  disabled={!track?.user_id}
                  style={styles.artistPress}
                >
                  <Text style={styles.artist} numberOfLines={2}>
                    {artist}
                  </Text>
                </Pressable>
              </View>
              <View style={styles.metaActions}>
                <Pressable
                  onPress={() => onToggleLike?.()}
                  style={styles.metaIconBtn}
                  hitSlop={10}
                  accessibilityLabel={liked ? "Unlike" : "Like"}
                >
                  <Ionicons
                    name={liked ? "heart" : "heart-outline"}
                    size={26}
                    color={liked ? LIME : "hsl(0, 0%, 100%)"}
                  />
                </Pressable>
                <Pressable
                  onPress={() => onShare?.()}
                  style={styles.metaIconBtn}
                  hitSlop={10}
                  accessibilityLabel="Share"
                >
                  <Ionicons name="share-outline" size={24} color="hsl(0, 0%, 100%)" />
                </Pressable>
              </View>
            </View>

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
                <Text style={styles.timeMuted}>{formatElapsed(displayPositionMillis)}</Text>
                <Text style={styles.timeMuted}>
                  {durationUnknown ? "–:––" : formatRemaining(displayPositionMillis, durationMillis)}
                </Text>
              </View>

              {playbackError ? (
                <Text style={styles.errorText} numberOfLines={2}>
                  {playbackError}
                </Text>
              ) : null}
            </View>

            <View style={styles.controlsRow}>
              <View style={styles.shuffleWrap}>
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
                {isShuffled ? <View style={styles.shuffleDot} /> : <View style={styles.shuffleDotSpacer} />}
              </View>

              <Pressable
                style={styles.sideBtn}
                onPress={() => onSkipPrev?.()}
                accessibilityLabel="Previous"
              >
                <Ionicons name="play-skip-back" size={32} color="hsl(0, 0%, 100%)" />
              </Pressable>

              <Pressable
                style={styles.playBtn}
                onPress={handleMainPlay}
                accessibilityLabel={isPlaying ? "Pause" : "Play"}
              >
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={38}
                  color="hsl(0, 0%, 0%)"
                  style={isPlaying ? undefined : { marginLeft: 3 }}
                />
              </Pressable>

              <Pressable
                style={styles.sideBtn}
                onPress={() => onSkipNext?.()}
                accessibilityLabel="Next"
              >
                <Ionicons name="play-skip-forward" size={32} color="hsl(0, 0%, 100%)" />
              </Pressable>

              <Pressable
                style={styles.sideBtn}
                onPress={() => onToggleRepeat?.()}
                accessibilityLabel={`Repeat ${repeatMode ?? "off"}`}
              >
                <Ionicons
                  name="repeat"
                  size={22}
                  color={repeatMode !== "none" ? LIME : "hsl(0, 0%, 55%)"}
                />
              </Pressable>
            </View>

            <View style={styles.bottomSection}>
              <View style={styles.deviceRow}>
                <Ionicons name="headset-outline" size={20} color={LIME} />
                <Text style={styles.deviceText}>Playing on R/HOOD</Text>
              </View>

              <View style={styles.bottomActions}>
                <Pressable
                  style={styles.bottomAction}
                  onPress={() => onShare?.()}
                  accessibilityLabel="Share"
                >
                  <Ionicons name="share-outline" size={22} color="hsl(0, 0%, 100%)" />
                  <Text style={styles.bottomActionLabel}>Share</Text>
                </Pressable>

                <View style={styles.bottomActionSpacer} />

                <Pressable
                  style={styles.bottomAction}
                  onPress={() => onOpenQueue?.()}
                  accessibilityLabel="Queue"
                >
                  <Ionicons name="list" size={22} color="hsl(0, 0%, 100%)" />
                  <Text style={styles.bottomActionLabel}>Queue</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
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
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  topBarCenter: {
    flex: 1,
  },
  iconHit: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: PAD,
    paddingBottom: 28,
    alignItems: "center",
  },
  artShadow: {
    marginTop: 8,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 16,
  },
  artFrame: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "hsl(0, 0%, 14%)",
  },
  artImage: {
    width: "100%",
    height: "100%",
  },
  artPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "hsl(0, 0%, 12%)",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    width: "100%",
    marginTop: 28,
    paddingHorizontal: 2,
  },
  metaText: {
    flex: 1,
    marginRight: 12,
    minWidth: 0,
  },
  trackTitle: {
    fontSize: 22,
    fontFamily: "Helvetica Neue",
    fontWeight: "700",
    color: "hsl(0, 0%, 100%)",
    letterSpacing: 0.2,
    lineHeight: 28,
  },
  artistPress: {
    marginTop: 6,
    alignSelf: "flex-start",
  },
  artist: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "400",
    color: "hsl(0, 0%, 60%)",
    lineHeight: 22,
  },
  metaActions: {
    flexDirection: "column",
    alignItems: "center",
    gap: 20,
    paddingTop: 4,
  },
  metaIconBtn: {
    padding: 4,
  },
  progressBlock: {
    marginTop: 28,
    width: "100%",
  },
  scrubHit: {
    width: "100%",
    height: 40,
    justifyContent: "center",
  },
  trackBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: TRACK_GREY,
    overflow: "hidden",
    width: "100%",
  },
  trackFill: {
    height: "100%",
    backgroundColor: PLAYED_WHITE,
    borderRadius: 2,
  },
  thumb: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: PLAYED_WHITE,
    marginLeft: -6,
    top: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 2,
    elevation: 3,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingHorizontal: 2,
  },
  timeMuted: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    fontWeight: "500",
    color: "hsl(0, 0%, 55%)",
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    color: "hsl(0, 75%, 55%)",
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: 400,
    marginTop: 36,
    paddingHorizontal: 4,
  },
  shuffleWrap: {
    alignItems: "center",
    width: 48,
  },
  shuffleDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: LIME,
    marginTop: 4,
  },
  shuffleDotSpacer: {
    height: 8,
    marginTop: 4,
  },
  sideBtn: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "hsl(0, 0%, 100%)",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomSection: {
    width: "100%",
    marginTop: 40,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "hsl(0, 0%, 18%)",
  },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  deviceText: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: LIME,
  },
  bottomActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 4,
  },
  bottomAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  bottomActionSpacer: {
    flex: 1,
  },
  bottomActionLabel: {
    fontSize: 13,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
  },
});

export default memo(FullScreenPlayerModal);
