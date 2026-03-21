/**
 * Global Audio Player UI – play bar (mini) + full-screen player + queue.
 * Reads from AudioContext (useAudioState / useAudioActions); playback via actionsRef.
 */
import React, { useState, useCallback, useEffect, useRef, useMemo, memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  PanResponder,
  StyleSheet,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAudioState, useAudioActions } from "../context/AudioContext";
import MiniPlayerBar from "./MiniPlayerBar";
import FullScreenPlayerModal from "./FullScreenPlayerModal";

/** Horizontal inset beyond safe-area left/right — aligns with tab bar margin in AppShell (~16 + insets). */
const MINI_PLAYER_GUTTER = 16;

/**
 * Distance from bottom of SafeAreaView content to mini bar.
 * Tab bar uses bottom: 40 + ~56px intrinsic height + small gap (~8).
 */
const MINI_PLAYER_BOTTOM_OFFSET = 104;

const formatTime = (ms) => {
  if (ms == null || ms < 0) return "0:00";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
};

function GlobalAudioPlayerUI({
  currentScreen,
  currentTrack: currentTrackProp,
  pendingTrack: pendingTrackProp,
  onNavigateToProfile,
  styles: stylesProp,
  globalAudioRef,
}) {
  const state = useAudioState();
  const { setGlobalAudioState, actionsRef } = useAudioActions();
  const insets = useSafeAreaInsets();
  const [fullScreenVisible, setFullScreenVisible] = useState(false);
  const [queueVisible, setQueueVisible] = useState(false);
  const [scrubPositionMillis, setScrubPositionMillis] = useState(null);
  const lastOpenedTrackIdRef = useRef(null);
  const progressBarRef = useRef(null);
  const progressBarLayoutRef = useRef({ x: 0, width: 0 });
  const scrubPositionRef = useRef(null);
  const playPauseGuardRef = useRef(false);

  const s = stylesProp || {};

  // Resolved track: pending (tap) > context current > pending prop
  const track = currentTrackProp ?? state.currentTrack ?? pendingTrackProp;

  // Auto-open full-screen when a new track starts
  useEffect(() => {
    if (track?.id && track.id !== lastOpenedTrackIdRef.current) {
      lastOpenedTrackIdRef.current = track.id;
      setFullScreenVisible(true);
    }
    if (!track?.id) lastOpenedTrackIdRef.current = null;
  }, [track?.id]);

  const hideMini = currentScreen === "messages" || currentScreen === "help-chat";
  const showMini = !!track && !hideMini;

  const seek = useCallback(
    (positionMillis) => {
      actionsRef?.current?.seekToPosition?.(positionMillis);
    },
    [actionsRef]
  );

  const pause = () => actionsRef?.current?.pauseGlobalAudio?.();
  const resume = () => actionsRef?.current?.resumeGlobalAudio?.();
  const stop = () => actionsRef?.current?.stopGlobalAudio?.();
  const play = (t) => actionsRef?.current?.playGlobalAudio?.(t);
  const toggleLike = () => actionsRef?.current?.toggleLike?.();
  const skipNext = () => actionsRef?.current?.skipForward?.();
  const skipPrev = () => actionsRef?.current?.skipBackward?.();
  const clearQueue = () => actionsRef?.current?.clearQueue?.();
  const moveUp = (i) => actionsRef?.current?.moveQueueItemUp?.(i);
  const moveDown = (i) => actionsRef?.current?.moveQueueItemDown?.();
  const toggleShuffle = () => actionsRef?.current?.toggleShuffle?.();

  const onPlayPause = useCallback(() => {
    if (playPauseGuardRef.current) return;
    playPauseGuardRef.current = true;
    setTimeout(() => {
      playPauseGuardRef.current = false;
    }, 400);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (state.isPlaying) pause();
    else resume();
  }, [state.isPlaying]);

  const onClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    stop();
  }, []);

  const toggleRepeat = useCallback(() => {
    setGlobalAudioState((prev) => {
      const modes = ["none", "one", "all"];
      const i = (modes.indexOf(prev.repeatMode) + 1) % modes.length;
      return { ...prev, repeatMode: modes[i] };
    });
  }, [setGlobalAudioState]);

  const shareTrack = useCallback(async () => {
    if (!track) return;
    try {
      await Share.share({
        message: `Check out "${track.title}" by ${track.artist} on R/HOOD!`,
        title: "Share Track",
      });
    } catch (_) {
      /* user cancelled or share unavailable */
    }
  }, [track]);

  const trackDurationMs = (() => {
    const t = track;
    if (!t) return 0;
    if (t.durationMillis > 0) return Math.round(t.durationMillis);
    const sec = t.durationSeconds ?? t.duration;
    if (sec != null && Number(sec) > 0) {
      const n = Number(sec);
      return n > 5_000_000 ? Math.round(n) : Math.round(n * 1000);
    }
    return 0;
  })();
  const durationMillis =
    state.durationMillis > 0
      ? state.durationMillis
      : trackDurationMs > 0
        ? trackDurationMs
        : 0;
  const displayPositionMillis = scrubPositionMillis ?? state.positionMillis ?? 0;
  const rawProgress = durationMillis > 0 ? displayPositionMillis / durationMillis : 0;
  const displayProgress = Math.max(0, Math.min(1, rawProgress));
  const durationUnknown = !!track && durationMillis === 0;
  const canScrub = durationMillis > 0;

  const updateScrubPosition = useCallback(
    (pageX) => {
      const { x, width } = progressBarLayoutRef.current;
      if (width <= 0 || durationMillis <= 0) return null;
      const relativeX = Math.max(0, Math.min(width, pageX - x));
      const ratio = relativeX / width;
      const pos = Math.round(ratio * durationMillis);
      scrubPositionRef.current = pos;
      setScrubPositionMillis(pos);
      return pos;
    },
    [durationMillis]
  );

  const remeasureProgressBar = useCallback(() => {
    requestAnimationFrame(() => {
      progressBarRef.current?.measure((fx, fy, w, h, pageX) => {
        progressBarLayoutRef.current = { x: pageX, width: w };
      });
    });
  }, []);

  const progressBarPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => canScrub,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          canScrub && Math.abs(gestureState.dx) > 2,
        onPanResponderGrant: (evt) => {
          const touchPageX = evt.nativeEvent.pageX;
          progressBarRef.current?.measure((fx, fy, w, h, pageX) => {
            progressBarLayoutRef.current = { x: pageX, width: w };
            updateScrubPosition(touchPageX);
          });
        },
        onPanResponderMove: (evt) => {
          const touchPageX = evt.nativeEvent.pageX;
          if (progressBarLayoutRef.current.width <= 0) {
            progressBarRef.current?.measure((fx, fy, w, h, pageX) => {
              progressBarLayoutRef.current = { x: pageX, width: w };
              updateScrubPosition(touchPageX);
            });
          } else {
            updateScrubPosition(touchPageX);
          }
        },
        onPanResponderRelease: () => {
          const pos = scrubPositionRef.current;
          scrubPositionRef.current = null;
          setScrubPositionMillis(null);
          if (pos != null && durationMillis > 0) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            seek(pos);
          }
        },
        onPanResponderTerminate: () => {
          scrubPositionRef.current = null;
          setScrubPositionMillis(null);
        },
      }),
    [canScrub, durationMillis, seek, updateScrubPosition]
  );

  const miniBarLayoutStyle = useMemo(
    () => ({
      left: MINI_PLAYER_GUTTER + insets.left,
      right: MINI_PLAYER_GUTTER + insets.right,
      bottom: MINI_PLAYER_BOTTOM_OFFSET,
    }),
    [insets.left, insets.right]
  );

  const playBarFadeStyle = useMemo(() => {
    if (!s.playBarFadeOverlay) return null;
    const base = s.playBarFadeOverlay;
    return [
      base,
      {
        left: insets.left,
        right: insets.right,
      },
    ];
  }, [s.playBarFadeOverlay, insets.left, insets.right]);

  if (!showMini) return null;

  /** Full-screen wrapper uses zIndex 10k; without this, it can sit above the Modal and eat all touches. */
  const miniBarPointerEvents =
    fullScreenVisible || queueVisible ? "none" : "box-none";

  return (
    <>
      <MiniPlayerBar
        track={track}
        isPlaying={!!state.isPlaying}
        positionMillis={displayPositionMillis}
        durationMillis={durationMillis}
        durationUnknown={durationUnknown}
        onOpenFullScreen={() => setFullScreenVisible(true)}
        onPlayPause={onPlayPause}
        onClose={onClose}
        layoutStyle={miniBarLayoutStyle}
        wrapperPointerEvents={miniBarPointerEvents}
        fadeOverlayStyle={playBarFadeStyle}
      />

      <FullScreenPlayerModal
        visible={fullScreenVisible}
        onClose={() => setFullScreenVisible(false)}
        overlayStyle={s.fullScreenPlayerOverlay}
        track={track}
        isPlaying={!!state.isPlaying}
        isShuffled={!!state.isShuffled}
        repeatMode={state.repeatMode}
        playbackError={state.error}
        displayPositionMillis={displayPositionMillis}
        durationMillis={durationMillis}
        durationUnknown={durationUnknown}
        displayProgress={displayProgress}
        canScrub={canScrub}
        progressBarRef={progressBarRef}
        onProgressBarLayout={remeasureProgressBar}
        progressPanHandlers={canScrub ? progressBarPanResponder.panHandlers : {}}
        onPlayPause={onPlayPause}
        onShuffle={() => toggleShuffle?.()}
        onSkipPrev={() => skipPrev?.()}
        onSkipNext={() => skipNext?.()}
        onToggleRepeat={toggleRepeat}
        onToggleLike={() => toggleLike?.()}
        onShare={shareTrack}
        onArtistPress={() => {
          if (track?.user_id) {
            setFullScreenVisible(false);
            onNavigateToProfile?.(track.user_id);
          }
        }}
        onOpenQueue={() => {
          setFullScreenVisible(false);
          setQueueVisible(true);
        }}
      />

      {/* ——— Queue modal ——— */}
      <Modal
        visible={queueVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setQueueVisible(false)}
      >
        <View style={s.queueModalOverlay ?? localStyles.queueOverlay}>
          <TouchableOpacity
            style={s.queueModalOverlayTouchable ?? localStyles.queueOverlayTouch}
            onPress={() => setQueueVisible(false)}
          />
          <View style={s.queueModalContainer ?? localStyles.queueContainer}>
            <View style={s.queueModalContent ?? localStyles.queueContent}>
              <View style={s.queueModalHeader ?? localStyles.queueHeader}>
                <Text style={s.queueModalTitle ?? localStyles.queueTitle}>Queue</Text>
                <TouchableOpacity
                  style={s.queueModalClose ?? localStyles.queueClose}
                  onPress={() => setQueueVisible(false)}
                >
                  <Ionicons name="close" size={24} color="hsl(0, 0%, 100%)" />
                </TouchableOpacity>
              </View>
              <ScrollView style={s.queueModalScroll ?? localStyles.queueScroll}>
                {track && (
                  <View style={s.queueItemCurrent ?? localStyles.queueItemCurrent}>
                    <View style={s.queueItemInfo ?? localStyles.queueItemInfo}>
                      <Text style={s.queueItemTitle ?? localStyles.queueItemTitle} numberOfLines={1}>
                        {track.title}
                      </Text>
                      <Text style={s.queueItemArtist ?? localStyles.queueItemArtist} numberOfLines={1}>
                        {track.artist}
                      </Text>
                    </View>
                    <View style={s.queueItemBadge ?? localStyles.queueItemBadge}>
                      <Text style={s.queueItemBadgeText ?? localStyles.queueItemBadgeText}>
                        Now Playing
                      </Text>
                    </View>
                  </View>
                )}
                {state.queue?.length > 0 ? (
                  state.queue.map((t, index) => (
                    <View key={`${t.id}-${index}`} style={s.queueItem ?? localStyles.queueItem}>
                      <TouchableOpacity
                        style={s.queueItemContent ?? localStyles.queueItemContent}
                        onPress={() => {
                          play(t);
                          setQueueVisible(false);
                        }}
                      >
                        <View style={s.queueItemNumber ?? localStyles.queueItemNumber}>
                          <Text style={s.queueItemNumberText ?? localStyles.queueItemNumberText}>
                            {index + 1}
                          </Text>
                        </View>
                        <View style={s.queueItemInfo ?? localStyles.queueItemInfo}>
                          <Text style={s.queueItemTitle ?? localStyles.queueItemTitle} numberOfLines={1}>
                            {t.title}
                          </Text>
                          <Text style={s.queueItemArtist ?? localStyles.queueItemArtist} numberOfLines={1}>
                            {t.artist}
                          </Text>
                        </View>
                      </TouchableOpacity>
                      <View style={s.queueItemActions ?? localStyles.queueItemActions}>
                        {index > 0 && (
                          <TouchableOpacity
                            style={s.queueItemReorderButton ?? localStyles.queueReorderBtn}
                            onPress={() => moveUp(index)}
                          >
                            <Ionicons name="chevron-up" size={18} color="hsl(75, 100%, 60%)" />
                          </TouchableOpacity>
                        )}
                        {index < (state.queue?.length ?? 0) - 1 && (
                          <TouchableOpacity
                            style={s.queueItemReorderButton ?? localStyles.queueReorderBtn}
                            onPress={() => moveDown(index)}
                          >
                            <Ionicons name="chevron-down" size={18} color="hsl(75, 100%, 60%)" />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={s.queueItemRemove ?? localStyles.queueItemRemove}
                          onPress={() =>
                            setGlobalAudioState((p) => ({
                              ...p,
                              queue: p.queue.filter((_, i) => i !== index),
                              currentQueueIndex:
                                p.currentQueueIndex > index
                                  ? p.currentQueueIndex - 1
                                  : p.currentQueueIndex === index
                                    ? -1
                                    : p.currentQueueIndex,
                            }))
                          }
                        >
                          <Ionicons name="close" size={18} color="hsl(0, 0%, 50%)" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={s.queueEmpty ?? localStyles.queueEmpty}>
                    <Ionicons name="musical-notes-outline" size={48} color="hsl(0, 0%, 30%)" />
                    <Text style={s.queueEmptyText ?? localStyles.queueEmptyText}>Queue is empty</Text>
                    <Text style={s.queueEmptySubtext ?? localStyles.queueEmptySubtext}>
                      Add mixes from the Listen tab
                    </Text>
                  </View>
                )}
              </ScrollView>
              {state.queue?.length > 0 && (
                <TouchableOpacity
                  style={s.queueClearButton ?? localStyles.queueClearBtn}
                  onPress={() => {
                    Alert.alert(
                      "Clear Queue?",
                      "Remove all tracks from the queue?",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Clear",
                          style: "destructive",
                          onPress: () => {
                            clearQueue?.();
                            setQueueVisible(false);
                          },
                        },
                      ]
                    );
                  }}
                >
                  <Text style={s.queueClearButtonText ?? localStyles.queueClearBtnText}>
                    Clear Queue
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const localStyles = StyleSheet.create({
  queueOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-end",
  },
  queueOverlayTouch: { flex: 1 },
  queueContainer: {
    backgroundColor: "hsl(0, 0%, 5%)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
    maxHeight: "80%",
  },
  queueContent: { padding: 20 },
  queueHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  queueTitle: {
    fontSize: 24,
    fontFamily: "TS Block Bold",
    fontWeight: "900",
    color: "hsl(0, 0%, 100%)",
  },
  queueClose: { padding: 4 },
  queueScroll: { maxHeight: 500 },
  queueItemCurrent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "hsl(0, 0%, 10%)",
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%)",
    marginBottom: 12,
  },
  queueItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "hsl(0, 0%, 8%)",
    marginBottom: 8,
  },
  queueItemContent: { flex: 1, flexDirection: "row", alignItems: "center" },
  queueItemActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  queueReorderBtn: { padding: 4 },
  queueItemNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "hsl(0, 0%, 15%)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  queueItemNumberText: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 70%)",
  },
  queueItemInfo: { flex: 1 },
  queueItemTitle: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 4,
  },
  queueItemArtist: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
  },
  queueItemBadge: {
    backgroundColor: "hsl(75, 100%, 60%)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  queueItemBadgeText: {
    fontSize: 11,
    fontFamily: "Helvetica Neue",
    fontWeight: "700",
    color: "hsl(0, 0%, 0%)",
  },
  queueItemRemove: { padding: 4, marginLeft: 8 },
  queueEmpty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  queueEmptyText: {
    fontSize: 18,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 50%)",
    marginTop: 16,
    marginBottom: 8,
  },
  queueEmptySubtext: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 40%)",
    textAlign: "center",
  },
  queueClearBtn: {
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: "hsl(0, 0%, 10%)",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 20%)",
    alignItems: "center",
  },
  queueClearBtnText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 100%, 60%)",
  },
});

export default memo(GlobalAudioPlayerUI);
