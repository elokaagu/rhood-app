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
  StyleSheet,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAudioState, useAudioActions } from "../context/AudioContext";
import MiniPlayerBar from "./MiniPlayerBar";
import FullScreenPlayerModal from "./FullScreenPlayerModal";
import {
  TAB_BAR_HIDDEN_SCREEN_IDS,
  ANCHORED_TAB_BAR_CONTENT_HEIGHT,
} from "../navigation/routes";

/** Horizontal inset for mini player card (anchored tab bar is full width). */
const MINI_PLAYER_GUTTER = 16;

const MINI_PLAYER_GAP_ABOVE_TAB = 8;

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
  const lastOpenedTrackIdRef = useRef(null);
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

  const hideMini = TAB_BAR_HIDDEN_SCREEN_IDS.includes(currentScreen);
  const showMini = !!track && !hideMini;

  const pause = () => actionsRef?.current?.pauseGlobalAudio?.();
  const resume = () => actionsRef?.current?.resumeGlobalAudio?.();
  const stop = () => actionsRef?.current?.stopGlobalAudio?.();
  const play = (t) => actionsRef?.current?.playGlobalAudio?.(t);
  const toggleLike = () => actionsRef?.current?.toggleLike?.();
  const clearQueue = () => actionsRef?.current?.clearQueue?.();
  const moveUp = (i) => actionsRef?.current?.moveQueueItemUp?.(i);
  const moveDown = (i) => actionsRef?.current?.moveQueueItemDown?.();

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

  const onFullScreenNext = useCallback(() => {
    void actionsRef?.current?.skipForward?.();
  }, []);

  const onFullScreenPrevious = useCallback(() => {
    void actionsRef?.current?.skipBackward?.();
  }, []);

  const onClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    stop();
  }, []);

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
  const durationUnknown = !!track && durationMillis === 0;

  const miniBarLayoutStyle = useMemo(() => {
    const tabBarVisible = !TAB_BAR_HIDDEN_SCREEN_IDS.includes(currentScreen);
    const stackAboveBottom = tabBarVisible
      ? ANCHORED_TAB_BAR_CONTENT_HEIGHT + MINI_PLAYER_GAP_ABOVE_TAB
      : 12;
    return {
      left: MINI_PLAYER_GUTTER + insets.left,
      right: MINI_PLAYER_GUTTER + insets.right,
      bottom: stackAboveBottom + insets.bottom,
    };
  }, [currentScreen, insets.left, insets.right, insets.bottom]);

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

  /** Queue modal: pass-through touches; mini must not cover other modals. */
  const miniBarPointerEvents = queueVisible ? "none" : "box-none";

  return (
    <>
      {/* Unmount mini bar while full-screen player is open — high zIndex/elevation can still steal touches on some OS builds even with pointerEvents="none". */}
      {!fullScreenVisible ? (
        <MiniPlayerBar
          track={track}
          isPlaying={!!state.isPlaying}
          positionMillis={state.positionMillis ?? 0}
          durationMillis={durationMillis}
          durationUnknown={durationUnknown}
          onOpenFullScreen={() => setFullScreenVisible(true)}
          onPlayPause={onPlayPause}
          onClose={onClose}
          layoutStyle={miniBarLayoutStyle}
          wrapperPointerEvents={miniBarPointerEvents}
          fadeOverlayStyle={playBarFadeStyle}
        />
      ) : null}

      <FullScreenPlayerModal
        visible={fullScreenVisible}
        onClose={() => setFullScreenVisible(false)}
        overlayStyle={s.fullScreenPlayerOverlay}
        track={track}
        playbackError={state.error}
        positionMillis={state.positionMillis ?? 0}
        durationMillis={durationMillis}
        onSeekToPosition={(ms) =>
          actionsRef?.current?.seekToPosition?.(ms)
        }
        onBeginScrubbing={() => actionsRef?.current?.beginScrubbing?.()}
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
        isPlaying={!!state.isPlaying}
        onPlayPause={onPlayPause}
        onNextTrack={onFullScreenNext}
        onPreviousTrack={onFullScreenPrevious}
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
