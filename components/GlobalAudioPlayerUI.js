/**
 * Global audio player UI (mini player, full-screen player, queue, menu).
 * Subscribes to useAudioState() so only this subtree re-renders on audio change;
 * App uses useAudioActions() only and does not re-render.
 */
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Animated,
  Image,
  Share,
  Alert,
  Platform,
  Vibration,
  PanResponder,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAudioState, useAudioActions } from "../context/AudioContext";
import ProgressiveImage from "./ProgressiveImage";
import { ANIMATION_DURATION, SPRING_CONFIG } from "../lib/performanceConstants";
import { supabase } from "../lib/supabase";

let trackPlayer = null;
const loadTrackPlayer = () => {
  if (trackPlayer !== null) return trackPlayer;
  try {
    trackPlayer = require("../src/audio/player");
    return trackPlayer;
  } catch (error) {
    trackPlayer = false;
    return null;
  }
};

const formatTime = (milliseconds) => {
  if (!milliseconds || milliseconds < 0) return "0:00";
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export default function GlobalAudioPlayerUI({
  currentScreen,
  onNavigateToProfile,
  styles,
  globalAudioRef,
}) {
  const globalAudioState = useAudioState();
  const { setGlobalAudioState, actionsRef } = useAudioActions();

  const [showFullScreenPlayer, setShowFullScreenPlayer] = useState(false);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [showFullScreenMenu, setShowFullScreenMenu] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubPosition, setScrubPosition] = useState(0);

  const [audioPlayerOpacity] = useState(() => new Animated.Value(0));
  const [audioPlayerTranslateY] = useState(() => new Animated.Value(50));
  const miniProgressBarRef = useRef(null);
  const fullScreenProgressBarRef = useRef(null);
  const isScrubbingRef = useRef(false);
  const pendingSeekPositionRef = useRef(null);
  const isDraggingRef = useRef(false);
  const skipBackwardRef = useRef(null);
  const skipForwardRef = useRef(null);
  const fullScreenMenuSlideAnim = useRef(new Animated.Value(0)).current;

  const PROGRESS_BAR_PADDING = 48;
  const getProgressBarWidth = useCallback(
    () => Dimensions.get("window").width - PROGRESS_BAR_PADDING,
    []
  );

  useEffect(() => {
    if (globalAudioState.currentTrack) {
      Animated.parallel([
        Animated.timing(audioPlayerOpacity, {
          toValue: 1,
          duration: ANIMATION_DURATION.SLOW,
          useNativeDriver: true,
        }),
        Animated.spring(audioPlayerTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          ...SPRING_CONFIG,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(audioPlayerOpacity, {
          toValue: 0,
          duration: ANIMATION_DURATION.NORMAL,
          useNativeDriver: true,
        }),
        Animated.spring(audioPlayerTranslateY, {
          toValue: 50,
          useNativeDriver: true,
          tension: 120,
          friction: 9,
        }),
      ]).start();
    }
  }, [globalAudioState.currentTrack]);

  const getNextTrack = useCallback(() => {
    const { queue, currentQueueIndex, repeatMode } = globalAudioState;
    if (!queue.length) return null;
    if (repeatMode === "one" && globalAudioState.currentTrack)
      return globalAudioState.currentTrack;
    let nextIndex = repeatMode === "all"
      ? (currentQueueIndex + 1) % queue.length
      : currentQueueIndex + 1;
    if (nextIndex >= queue.length) return null;
    return queue[nextIndex];
  }, [globalAudioState]);

  const shareTrack = useCallback(async () => {
    if (globalAudioState.currentTrack) {
      try {
        const msg = `Check out this track: "${globalAudioState.currentTrack.title}" by ${globalAudioState.currentTrack.artist} on Rhood!`;
        await Share.share({ message: msg, title: "Share Track" });
      } catch (e) {
        Alert.alert("Error", "Failed to share track");
      }
    }
  }, [globalAudioState.currentTrack]);

  const toggleRepeat = useCallback(() => {
    setGlobalAudioState((prev) => {
      const modes = ["none", "one", "all"];
      const i = (modes.indexOf(prev.repeatMode) + 1) % modes.length;
      return { ...prev, repeatMode: modes[i] };
    });
  }, [setGlobalAudioState]);

  const createProgressBarPanResponder = useCallback(
    (options = {}) => {
      const { enableImmediateSeek = true, captureTouches = true } = options;
      return PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => captureTouches,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => captureTouches,
        onPanResponderGrant: async (evt) => {
          isDraggingRef.current = false;
          let durationMillis = globalAudioState.durationMillis;
          if (durationMillis <= 0 && globalAudioRef?.current) {
            try {
              const status = await globalAudioRef.current.getStatusAsync();
              if (status.isLoaded && status.durationMillis > 0)
                durationMillis = status.durationMillis;
            } catch (_) {}
          }
          if (durationMillis <= 0 || globalAudioState.isLoading) return;
          setIsScrubbing(true);
          const w = getProgressBarWidth();
          if (w <= 0) {
            setIsScrubbing(false);
            return;
          }
          const pct = Math.max(0, Math.min(1, evt.nativeEvent.locationX / w));
          setScrubPosition(pct);
          pendingSeekPositionRef.current = pct * durationMillis;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
        onPanResponderMove: (evt, gestureState) => {
          isDraggingRef.current = true;
          const durationMillis = globalAudioState.durationMillis;
          if (durationMillis <= 0 || globalAudioState.isLoading) return;
          const w = getProgressBarWidth();
          if (w <= 0) return;
          const pct =
            typeof evt?.nativeEvent?.locationX === "number"
              ? Math.max(0, Math.min(1, evt.nativeEvent.locationX / w))
              : Math.max(0, Math.min(1, gestureState.moveX / w));
          setScrubPosition(pct);
          pendingSeekPositionRef.current = pct * durationMillis;
        },
        onPanResponderRelease: async (evt, gestureState) => {
          try {
            const durationMillis = globalAudioState.durationMillis;
            if (durationMillis <= 0) {
              setIsScrubbing(false);
              pendingSeekPositionRef.current = null;
              return;
            }
            const w = getProgressBarWidth();
            let pct = scrubPosition;
            if (w > 0) {
              if (typeof evt?.nativeEvent?.locationX === "number")
                pct = Math.max(0, Math.min(1, evt.nativeEvent.locationX / w));
              else if (typeof gestureState?.moveX === "number")
                pct = Math.max(0, Math.min(1, gestureState.moveX / w));
            }
            const seekPos =
              pendingSeekPositionRef.current !== null
                ? pendingSeekPositionRef.current
                : pct * durationMillis;
            const clamped = Math.max(
              0,
              Math.min(seekPos, durationMillis - 100)
            );
            const seek = actionsRef?.current?.seekToPosition;
            if (seek) await seek(clamped);
            setScrubPosition(pct);
            pendingSeekPositionRef.current = null;
          } catch (e) {
            console.warn("Seek error", e);
          } finally {
            setIsScrubbing(false);
          }
        },
        onPanResponderTerminate: async () => {
          try {
            if (pendingSeekPositionRef.current != null && globalAudioState.durationMillis > 0) {
              const seek = actionsRef?.current?.seekToPosition;
              if (seek)
                await seek(
                  Math.max(
                    0,
                    Math.min(
                      pendingSeekPositionRef.current,
                      globalAudioState.durationMillis - 100
                    )
                  )
                );
            }
          } catch (_) {}
          setIsScrubbing(false);
          pendingSeekPositionRef.current = null;
        },
      });
    },
    [
      globalAudioState.durationMillis,
      globalAudioState.isLoading,
      getProgressBarWidth,
      scrubPosition,
      actionsRef,
      globalAudioRef,
    ]
  );

  const progressBarPanResponder = useMemo(
    () =>
      createProgressBarPanResponder({
        enableImmediateSeek: false,
        captureTouches: false,
      }),
    [createProgressBarPanResponder]
  );
  const fullScreenProgressBarPanResponder = useMemo(
    () =>
      createProgressBarPanResponder({
        enableImmediateSeek: true,
        captureTouches: true,
      }),
    [createProgressBarPanResponder]
  );

  const pauseGlobalAudio = actionsRef?.current?.pauseGlobalAudio;
  const resumeGlobalAudio = actionsRef?.current?.resumeGlobalAudio;
  const stopGlobalAudio = actionsRef?.current?.stopGlobalAudio;
  const playGlobalAudio = actionsRef?.current?.playGlobalAudio;
  const toggleLike = actionsRef?.current?.toggleLike;
  const skipForward = actionsRef?.current?.skipForward;
  const skipBackward = actionsRef?.current?.skipBackward;
  const clearQueue = actionsRef?.current?.clearQueue;
  const moveQueueItemUp = actionsRef?.current?.moveQueueItemUp;
  const moveQueueItemDown = actionsRef?.current?.moveQueueItemDown;

  isScrubbingRef.current = isScrubbing;
  skipBackwardRef.current = skipBackward;
  skipForwardRef.current = skipForward;
  const fullScreenGestureHandlers = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          !isScrubbingRef.current &&
          (Math.abs(g.dx) > 20 || Math.abs(g.dy) > 20),
        onPanResponderMove: (_, g) => {
          if (isScrubbingRef.current) return;
          if (Math.abs(g.dx) > Math.abs(g.dy)) {
            if (g.dx > 50 && skipBackwardRef.current) {
              skipBackwardRef.current();
              Vibration.vibrate(100);
            } else if (g.dx < -50 && skipForwardRef.current) {
              skipForwardRef.current();
              Vibration.vibrate(100);
            }
          }
        },
        onPanResponderRelease: (_, g) => {
          if (isScrubbingRef.current) return;
          if (Math.abs(g.dy) > Math.abs(g.dx) && g.dy > 100)
            setShowFullScreenPlayer(false);
        },
      }).panHandlers,
    []
  );

  const openFullScreenMenu = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowFullScreenMenu(true);
    Animated.timing(fullScreenMenuSlideAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [fullScreenMenuSlideAnim]);
  const closeFullScreenMenu = useCallback(() => {
    Animated.timing(fullScreenMenuSlideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setShowFullScreenMenu(false));
  }, [fullScreenMenuSlideAnim]);

  const handleMiniPlayPause = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const t = loadTrackPlayer();
      if (Platform.OS === "ios" && t && globalAudioState.currentTrack && typeof t.getPlaybackState === "function") {
        try {
          const state = await t.getPlaybackState();
          const playing = state.isPlaying;
          const player = loadTrackPlayer();
          if (playing) {
            if (player?.pause) await player.pause();
            else await pauseGlobalAudio?.();
            setGlobalAudioState((p) => ({ ...p, isPlaying: false }));
          } else {
            if (player?.resume) await player.resume();
            else await resumeGlobalAudio?.();
            setGlobalAudioState((p) => ({ ...p, isPlaying: true }));
          }
          setTimeout(async () => {
            try {
              const v = await t.getPlaybackState();
              setGlobalAudioState((p) => ({ ...p, isPlaying: v.isPlaying }));
            } catch (_) {}
          }, 300);
        } catch (_) {
          if (globalAudioState.isPlaying) await pauseGlobalAudio?.();
          else await resumeGlobalAudio?.();
        }
      } else {
        if (globalAudioState.isPlaying) await pauseGlobalAudio?.();
        else await resumeGlobalAudio?.();
      }
    } catch (e) {
      console.error("Mini play/pause error", e);
    }
  }, [globalAudioState.currentTrack, globalAudioState.isPlaying, setGlobalAudioState, pauseGlobalAudio, resumeGlobalAudio]);

  const hideOnMessages =
    currentScreen === "messages" || currentScreen === "help-chat";
  const showMini = globalAudioState.currentTrack && !hideOnMessages;

  if (!showMini) return null;

  return (
    <>
      <View style={styles.playBarFadeOverlay} />
      <Animated.View
        style={[
          styles.globalAudioPlayer,
          {
            opacity: 1, // Always visible when rendered (avoids stuck-at-0 if animation delayed)
            transform: [{ translateY: audioPlayerTranslateY }],
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => setShowFullScreenPlayer(true)}
          activeOpacity={0.9}
          style={styles.audioPlayerContent}
        >
          <View style={styles.audioAlbumArt}>
            {globalAudioState.currentTrack.image ? (
              <Image
                source={{ uri: globalAudioState.currentTrack.image }}
                style={styles.albumArtImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.albumArtPlaceholder}>
                <Ionicons name="musical-notes" size={24} color="hsl(75, 100%, 60%)" />
              </View>
            )}
          </View>
          <View style={styles.audioTrackInfo}>
            <Text style={styles.audioTrackTitle} numberOfLines={1} ellipsizeMode="tail">
              {globalAudioState.currentTrack.title}
            </Text>
            <Text style={styles.audioTrackArtist} numberOfLines={1}>
              {globalAudioState.currentTrack.artist}
            </Text>
            {(() => {
              const next = getNextTrack();
              if (!next) return null;
              return (
                <View style={styles.upNextPreview}>
                  <Text style={styles.upNextLabel}>Up Next:</Text>
                  <Text style={styles.upNextTrack} numberOfLines={1}>
                    {next.title} • {next.artist}
                  </Text>
                </View>
              );
            })()}
          </View>
          <View style={styles.audioTimeContainer}>
            <Text style={styles.audioTimeText}>
              {formatTime(globalAudioState.positionMillis || 0)} /{" "}
              {formatTime(globalAudioState.durationMillis || 0)}
            </Text>
          </View>
          <View style={styles.audioControls}>
            <TouchableOpacity
              style={styles.audioControlButton}
              onPress={handleMiniPlayPause}
              activeOpacity={0.8}
            >
              <Ionicons
                name={globalAudioState.isPlaying ? "pause" : "play"}
                size={22}
                color="hsl(0, 0%, 0%)"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.audioCloseButton}
              onPress={async () => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch (_) {}
                await stopGlobalAudio?.();
              }}
              accessibilityRole="button"
              accessibilityLabel="Stop playback"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={22} color="hsl(0, 0%, 60%)" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
        <View
          ref={miniProgressBarRef}
          style={styles.audioProgressContainer}
          {...progressBarPanResponder.panHandlers}
        >
          <View style={styles.audioProgressBar}>
            <View
              style={[
                styles.audioProgressFill,
                {
                  width: `${(globalAudioState.progress ?? 0) * 100}%`,
                },
              ]}
            />
            <View
              style={[
                styles.scrubberThumb,
                { left: `${(globalAudioState.progress ?? 0) * 100}%` },
              ]}
            />
          </View>
        </View>
      </Animated.View>

      {/* Full-Screen Player Modal */}
      {showFullScreenPlayer && globalAudioState.currentTrack && (
        <Modal
          visible={showFullScreenPlayer}
          transparent
          animationType="slide"
          onRequestClose={() => setShowFullScreenPlayer(false)}
        >
          <View style={styles.fullScreenPlayerOverlay}>
            <View style={styles.fullScreenOverlay} />
            <ScrollView
              style={styles.fullScreenPlayer}
              contentContainerStyle={styles.fullScreenPlayerContent}
              showsVerticalScrollIndicator={false}
              {...fullScreenGestureHandlers}
            >
              <View style={styles.fullScreenHeader}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowFullScreenPlayer(false)}
                >
                  <Ionicons name="chevron-down" size={24} color="hsl(0, 0%, 100%)" />
                </TouchableOpacity>
              </View>
              <View style={styles.fullScreenAlbumArtContainer}>
                <Image
                  source={{ uri: globalAudioState.currentTrack.image }}
                  style={styles.fullScreenAlbumArt}
                  resizeMode="cover"
                />
              </View>
              <View style={styles.fullScreenTrackInfo}>
                <View style={styles.fullScreenTrackTitleRow}>
                  <Text style={styles.fullScreenTrackTitle}>
                    {globalAudioState.currentTrack.title}
                  </Text>
                  <TouchableOpacity
                    style={styles.fullScreenLikeButton}
                    onPress={() => toggleLike?.()}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={globalAudioState.currentTrack.isLiked ? "heart" : "heart-outline"}
                      size={24}
                      color={globalAudioState.currentTrack.isLiked ? "hsl(75, 100%, 60%)" : "hsl(0, 0%, 70%)"}
                    />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    if (globalAudioState.currentTrack?.user_id) {
                      setShowFullScreenPlayer(false);
                      onNavigateToProfile(globalAudioState.currentTrack.user_id);
                    } else {
                      Alert.alert("Error", "Unable to view DJ profile");
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.fullScreenTrackArtist}>
                    {globalAudioState.currentTrack.artist}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.fullScreenProgressSection}>
                <View
                  ref={fullScreenProgressBarRef}
                  style={styles.fullScreenProgressBar}
                  {...fullScreenProgressBarPanResponder.panHandlers}
                >
                  <View
                    style={[
                      styles.fullScreenProgressFill,
                      {
                        width: `${(isScrubbing ? scrubPosition : globalAudioState.progress ?? 0) * 100}%`,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.fullScreenProgressThumb,
                      {
                        left: `${(isScrubbing ? scrubPosition : globalAudioState.progress ?? 0) * 100}%`,
                      },
                    ]}
                  />
                </View>
                <View style={styles.fullScreenTimeContainer}>
                  <Text style={styles.fullScreenTimeText}>
                    {formatTime(globalAudioState.positionMillis || 0)}
                  </Text>
                  <Text style={styles.fullScreenTimeText}>
                    {formatTime(globalAudioState.durationMillis || 0)}
                  </Text>
                </View>
              </View>
              <View style={styles.fullScreenControls}>
                <TouchableOpacity
                  style={styles.fullScreenControlButton}
                  onPress={() => actionsRef?.current?.toggleShuffle?.()}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="shuffle"
                    size={20}
                    color={globalAudioState.isShuffled ? "hsl(75, 100%, 60%)" : "hsl(0, 0%, 100%)"}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.fullScreenControlButton}
                  onPress={() => skipBackward?.()}
                  activeOpacity={0.7}
                >
                  <Ionicons name="play-skip-back" size={24} color="hsl(0, 0%, 100%)" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.fullScreenPlayButton}
                  onPress={async () => {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      if (globalAudioState.isPlaying) await pauseGlobalAudio?.();
                      else await resumeGlobalAudio?.();
                    } catch (_) {}
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={globalAudioState.isPlaying ? "pause" : "play"}
                    size={32}
                    color="hsl(0, 0%, 0%)"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.fullScreenControlButton}
                  onPress={() => skipForward?.()}
                  activeOpacity={0.7}
                >
                  <Ionicons name="play-skip-forward" size={24} color="hsl(0, 0%, 100%)" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.fullScreenControlButton}
                  onPress={toggleRepeat}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="repeat"
                    size={20}
                    color={globalAudioState.repeatMode === "none" ? "hsl(0, 0%, 100%)" : "hsl(75, 100%, 60%)"}
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.fullScreenSecondaryActions}>
                <TouchableOpacity
                  style={styles.fullScreenSecondaryButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    shareTrack();
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="share-outline" size={20} color="hsl(0, 0%, 100%)" />
                  <Text style={styles.fullScreenSecondaryButtonText}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.fullScreenSecondaryButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowFullScreenPlayer(false);
                    setShowQueueModal(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="list-outline" size={20} color="hsl(0, 0%, 100%)" />
                  <Text style={styles.fullScreenSecondaryButtonText}>Queue</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.aboutDJCard}
                onPress={() => {
                  if (globalAudioState.currentTrack?.user_id) {
                    setShowFullScreenPlayer(false);
                    onNavigateToProfile(globalAudioState.currentTrack.user_id);
                  } else {
                    Alert.alert("Error", "Unable to view DJ profile");
                  }
                }}
                activeOpacity={0.8}
              >
                <View style={styles.aboutDJHeader}>
                  <View style={styles.aboutDJAvatar}>
                    <ProgressiveImage
                      source={
                        globalAudioState.currentTrack?.user_image
                          ? { uri: globalAudioState.currentTrack.user_image }
                          : null
                      }
                      style={styles.aboutDJAvatarImage}
                      placeholder={
                        <View
                          style={[
                            styles.aboutDJAvatarImage,
                            {
                              backgroundColor: "hsl(0, 0%, 15%)",
                              justifyContent: "center",
                              alignItems: "center",
                            },
                          ]}
                        >
                          <Ionicons name="person" size={24} color="hsl(0, 0%, 50%)" />
                        </View>
                      }
                      onError={() => {
                        const uid = globalAudioState.currentTrack?.user_id;
                        if (uid && !globalAudioState.currentTrack?.user_image) {
                          supabase
                            .from("user_profiles")
                            .select("profile_image_url")
                            .eq("id", uid)
                            .single()
                            .then(({ data }) => {
                              if (data?.profile_image_url) {
                                setGlobalAudioState((p) => ({
                                  ...p,
                                  currentTrack: {
                                    ...p.currentTrack,
                                    user_image: data.profile_image_url,
                                  },
                                }));
                              }
                            })
                            .catch(() => {});
                        }
                      }}
                    />
                  </View>
                  <View style={styles.aboutDJInfo}>
                    <Text style={styles.aboutDJTitle}>About the DJ</Text>
                    <Text style={styles.aboutDJName}>
                      {globalAudioState.currentTrack?.user_dj_name ||
                        globalAudioState.currentTrack?.artist ||
                        "DJ"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="hsl(0, 0%, 50%)" style={styles.aboutDJArrow} />
                </View>
                <Text style={styles.aboutDJText}>
                  {globalAudioState.currentTrack?.user_bio ||
                    "Discover more about this talented DJ and their unique sound."}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* Full-Screen Menu Modal */}
      <Modal
        visible={showFullScreenMenu}
        transparent
        animationType="slide"
        onRequestClose={closeFullScreenMenu}
      >
        <View style={styles.fullScreenMenuOverlay}>
          <TouchableOpacity style={styles.fullScreenMenuOverlayTouchable} onPress={closeFullScreenMenu} />
          <View style={styles.fullScreenMenuContainer}>
            <View style={styles.fullScreenMenuContent}>
              <View style={styles.fullScreenMenuHeader}>
                <Text style={styles.tsBlockBoldHeading}>Mix Options</Text>
                <TouchableOpacity style={styles.closeButton} onPress={closeFullScreenMenu}>
                  <Ionicons name="close" size={24} color="hsl(0, 0%, 100%)" />
                </TouchableOpacity>
              </View>
              <View style={styles.fullScreenMenuItems}>
                <TouchableOpacity
                  style={styles.fullScreenMenuItem}
                  onPress={() => {
                    closeFullScreenMenu();
                    shareTrack();
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="share-outline" size={20} color="#C2CC06" />
                  <View style={styles.menuItemContent}>
                    <Text style={styles.menuItemText}>Share Mix</Text>
                    <Text style={styles.menuItemDescription}>Share this mix with others</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.fullScreenMenuItem}
                  onPress={() => {
                    closeFullScreenMenu();
                    if (globalAudioState.currentTrack?.user_id) {
                      setShowFullScreenPlayer(false);
                      onNavigateToProfile(globalAudioState.currentTrack.user_id);
                    } else {
                      Alert.alert("Error", "Unable to view DJ profile");
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="person-add-outline" size={20} color="#C2CC06" />
                  <View style={styles.menuItemContent}>
                    <Text style={styles.menuItemText}>Connect with DJ</Text>
                    <Text style={styles.menuItemDescription}>View DJ profile and connect</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Queue Modal */}
      <Modal
        visible={showQueueModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowQueueModal(false)}
      >
        <View style={styles.queueModalOverlay}>
          <TouchableOpacity
            style={styles.queueModalOverlayTouchable}
            onPress={() => setShowQueueModal(false)}
          />
          <View style={styles.queueModalContainer}>
            <View style={styles.queueModalContent}>
              <View style={styles.queueModalHeader}>
                <Text style={styles.queueModalTitle}>Queue</Text>
                <TouchableOpacity style={styles.queueModalClose} onPress={() => setShowQueueModal(false)}>
                  <Ionicons name="close" size={24} color="hsl(0, 0%, 100%)" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.queueModalScroll}>
                {globalAudioState.currentTrack && (
                  <View style={styles.queueItemCurrent}>
                    <View style={styles.queueItemInfo}>
                      <Text style={styles.queueItemTitle} numberOfLines={1}>
                        {globalAudioState.currentTrack.title}
                      </Text>
                      <Text style={styles.queueItemArtist} numberOfLines={1}>
                        {globalAudioState.currentTrack.artist}
                      </Text>
                    </View>
                    <View style={styles.queueItemBadge}>
                      <Text style={styles.queueItemBadgeText}>Now Playing</Text>
                    </View>
                  </View>
                )}
                {globalAudioState.queue?.length > 0 ? (
                  globalAudioState.queue.map((track, index) => (
                    <View key={`${track.id}-${index}`} style={styles.queueItem}>
                      <TouchableOpacity
                        style={styles.queueItemContent}
                        onPress={() => {
                          playGlobalAudio?.(track);
                          setGlobalAudioState((p) => ({ ...p, currentQueueIndex: index }));
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.queueItemNumber}>
                          <Text style={styles.queueItemNumberText}>{index + 1}</Text>
                        </View>
                        <View style={styles.queueItemInfo}>
                          <Text style={styles.queueItemTitle} numberOfLines={1}>
                            {track.title}
                          </Text>
                          <Text style={styles.queueItemArtist} numberOfLines={1}>
                            {track.artist}
                          </Text>
                        </View>
                      </TouchableOpacity>
                      <View style={styles.queueItemActions}>
                        {index > 0 && (
                          <TouchableOpacity
                            style={styles.queueItemReorderButton}
                            onPress={() => moveQueueItemUp?.(index)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="chevron-up" size={18} color="hsl(75, 100%, 60%)" />
                          </TouchableOpacity>
                        )}
                        {index < (globalAudioState.queue?.length ?? 0) - 1 && (
                          <TouchableOpacity
                            style={styles.queueItemReorderButton}
                            onPress={() => moveQueueItemDown?.(index)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="chevron-down" size={18} color="hsl(75, 100%, 60%)" />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.queueItemRemove}
                          onPress={() => {
                            setGlobalAudioState((p) => ({
                              ...p,
                              queue: p.queue.filter((_, i) => i !== index),
                              currentQueueIndex:
                                p.currentQueueIndex > index
                                  ? p.currentQueueIndex - 1
                                  : p.currentQueueIndex === index
                                  ? -1
                                  : p.currentQueueIndex,
                            }));
                          }}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="close" size={18} color="hsl(0, 0%, 50%)" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.queueEmpty}>
                    <Ionicons name="musical-notes-outline" size={48} color="hsl(0, 0%, 30%)" />
                    <Text style={styles.queueEmptyText}>Queue is empty</Text>
                    <Text style={styles.queueEmptySubtext}>Add mixes to your queue to see them here</Text>
                  </View>
                )}
              </ScrollView>
              {globalAudioState.queue?.length > 0 && (
                <TouchableOpacity
                  style={styles.queueClearButton}
                  onPress={() => {
                    Alert.alert("Clear Queue?", "Are you sure you want to clear the queue?", [
                      { text: "Cancel", style: "cancel" },
                      { text: "Clear", style: "destructive", onPress: () => clearQueue?.() },
                    ]);
                    setShowQueueModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.queueClearButtonText}>Clear Queue</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
