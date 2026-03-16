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
  Image,
  Share,
  Alert,
  PanResponder,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAudioState, useAudioActions } from "../context/AudioContext";
import ProgressiveImage from "./ProgressiveImage";

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
  const [fullScreenVisible, setFullScreenVisible] = useState(false);
  const [queueVisible, setQueueVisible] = useState(false);
  const [scrubPositionMillis, setScrubPositionMillis] = useState(null);
  const lastOpenedTrackIdRef = useRef(null);
  const progressBarWidthRef = useRef(0);
  const scrubPositionRef = useRef(null);
  const playPauseGuardRef = useRef(false);
  const lastSeekAtRef = useRef(0);

  const s = stylesProp || {};
  const SEEK_DEBOUNCE_MS = 350;

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
        message: `Check out "${track.title}" by ${track.artist} on Rhood!`,
        title: "Share Track",
      });
    } catch (e) {
      Alert.alert("Error", "Failed to share");
    }
  }, [track]);

  const durationMillis = state.durationMillis ?? 0;
  const displayPositionMillis = scrubPositionMillis ?? state.positionMillis ?? 0;
  const rawProgress = durationMillis > 0 ? displayPositionMillis / durationMillis : 0;
  const displayProgress = Math.max(0, Math.min(1, rawProgress));
  const durationUnknown = !!track && durationMillis === 0;
  const canScrub = durationMillis > 0;

  const progressBarPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const w = progressBarWidthRef.current;
          if (w <= 0) return;
          const x = evt.nativeEvent.locationX;
          const ratio = Math.max(0, Math.min(1, x / w));
          const pos = Math.round(ratio * durationMillis);
          scrubPositionRef.current = pos;
          setScrubPositionMillis(pos);
        },
        onPanResponderMove: (evt) => {
          const w = progressBarWidthRef.current;
          if (w <= 0) return;
          const x = evt.nativeEvent.locationX;
          const ratio = Math.max(0, Math.min(1, x / w));
          const pos = Math.round(ratio * durationMillis);
          scrubPositionRef.current = pos;
          setScrubPositionMillis(pos);
        },
        onPanResponderRelease: () => {
          const pos = scrubPositionRef.current;
          setScrubPositionMillis(null);
          scrubPositionRef.current = null;
          if (pos != null && durationMillis > 0) {
            const now = Date.now();
            if (now - lastSeekAtRef.current >= SEEK_DEBOUNCE_MS) {
              lastSeekAtRef.current = now;
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              seek(pos);
            }
          }
        },
      }),
    [durationMillis, seek]
  );

  if (!showMini) return null;

  return (
    <>
      {/* ——— Play bar (mini) ——— */}
      <View style={localStyles.miniBarWrapper} collapsable={false}>
        {s.playBarFadeOverlay ? (
          <View style={s.playBarFadeOverlay} pointerEvents="none" />
        ) : null}
        <TouchableOpacity
          style={s.globalAudioPlayer ?? localStyles.miniBar}
          onPress={() => setFullScreenVisible(true)}
          activeOpacity={1}
        >
          <View style={s.audioPlayerContent ?? localStyles.miniBarContent}>
            <View style={s.audioAlbumArt ?? localStyles.miniAlbumArt}>
              {track.image ? (
                <Image
                  source={{ uri: track.image }}
                  style={s.albumArtImage ?? localStyles.albumArtImg}
                  resizeMode="cover"
                />
              ) : (
                <View style={s.albumArtPlaceholder ?? localStyles.albumArtPlaceholder}>
                  <Ionicons name="musical-notes" size={22} color="hsl(75, 100%, 60%)" />
                </View>
              )}
            </View>
            <View style={s.audioTrackInfo ?? localStyles.miniTrackInfo}>
              <Text
                style={s.audioTrackTitle ?? localStyles.miniTitle}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {track.title}
              </Text>
              <Text
                style={s.audioTrackArtist ?? localStyles.miniArtist}
                numberOfLines={1}
              >
                {track.artist}
              </Text>
            </View>
            <Text style={s.audioTimeText ?? localStyles.miniTime}>
              {formatTime(state.positionMillis)} / {formatTime(state.durationMillis)}
            </Text>
            <TouchableOpacity
              style={s.audioControlButton ?? localStyles.miniPlayBtn}
              onPress={(e) => {
                e.stopPropagation();
                onPlayPause();
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name={state.isPlaying ? "pause" : "play"}
                size={22}
                color="hsl(0, 0%, 0%)"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={s.audioCloseButton ?? localStyles.miniCloseBtn}
              onPress={(e) => {
                e.stopPropagation();
                onClose();
              }}
              accessibilityLabel="Stop playback"
            >
              <Ionicons name="close" size={22} color="hsl(0, 0%, 60%)" />
            </TouchableOpacity>
          </View>
          <View style={s.audioProgressContainer ?? localStyles.miniProgressContainer}>
            <View style={s.audioProgressBar ?? localStyles.miniProgressBar}>
              <View
                style={[
                  s.audioProgressFill ?? localStyles.miniProgressFill,
                  { width: `${(state.progress ?? 0) * 100}%` },
                ]}
              />
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* ——— Full-screen player modal ——— */}
      <Modal
        visible={fullScreenVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFullScreenVisible(false)}
      >
        <View style={s.fullScreenPlayerOverlay ?? localStyles.fullOverlay}>
          <View style={s.fullScreenOverlay ?? localStyles.fullOverlayInner} />
          <ScrollView
            style={s.fullScreenPlayer ?? localStyles.fullScroll}
            contentContainerStyle={s.fullScreenPlayerContent ?? localStyles.fullContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={s.fullScreenHeader ?? localStyles.fullHeader}>
              <TouchableOpacity
                style={s.closeButton ?? localStyles.closeBtn}
                onPress={() => setFullScreenVisible(false)}
                accessibilityLabel="Close player"
                accessibilityRole="button"
              >
                <Ionicons name="chevron-down" size={24} color="hsl(0, 0%, 100%)" />
              </TouchableOpacity>
            </View>

            <View style={s.fullScreenAlbumArtContainer ?? localStyles.fullArtContainer}>
              {track.image ? (
                <Image
                  source={{ uri: track.image }}
                  style={s.fullScreenAlbumArt ?? localStyles.fullArt}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[
                    s.fullScreenAlbumArt ?? localStyles.fullArt,
                    localStyles.fullArtPlaceholder,
                  ]}
                >
                  <Ionicons name="musical-notes" size={80} color="hsl(75, 100%, 60%)" />
                </View>
              )}
            </View>

            <View style={s.fullScreenTrackInfo ?? localStyles.fullTrackInfo}>
              <View style={s.fullScreenTrackTitleRow ?? localStyles.fullTitleRow}>
                <Text style={s.fullScreenTrackTitle ?? localStyles.fullTitle}>
                  {track.title}
                </Text>
                <TouchableOpacity
                  style={s.fullScreenLikeButton ?? localStyles.fullLikeBtn}
                  onPress={() => toggleLike?.()}
                  accessibilityLabel={track.isLiked ? "Unlike" : "Like"}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name={track.isLiked ? "heart" : "heart-outline"}
                    size={24}
                    color={track.isLiked ? "hsl(75, 100%, 60%)" : "hsl(0, 0%, 70%)"}
                  />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => {
                  if (track?.user_id) {
                    setFullScreenVisible(false);
                    onNavigateToProfile?.(track.user_id);
                  }
                }}
              >
                <Text style={s.fullScreenTrackArtist ?? localStyles.fullArtist}>
                  {track.artist}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={s.fullScreenProgressSection ?? localStyles.fullProgressSection}>
              <View
                style={s.fullScreenProgressBar ?? localStyles.fullProgressBar}
                onLayout={(e) => {
                  progressBarWidthRef.current = e.nativeEvent.layout.width;
                }}
                {...(canScrub ? progressBarPanResponder.panHandlers : {})}
                accessibilityLabel="Progress bar"
                accessibilityRole="adjustable"
                accessibilityHint={canScrub ? "Drag left or right to seek" : undefined}
              >
                <View
                  style={[
                    s.fullScreenProgressFill ?? localStyles.fullProgressFill,
                    { width: `${displayProgress * 100}%` },
                  ]}
                />
                {canScrub && (
                  <View
                    style={[
                      s.fullScreenProgressThumb ?? localStyles.fullProgressThumb,
                      { left: `${displayProgress * 100}%` },
                    ]}
                    pointerEvents="none"
                  />
                )}
              </View>
              <View style={s.fullScreenTimeContainer ?? localStyles.fullTimeRow}>
                <Text style={s.fullScreenTimeText ?? localStyles.fullTimeText}>
                  {formatTime(displayPositionMillis)}
                </Text>
                {durationUnknown ? (
                  <Text style={[s.fullScreenTimeText ?? localStyles.fullTimeText, { color: "hsl(0, 0%, 50%)" }]}>
                    –:––
                  </Text>
                ) : (
                  <Text style={s.fullScreenTimeText ?? localStyles.fullTimeText}>
                    {formatTime(durationMillis)}
                  </Text>
                )}
              </View>
              {durationUnknown && (
                <Text style={[s.fullScreenTimeText ?? localStyles.fullTimeText, localStyles.preparing]}>
                  Preparing…
                </Text>
              )}
              {state.error ? (
                <Text style={[s.fullScreenTimeText ?? localStyles.fullTimeText, localStyles.error]} numberOfLines={1}>
                  {state.error}
                </Text>
              ) : null}
            </View>

            <View style={s.fullScreenControls ?? localStyles.fullControls}>
              <TouchableOpacity
                style={s.fullScreenControlButton ?? localStyles.controlBtn}
                onPress={() => toggleShuffle?.()}
                accessibilityLabel={state.isShuffled ? "Shuffle on" : "Shuffle off"}
                accessibilityRole="button"
              >
                <Ionicons
                  name="shuffle"
                  size={20}
                  color={state.isShuffled ? "hsl(75, 100%, 60%)" : "hsl(0, 0%, 100%)"}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={s.fullScreenControlButton ?? localStyles.controlBtn}
                onPress={() => skipPrev?.()}
                accessibilityLabel="Previous track"
                accessibilityRole="button"
              >
                <Ionicons name="play-skip-back" size={24} color="hsl(0, 0%, 100%)" />
              </TouchableOpacity>
              <TouchableOpacity
                style={s.fullScreenPlayButton ?? localStyles.playBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onPlayPause();
                }}
                accessibilityLabel={state.isPlaying ? "Pause" : "Play"}
                accessibilityRole="button"
              >
                <Ionicons
                  name={state.isPlaying ? "pause" : "play"}
                  size={32}
                  color="hsl(0, 0%, 0%)"
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={s.fullScreenControlButton ?? localStyles.controlBtn}
                onPress={() => skipNext?.()}
                accessibilityLabel="Next track"
                accessibilityRole="button"
              >
                <Ionicons name="play-skip-forward" size={24} color="hsl(0, 0%, 100%)" />
              </TouchableOpacity>
              <TouchableOpacity
                style={s.fullScreenControlButton ?? localStyles.controlBtn}
                onPress={toggleRepeat}
                accessibilityLabel={`Repeat ${state.repeatMode === "none" ? "off" : state.repeatMode === "one" ? "one" : "all"}`}
                accessibilityRole="button"
              >
                <Ionicons
                  name="repeat"
                  size={20}
                  color={state.repeatMode !== "none" ? "hsl(75, 100%, 60%)" : "hsl(0, 0%, 100%)"}
                />
              </TouchableOpacity>
            </View>

            <View style={s.fullScreenSecondaryActions ?? localStyles.secondaryActions}>
              <TouchableOpacity
                style={s.fullScreenSecondaryButton ?? localStyles.secondaryBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  shareTrack();
                }}
                accessibilityLabel="Share track"
                accessibilityRole="button"
              >
                <Ionicons name="share-outline" size={20} color="hsl(0, 0%, 100%)" />
                <Text style={s.fullScreenSecondaryButtonText ?? localStyles.secondaryBtnText}>
                  Share
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.fullScreenSecondaryButton ?? localStyles.secondaryBtn}
                onPress={() => {
                  setFullScreenVisible(false);
                  setQueueVisible(true);
                }}
                accessibilityLabel="Open queue"
                accessibilityRole="button"
              >
                <Ionicons name="list-outline" size={20} color="hsl(0, 0%, 100%)" />
                <Text style={s.fullScreenSecondaryButtonText ?? localStyles.secondaryBtnText}>
                  Queue
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={s.aboutDJCard ?? localStyles.aboutCard}
              onPress={() => {
                if (track?.user_id) {
                  setFullScreenVisible(false);
                  onNavigateToProfile?.(track.user_id);
                }
              }}
            >
              <View style={s.aboutDJHeader ?? localStyles.aboutHeader}>
                <View style={s.aboutDJAvatar ?? localStyles.aboutAvatar}>
                  <ProgressiveImage
                    source={track?.user_image ? { uri: track.user_image } : null}
                    style={s.aboutDJAvatarImage ?? localStyles.aboutAvatarImg}
                    placeholder={
                      <View style={[localStyles.aboutAvatarImg, localStyles.aboutAvatarPlaceholder]}>
                        <Ionicons name="person" size={24} color="hsl(0, 0%, 50%)" />
                      </View>
                    }
                  />
                </View>
                <View style={s.aboutDJInfo ?? localStyles.aboutInfo}>
                  <Text style={s.aboutDJTitle ?? localStyles.aboutTitle}>About the DJ</Text>
                  <Text style={s.aboutDJName ?? localStyles.aboutName}>
                    {track?.user_dj_name || track?.artist || "DJ"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="hsl(0, 0%, 50%)" />
              </View>
              <Text style={s.aboutDJText ?? localStyles.aboutText}>
                {track?.user_bio || "Discover more about this DJ."}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

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
  miniBarWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    zIndex: 10000,
    elevation: 10000,
    pointerEvents: "box-none",
    justifyContent: "flex-end",
  },
  miniBar: {
    position: "absolute",
    bottom: 120,
    left: 20,
    right: 20,
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    zIndex: 1001,
    elevation: 20,
    minHeight: 70,
  },
  miniBarContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  miniAlbumArt: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: "hsl(0, 0%, 20%)",
  },
  albumArtImg: { width: "100%", height: "100%" },
  albumArtPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "hsl(0, 0%, 15%)",
    justifyContent: "center",
    alignItems: "center",
  },
  miniTrackInfo: { flex: 1, marginRight: 16, justifyContent: "center" },
  miniTitle: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 2,
    lineHeight: 18,
  },
  miniArtist: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
    fontWeight: "400",
  },
  miniTime: {
    fontSize: 11,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 50%)",
    fontWeight: "400",
    letterSpacing: 0.5,
  },
  miniPlayBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "hsl(75, 100%, 60%)",
    justifyContent: "center",
    alignItems: "center",
  },
  miniCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  miniProgressContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "hsl(0, 0%, 15%)",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: "visible",
  },
  miniProgressBar: { height: "100%", backgroundColor: "transparent", position: "relative" },
  miniProgressFill: {
    height: "100%",
    backgroundColor: "hsl(75, 100%, 60%)",
    borderRadius: 0,
  },
  fullOverlay: { flex: 1, backgroundColor: "hsl(0, 0%, 8%)" },
  fullOverlayInner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  fullScroll: { flex: 1, backgroundColor: "transparent", zIndex: 1 },
  fullContent: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 40,
    minHeight: 400,
  },
  fullHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 40,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  fullArtContainer: { alignItems: "center", marginBottom: 32 },
  fullArt: {
    width: 320,
    height: 320,
    borderRadius: 12,
    shadowColor: "hsl(75, 100%, 60%)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  fullArtPlaceholder: {
    backgroundColor: "hsl(0, 0%, 12%)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullTrackInfo: { alignItems: "flex-start", marginBottom: 32, paddingHorizontal: 20 },
  fullTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    gap: 12,
    marginBottom: 8,
  },
  fullTitle: {
    fontSize: 24,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    fontWeight: "900",
    textAlign: "left",
    flex: 1,
    lineHeight: 28,
  },
  fullLikeBtn: { padding: 8, justifyContent: "center", alignItems: "center" },
  fullArtist: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
    textAlign: "left",
    fontWeight: "500",
    marginBottom: 4,
  },
  fullProgressSection: { marginBottom: 32 },
  fullProgressBar: {
    height: 4,
    backgroundColor: "hsla(0, 0%, 20%, 0.3)",
    borderRadius: 2,
    marginBottom: 16,
    position: "relative",
    paddingVertical: 12,
    justifyContent: "center",
  },
  fullProgressFill: {
    height: 4,
    backgroundColor: "hsl(75, 100%, 60%)",
    borderRadius: 2,
    position: "absolute",
    top: 12,
  },
  fullProgressThumb: {
    position: "absolute",
    top: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "hsl(75, 100%, 60%)",
    marginLeft: -6,
  },
  fullTimeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  fullTimeText: {
    fontSize: 14,
    color: "hsl(0, 0%, 70%)",
    fontFamily: "Helvetica Neue",
    fontWeight: "500",
  },
  preparing: { color: "hsl(0, 0%, 45%)", fontSize: 12, marginTop: 4 },
  error: { color: "hsl(0, 80%, 55%)", fontSize: 12, marginTop: 6 },
  fullControls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 32,
    marginLeft: 40,
    marginRight: 40,
    gap: 40,
  },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "hsl(75, 100%, 60%)",
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryActions: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 16,
    paddingHorizontal: 20,
    gap: 24,
  },
  secondaryBtn: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 80,
  },
  secondaryBtnText: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 100%)",
    marginTop: 4,
    fontWeight: "500",
  },
  aboutCard: {
    marginTop: 32,
    marginHorizontal: 24,
    backgroundColor: "hsl(0, 0%, 12%)",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 20%)",
  },
  aboutHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  aboutAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
    borderWidth: 2,
    borderColor: "hsl(75, 100%, 60%)",
    overflow: "hidden",
  },
  aboutAvatarImg: { width: "100%", height: "100%" },
  aboutAvatarPlaceholder: {
    backgroundColor: "hsl(0, 0%, 15%)",
    justifyContent: "center",
    alignItems: "center",
  },
  aboutInfo: { flex: 1 },
  aboutTitle: {
    fontSize: 16,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    fontWeight: "600",
    marginBottom: 4,
  },
  aboutName: { fontSize: 14, color: "hsl(75, 100%, 60%)", fontWeight: "500" },
  aboutText: {
    fontSize: 14,
    color: "hsl(0, 0%, 70%)",
    lineHeight: 20,
    fontWeight: "400",
  },
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
