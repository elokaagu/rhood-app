/**
 * Full-screen now playing — large art, metadata, Share / Queue.
 * Uses shared tokens (COLORS, TYPOGRAPHY, SPACING, RADIUS), ProgressiveImage,
 * memoized artwork, and list/scroll perf patterns from lib/performanceConstants.
 */
import React, { useMemo, useState, useCallback, useRef, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  Modal,
  Platform,
  StatusBar,
  ScrollView,
  useWindowDimensions,
  Animated,
  PanResponder,
  Dimensions,
} from "react-native";
import {
  SafeAreaView,
  SafeAreaProvider,
  useSafeAreaInsets,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import ProgressiveImage from "./ProgressiveImage";
import FullScreenPlaybackSlider from "./FullScreenPlaybackSlider";
import { HapticPatterns } from "../lib/haptics";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from "../lib/sharedStyles";
import { LIST_PERFORMANCE } from "../lib/performanceConstants";

/** Slightly lifted from pure black — matches in-player canvas used elsewhere */
const FULL_PLAYER_CANVAS = "hsl(0, 0%, 7%)";

const NowPlayingArtwork = memo(function NowPlayingArtwork({ artUri, artSize }) {
  const placeholder = (
    <View style={styles.artPlaceholderInner}>
      <Ionicons
        name="musical-notes"
        size={Math.round(artSize * 0.22)}
        color={COLORS.primary}
      />
    </View>
  );

  return (
    <View style={[styles.artShadow, { width: artSize, height: artSize }]}>
      <View style={[styles.artFrame, { width: artSize, height: artSize }]}>
        {artUri ? (
          <ProgressiveImage
            source={{ uri: artUri }}
            style={{ width: artSize, height: artSize }}
            placeholder={placeholder}
            contentFit="cover"
            transition={220}
          />
        ) : (
          <View style={styles.artPlaceholder}>{placeholder}</View>
        )}
      </View>
    </View>
  );
});

/**
 * Modal content must sit under SafeAreaProvider + useSafeAreaInsets — RN Modal often
 * doesn’t inherit the app’s safe area, so the dismiss chevron ends up under the notch.
 */
function FullScreenPlayerModalBody({
  onClose,
  track,
  playbackError,
  positionMillis,
  durationMillis,
  onSeekToPosition,
  onBeginScrubbing,
  onToggleLike,
  onShare,
  onAddToPlaylist,
  onAddToQueue,
  canRemoveFromPlaylist,
  onRemoveFromPlaylist,
  onArtistPress,
  onOpenQueue,
  isPlaying,
  onPlayPause,
  onNextTrack,
  onPreviousTrack,
}) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const [moreMenuVisible, setMoreMenuVisible] = useState(false);
  const scrollYRef = useRef(0);
  const moreMenuOpenRef = useRef(false);
  moreMenuOpenRef.current = moreMenuVisible;
  const dragY = useRef(new Animated.Value(0)).current;

  /** Top inset inside Modal (often 0 without nested SafeAreaProvider). */
  const topInset = Math.max(
    insets.top,
    Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0
  );

  const artUri = useMemo(
    () => track?.image || track?.artwork_url || track?.image_url,
    [track?.image, track?.artwork_url, track?.image_url]
  );

  const artSize = useMemo(
    () =>
      Math.min(
        windowWidth - SPACING.lg * 2,
        Math.floor(windowWidth * 0.92)
      ),
    [windowWidth]
  );

  const title = String(track.title ?? "Unknown track").trim() || "Unknown track";
  const artist = String(track.artist ?? "Unknown").trim() || "Unknown";
  const liked = !!track.isLiked;

  const mixDescription = useMemo(() => {
    const raw = track?.description;
    if (typeof raw !== "string") return "";
    const t = raw.trim();
    if (!t || /^no description/i.test(t)) return "";
    return t;
  }, [track?.description]);

  const mixGenre =
    typeof track?.genre === "string" && track.genre.trim() ? track.genre.trim() : "";

  const djBio = useMemo(() => {
    const raw = track?.user_bio ?? track?.user?.bio;
    if (typeof raw !== "string") return "";
    return raw.trim();
  }, [track?.user_bio, track?.user?.bio]);

  const hasAboutMix = Boolean(mixDescription || mixGenre);
  const hasAboutDj = Boolean(djBio);

  const handleClose = useCallback(() => {
    dragY.setValue(0);
    void HapticPatterns.backButton();
    onClose();
  }, [dragY, onClose]);

  const completeSwipeDismiss = useCallback(() => {
    setMoreMenuVisible(false);
    const h = Dimensions.get("window").height;
    Animated.timing(dragY, {
      toValue: Math.min(h * 0.5, 520),
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      dragY.setValue(0);
      void HapticPatterns.backButton();
      onClose();
    });
  }, [dragY, onClose]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          !moreMenuOpenRef.current &&
          scrollYRef.current <= 0.5 &&
          g.dy > 14 &&
          g.dy > Math.abs(g.dx) * 0.85,
        onPanResponderMove: (_, g) => {
          if (g.dy > 0) {
            dragY.setValue(g.dy);
          }
        },
        onPanResponderRelease: (_, g) => {
          const shouldDismiss = g.dy > 110 || (g.vy > 0 && g.vy > 1.2);
          if (shouldDismiss) {
            completeSwipeDismiss();
          } else {
            Animated.spring(dragY, {
              toValue: 0,
              useNativeDriver: true,
              friction: 8,
              tension: 80,
            }).start();
          }
        },
      }),
    [dragY, completeSwipeDismiss]
  );

  const openOverflow = useCallback(() => {
    void HapticPatterns.itemPress();
    setMoreMenuVisible(true);
  }, []);

  const closeMoreMenu = useCallback(() => setMoreMenuVisible(false), []);

  const onPressShare = useCallback(() => {
    closeMoreMenu();
    onShare?.();
  }, [closeMoreMenu, onShare]);

  const onPressQueue = useCallback(() => {
    closeMoreMenu();
    onOpenQueue?.();
  }, [closeMoreMenu, onOpenQueue]);

  const onPressAddToPlaylist = useCallback(() => {
    closeMoreMenu();
    onAddToPlaylist?.();
  }, [closeMoreMenu, onAddToPlaylist]);

  const onPressAddToQueue = useCallback(() => {
    closeMoreMenu();
    onAddToQueue?.();
  }, [closeMoreMenu, onAddToQueue]);

  const onPressRemoveFromPlaylist = useCallback(() => {
    closeMoreMenu();
    onRemoveFromPlaylist?.();
  }, [closeMoreMenu, onRemoveFromPlaylist]);

  const handleToggleLike = useCallback(() => {
    void HapticPatterns.like();
    onToggleLike?.();
  }, [onToggleLike]);

  const handleShare = useCallback(() => {
    void HapticPatterns.share();
    onShare?.();
  }, [onShare]);

  const handleOpenQueue = useCallback(() => {
    void HapticPatterns.itemPress();
    onOpenQueue?.();
  }, [onOpenQueue]);

  const scrollContentStyle = useMemo(
    () => [
      styles.scrollContent,
      {
        paddingBottom: Math.max(SPACING.xl, insets.bottom + SPACING.lg),
      },
    ],
    [insets.bottom]
  );

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <Animated.View
        style={[
          styles.sheetDraggable,
          { transform: [{ translateY: dragY }] },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Top: explicit inset — Modal doesn’t inherit app safe area without nested SafeAreaProvider */}
        <View style={[styles.topBar, { paddingTop: topInset }]}>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.iconHit}
            hitSlop={14}
            accessibilityLabel="Minimize player"
            accessibilityRole="button"
            activeOpacity={0.65}
          >
            <Ionicons name="chevron-down" size={30} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.topBarCenter} pointerEvents="none" />
          <TouchableOpacity
            onPress={openOverflow}
            style={styles.iconHit}
            hitSlop={14}
            accessibilityLabel="More options"
            accessibilityRole="button"
            activeOpacity={0.65}
          >
            <Ionicons name="ellipsis-horizontal" size={26} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={scrollContentStyle}
          showsVerticalScrollIndicator={false}
          bounces
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          scrollEventThrottle={16}
          onScroll={(e) => {
            scrollYRef.current = e.nativeEvent.contentOffset.y;
          }}
          removeClippedSubviews={
            Platform.OS === "android" && LIST_PERFORMANCE.REMOVE_CLIPPED_SUBVIEWS
          }
          {...(Platform.OS === "android" ? { overScrollMode: "never" } : {})}
        >
            <NowPlayingArtwork artUri={artUri} artSize={artSize} />

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
                <TouchableOpacity
                  onPress={handleToggleLike}
                  style={styles.metaIconBtn}
                  hitSlop={10}
                  accessibilityLabel={liked ? "Unlike" : "Like"}
                  activeOpacity={0.65}
                >
                  <Ionicons
                    name={liked ? "heart" : "heart-outline"}
                    size={26}
                    color={liked ? COLORS.primary : COLORS.textPrimary}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleShare}
                  style={styles.metaIconBtn}
                  hitSlop={10}
                  accessibilityLabel="Share"
                  activeOpacity={0.65}
                >
                  <Ionicons name="share-outline" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.transportRow}>
              <TouchableOpacity
                onPress={onPreviousTrack}
                style={styles.transportSideHit}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel="Previous track"
                accessibilityRole="button"
                activeOpacity={0.65}
              >
                <Ionicons name="play-skip-back" size={34} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onPlayPause}
                style={styles.transportPlayOuter}
                hitSlop={8}
                accessibilityLabel={isPlaying ? "Pause" : "Play"}
                accessibilityRole="button"
                activeOpacity={0.85}
              >
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={38}
                  color={FULL_PLAYER_CANVAS}
                  style={!isPlaying ? styles.transportPlayIconNudge : undefined}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onNextTrack}
                style={styles.transportSideHit}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel="Next track"
                accessibilityRole="button"
                activeOpacity={0.65}
              >
                <Ionicons name="play-skip-forward" size={34} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <FullScreenPlaybackSlider
              positionMillis={positionMillis}
              durationMillis={durationMillis}
              onSeekToPosition={onSeekToPosition}
              onBeginScrubbing={onBeginScrubbing}
            />

            {playbackError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText} numberOfLines={3}>
                  {playbackError}
                </Text>
              </View>
            ) : null}

            <View style={styles.bottomSection}>
              <View style={styles.bottomActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.bottomActionPill,
                    pressed && styles.bottomActionPillPressed,
                  ]}
                  onPress={handleShare}
                  accessibilityLabel="Share"
                  accessibilityRole="button"
                  android_ripple={{ color: "rgba(255,255,255,0.08)" }}
                >
                  <Ionicons name="share-outline" size={22} color={COLORS.textPrimary} />
                  <Text style={styles.bottomActionLabel}>Share</Text>
                </Pressable>

                <View style={styles.bottomActionSpacer} />

                <Pressable
                  style={({ pressed }) => [
                    styles.bottomActionPill,
                    pressed && styles.bottomActionPillPressed,
                  ]}
                  onPress={handleOpenQueue}
                  accessibilityLabel="Queue"
                  accessibilityRole="button"
                  android_ripple={{ color: "rgba(255,255,255,0.08)" }}
                >
                  <Ionicons name="list" size={22} color={COLORS.textPrimary} />
                  <Text style={styles.bottomActionLabel}>Queue</Text>
                </Pressable>
              </View>

              {hasAboutMix ? (
                <View style={styles.aboutBlock}>
                  <Text style={styles.aboutHeading}>About this mix</Text>
                  {mixGenre ? (
                    <Text style={styles.aboutMeta} numberOfLines={2}>
                      {mixGenre}
                    </Text>
                  ) : null}
                  {mixDescription ? (
                    <Text style={styles.aboutBody}>{mixDescription}</Text>
                  ) : mixGenre ? null : (
                    <Text style={styles.aboutBodyMuted}>No description for this mix yet.</Text>
                  )}
                </View>
              ) : null}

              {hasAboutDj ? (
                <View style={styles.aboutBlock}>
                  <Text style={styles.aboutHeading}>About this DJ</Text>
                  <Text style={styles.aboutBody}>{djBio}</Text>
                  {track?.user_id && onArtistPress ? (
                    <TouchableOpacity
                      onPress={onArtistPress}
                      activeOpacity={0.65}
                      style={styles.aboutLinkRow}
                      accessibilityLabel="View DJ profile"
                      accessibilityRole="button"
                    >
                      <Text style={styles.aboutLink}>View profile</Text>
                      <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}
            </View>
        </ScrollView>
      </Animated.View>

      {moreMenuVisible ? (
        <View style={styles.moreRoot} pointerEvents="box-none">
          <Pressable
            style={styles.moreBackdrop}
            onPress={closeMoreMenu}
            accessibilityLabel="Dismiss menu"
            accessibilityRole="button"
          />
          <View
            style={[
              styles.moreSheet,
              { paddingBottom: Math.max(insets.bottom, SPACING.md) },
            ]}
          >
            <View style={styles.moreAccentBar} />
            <Text style={styles.moreTitle}>More</Text>
            <TouchableOpacity
              style={styles.moreRow}
              onPress={onPressShare}
              activeOpacity={0.65}
              accessibilityLabel="Share track"
              accessibilityRole="button"
            >
              <View style={styles.moreIconWrap}>
                <Ionicons name="share-outline" size={22} color={COLORS.primary} />
              </View>
              <Text style={styles.moreRowLabel}>Share</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
            </TouchableOpacity>
            <View style={styles.moreHairline} />
            <TouchableOpacity
              style={styles.moreRow}
              onPress={onPressAddToPlaylist}
              activeOpacity={0.65}
              accessibilityLabel="Add to playlist"
              accessibilityRole="button"
            >
              <View style={styles.moreIconWrap}>
                <Ionicons name="add-circle-outline" size={22} color={COLORS.primary} />
              </View>
              <Text style={styles.moreRowLabel}>Add to playlist</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
            </TouchableOpacity>
            <View style={styles.moreHairline} />
            <TouchableOpacity
              style={styles.moreRow}
              onPress={onPressAddToQueue}
              activeOpacity={0.65}
              accessibilityLabel="Add to queue"
              accessibilityRole="button"
            >
              <View style={styles.moreIconWrap}>
                <Ionicons name="add-outline" size={22} color={COLORS.primary} />
              </View>
              <Text style={styles.moreRowLabel}>Add to queue</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
            </TouchableOpacity>
            <View style={styles.moreHairline} />
            {canRemoveFromPlaylist ? (
              <>
                <TouchableOpacity
                  style={styles.moreRow}
                  onPress={onPressRemoveFromPlaylist}
                  activeOpacity={0.65}
                  accessibilityLabel="Remove from playlist"
                  accessibilityRole="button"
                >
                  <View style={styles.moreIconWrap}>
                    <Ionicons name="remove-circle-outline" size={22} color={COLORS.primary} />
                  </View>
                  <Text style={styles.moreRowLabel}>Remove from playlist</Text>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
                </TouchableOpacity>
                <View style={styles.moreHairline} />
              </>
            ) : null}
            <TouchableOpacity
              style={styles.moreRow}
              onPress={onPressQueue}
              activeOpacity={0.65}
              accessibilityLabel="View queue"
              accessibilityRole="button"
            >
              <View style={styles.moreIconWrap}>
                <Ionicons name="list" size={22} color={COLORS.primary} />
              </View>
              <Text style={styles.moreRowLabel}>View queue</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.moreCancelBtn}
              onPress={closeMoreMenu}
              activeOpacity={0.65}
              accessibilityLabel="Cancel"
              accessibilityRole="button"
            >
              <Text style={styles.moreCancelLabel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function FullScreenPlayerModal({
  visible,
  onClose,
  track,
  playbackError,
  positionMillis,
  durationMillis,
  onSeekToPosition,
  onBeginScrubbing,
  onToggleLike,
  onShare,
  onAddToPlaylist,
  onAddToQueue,
  canRemoveFromPlaylist,
  onRemoveFromPlaylist,
  onArtistPress,
  onOpenQueue,
  isPlaying,
  onPlayPause,
  onNextTrack,
  onPreviousTrack,
  overlayStyle,
}) {
  if (!track) return null;

  return (
    <Modal
      visible={visible}
      transparent={Platform.OS === "android"}
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "fullScreen" : undefined}
      onRequestClose={onClose}
    >
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <GestureHandlerRootView style={[styles.overlay, overlayStyle]}>
          <FullScreenPlayerModalBody
            onClose={onClose}
            track={track}
            playbackError={playbackError}
            positionMillis={positionMillis}
            durationMillis={durationMillis}
            onSeekToPosition={onSeekToPosition}
            onBeginScrubbing={onBeginScrubbing}
            onToggleLike={onToggleLike}
            onShare={onShare}
        onAddToPlaylist={onAddToPlaylist}
        onAddToQueue={onAddToQueue}
        canRemoveFromPlaylist={canRemoveFromPlaylist}
        onRemoveFromPlaylist={onRemoveFromPlaylist}
            onArtistPress={onArtistPress}
            onOpenQueue={onOpenQueue}
            isPlaying={isPlaying}
            onPlayPause={onPlayPause}
            onNextTrack={onNextTrack}
            onPreviousTrack={onPreviousTrack}
          />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: FULL_PLAYER_CANVAS,
  },
  safe: {
    flex: 1,
    position: "relative",
  },
  sheetDraggable: {
    flex: 1,
  },
  moreRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    justifyContent: "flex-end",
  },
  moreBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlayLight,
  },
  moreSheet: {
    backgroundColor: COLORS.backgroundSecondary,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },
  moreAccentBar: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
    marginBottom: SPACING.md,
    opacity: 0.85,
  },
  moreTitle: {
    fontFamily: TYPOGRAPHY.primary,
    fontSize: TYPOGRAPHY.xs,
    fontWeight: "600",
    letterSpacing: 1.4,
    color: COLORS.textTertiary,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: SPACING.sm,
  },
  moreRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  moreIconWrap: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.base,
    backgroundColor: "rgba(183, 255, 60, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  moreRowLabel: {
    flex: 1,
    fontFamily: TYPOGRAPHY.primary,
    fontSize: TYPOGRAPHY.lg,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  moreHairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
    marginLeft: 40 + SPACING.md,
  },
  moreCancelBtn: {
    marginTop: SPACING.sm,
    paddingVertical: SPACING.md,
    alignItems: "center",
  },
  moreCancelLabel: {
    fontFamily: TYPOGRAPHY.primary,
    fontSize: TYPOGRAPHY.base,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.xs,
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
    paddingHorizontal: SPACING.lg,
    alignItems: "center",
  },
  /** Solid fill so iOS can compute the shadow efficiently (RN warning otherwise). */
  artShadow: {
    marginTop: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.backgroundCard,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 16,
  },
  artFrame: {
    borderRadius: RADIUS.md,
    overflow: "hidden",
    backgroundColor: COLORS.backgroundTertiary,
  },
  artPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.backgroundTertiary,
  },
  artPlaceholderInner: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    width: "100%",
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.xs,
  },
  metaText: {
    flex: 1,
    marginRight: SPACING.md,
    minWidth: 0,
  },
  trackTitle: {
    fontSize: TYPOGRAPHY["2xl"],
    /** Single face — do not set fontWeight or iOS/Android may substitute system UI. */
    fontFamily: "TS Block Bold",
    color: COLORS.textPrimary,
    letterSpacing: 0.2,
    lineHeight: 28,
  },
  artistPress: {
    marginTop: SPACING.sm,
    alignSelf: "flex-start",
  },
  artist: {
    fontSize: TYPOGRAPHY.lg,
    fontFamily: TYPOGRAPHY.primary,
    fontWeight: TYPOGRAPHY.normal,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  metaActions: {
    flexDirection: "column",
    alignItems: "center",
    gap: SPACING.lg,
    paddingTop: SPACING.xs,
  },
  metaIconBtn: {
    padding: 4,
  },
  transportRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    gap: SPACING.xl,
  },
  transportSideHit: {
    minWidth: 52,
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
  },
  transportPlayOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  transportPlayIconNudge: {
    marginLeft: 4,
  },
  errorBanner: {
    marginTop: SPACING.lg,
    width: "100%",
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.base,
    backgroundColor: "hsl(0, 75%, 55%, 0.12)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.error,
  },
  errorText: {
    fontSize: TYPOGRAPHY.sm,
    fontFamily: TYPOGRAPHY.primary,
    fontWeight: TYPOGRAPHY.medium,
    color: COLORS.error,
    textAlign: "center",
  },
  bottomSection: {
    width: "100%",
    marginTop: SPACING.xl,
    paddingTop: 0,
  },
  bottomActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  bottomActionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.backgroundCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  bottomActionPillPressed: {
    opacity: 0.88,
  },
  bottomActionSpacer: {
    flex: 1,
  },
  bottomActionLabel: {
    fontSize: TYPOGRAPHY.sm,
    fontFamily: TYPOGRAPHY.primary,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.textPrimary,
  },
  aboutBlock: {
    width: "100%",
    marginTop: SPACING.lg,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.backgroundCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    alignSelf: "stretch",
  },
  aboutHeading: {
    fontSize: TYPOGRAPHY.sm,
    fontFamily: TYPOGRAPHY.primary,
    fontWeight: TYPOGRAPHY.weightBold,
    color: COLORS.primary,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: SPACING.sm,
  },
  aboutMeta: {
    fontSize: TYPOGRAPHY.base,
    fontFamily: TYPOGRAPHY.primary,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  aboutBody: {
    fontSize: TYPOGRAPHY.lg,
    fontFamily: TYPOGRAPHY.primary,
    fontWeight: TYPOGRAPHY.normal,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  aboutBodyMuted: {
    fontSize: TYPOGRAPHY.base,
    fontFamily: TYPOGRAPHY.primary,
    fontWeight: TYPOGRAPHY.normal,
    color: COLORS.textTertiary,
    lineHeight: 20,
  },
  aboutLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    marginTop: SPACING.md,
    alignSelf: "flex-start",
    paddingVertical: SPACING.xs,
  },
  aboutLink: {
    fontSize: TYPOGRAPHY.base,
    fontFamily: TYPOGRAPHY.primary,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.primary,
  },
});

export default FullScreenPlayerModal;
