/**
 * Global Audio Player UI – rebuilt from scratch.
 * Mini bar, full-screen player modal, queue modal.
 * Uses useAudioState() and actionsRef for playback; no playback logic here.
 */
import React, { useState, useCallback, memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Image,
  Share,
  Alert,
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

function GlobalAudioPlayerUI({ currentScreen, onNavigateToProfile, styles, globalAudioRef }) {
  const state = useAudioState();
  const { setGlobalAudioState, actionsRef } = useAudioActions();
  const [fullScreenVisible, setFullScreenVisible] = useState(false);
  const [queueVisible, setQueueVisible] = useState(false);

  const track = state.currentTrack;
  const hideMini = currentScreen === "messages" || currentScreen === "help-chat";
  const showMini = track && !hideMini;

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (state.isPlaying) pause();
    else resume();
  }, [state.isPlaying]);

  const onClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    stop();
  }, []);

  const getNextTrack = useCallback(() => {
    const { queue, currentQueueIndex, repeatMode } = state;
    if (!queue?.length) return null;
    if (repeatMode === "one" && track) return track;
    const next =
      repeatMode === "all"
        ? (currentQueueIndex + 1) % queue.length
        : currentQueueIndex + 1;
    return next < queue.length ? queue[next] : null;
  }, [state.queue, state.currentQueueIndex, state.repeatMode, track]);

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

  const toggleRepeat = useCallback(() => {
    setGlobalAudioState((prev) => {
      const modes = ["none", "one", "all"];
      const i = (modes.indexOf(prev.repeatMode) + 1) % modes.length;
      return { ...prev, repeatMode: modes[i] };
    });
  }, [setGlobalAudioState]);

  const nextTrack = getNextTrack();

  if (!showMini) return null;

  return (
    <>
      <View style={styles.playBarFadeOverlay} />
      <View style={styles.globalAudioPlayer}>
        <TouchableOpacity
          style={styles.audioPlayerContent}
          onPress={() => setFullScreenVisible(true)}
          activeOpacity={0.9}
        >
          <View style={styles.audioAlbumArt}>
            {track.image ? (
              <Image
                source={{ uri: track.image }}
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
              {track.title}
            </Text>
            <Text style={styles.audioTrackArtist} numberOfLines={1}>
              {track.artist}
            </Text>
            {nextTrack && (
              <View style={styles.upNextPreview}>
                <Text style={styles.upNextLabel}>Up Next:</Text>
                <Text style={styles.upNextTrack} numberOfLines={1}>
                  {nextTrack.title} • {nextTrack.artist}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.audioTimeContainer}>
            <Text style={styles.audioTimeText}>
              {formatTime(state.positionMillis)} / {formatTime(state.durationMillis)}
            </Text>
          </View>
          <View style={styles.audioControls}>
            <TouchableOpacity
              style={styles.audioControlButton}
              onPress={onPlayPause}
              activeOpacity={0.8}
            >
              <Ionicons
                name={state.isPlaying ? "pause" : "play"}
                size={22}
                color="hsl(0, 0%, 0%)"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.audioCloseButton}
              onPress={onClose}
              accessibilityLabel="Stop playback"
            >
              <Ionicons name="close" size={22} color="hsl(0, 0%, 60%)" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
        <View style={styles.audioProgressContainer}>
          <View style={styles.audioProgressBar}>
            <View
              style={[
                styles.audioProgressFill,
                { width: `${(state.progress ?? 0) * 100}%` },
              ]}
            />
          </View>
        </View>
      </View>

      <Modal
        visible={fullScreenVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFullScreenVisible(false)}
      >
        <View style={styles.fullScreenPlayerOverlay}>
          <View style={styles.fullScreenOverlay} />
          <ScrollView
            style={styles.fullScreenPlayer}
            contentContainerStyle={styles.fullScreenPlayerContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.fullScreenHeader}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setFullScreenVisible(false)}
              >
                <Ionicons name="chevron-down" size={24} color="hsl(0, 0%, 100%)" />
              </TouchableOpacity>
            </View>
            <View style={styles.fullScreenAlbumArtContainer}>
              {track.image ? (
                <Image
                  source={{ uri: track.image }}
                  style={styles.fullScreenAlbumArt}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[
                    styles.fullScreenAlbumArt,
                    {
                      backgroundColor: "hsl(0, 0%, 12%)",
                      justifyContent: "center",
                      alignItems: "center",
                    },
                  ]}
                >
                  <Ionicons name="musical-notes" size={80} color="hsl(75, 100%, 60%)" />
                </View>
              )}
            </View>
            <View style={styles.fullScreenTrackInfo}>
              <View style={styles.fullScreenTrackTitleRow}>
                <Text style={styles.fullScreenTrackTitle}>{track.title}</Text>
                <TouchableOpacity
                  style={styles.fullScreenLikeButton}
                  onPress={() => toggleLike?.()}
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
                    onNavigateToProfile(track.user_id);
                  }
                }}
              >
                <Text style={styles.fullScreenTrackArtist}>{track.artist}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.fullScreenProgressSection}>
              <View style={styles.fullScreenProgressBar}>
                <View
                  style={[
                    styles.fullScreenProgressFill,
                    { width: `${(state.progress ?? 0) * 100}%` },
                  ]}
                />
              </View>
              <View style={styles.fullScreenTimeContainer}>
                <Text style={styles.fullScreenTimeText}>
                  {formatTime(state.positionMillis)}
                </Text>
                <Text style={styles.fullScreenTimeText}>
                  {formatTime(state.durationMillis)}
                </Text>
              </View>
            </View>
            <View style={styles.fullScreenControls}>
              <TouchableOpacity
                style={styles.fullScreenControlButton}
                onPress={() => toggleShuffle?.()}
              >
                <Ionicons
                  name="shuffle"
                  size={20}
                  color={state.isShuffled ? "hsl(75, 100%, 60%)" : "hsl(0, 0%, 100%)"}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.fullScreenControlButton}
                onPress={() => skipPrev?.()}
              >
                <Ionicons name="play-skip-back" size={24} color="hsl(0, 0%, 100%)" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.fullScreenPlayButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onPlayPause();
                }}
              >
                <Ionicons
                  name={state.isPlaying ? "pause" : "play"}
                  size={32}
                  color="hsl(0, 0%, 0%)"
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.fullScreenControlButton}
                onPress={() => skipNext?.()}
              >
                <Ionicons name="play-skip-forward" size={24} color="hsl(0, 0%, 100%)" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.fullScreenControlButton}
                onPress={toggleRepeat}
              >
                <Ionicons
                  name="repeat"
                  size={20}
                  color={
                    state.repeatMode !== "none" ? "hsl(75, 100%, 60%)" : "hsl(0, 0%, 100%)"
                  }
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
              >
                <Ionicons name="share-outline" size={20} color="hsl(0, 0%, 100%)" />
                <Text style={styles.fullScreenSecondaryButtonText}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.fullScreenSecondaryButton}
                onPress={() => {
                  setFullScreenVisible(false);
                  setQueueVisible(true);
                }}
              >
                <Ionicons name="list-outline" size={20} color="hsl(0, 0%, 100%)" />
                <Text style={styles.fullScreenSecondaryButtonText}>Queue</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.aboutDJCard}
              onPress={() => {
                if (track?.user_id) {
                  setFullScreenVisible(false);
                  onNavigateToProfile(track.user_id);
                }
              }}
            >
              <View style={styles.aboutDJHeader}>
                <View style={styles.aboutDJAvatar}>
                  <ProgressiveImage
                    source={
                      track?.user_image ? { uri: track.user_image } : null
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
                  />
                </View>
                <View style={styles.aboutDJInfo}>
                  <Text style={styles.aboutDJTitle}>About the DJ</Text>
                  <Text style={styles.aboutDJName}>
                    {track?.user_dj_name || track?.artist || "DJ"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="hsl(0, 0%, 50%)" />
              </View>
              <Text style={styles.aboutDJText}>
                {track?.user_bio || "Discover more about this DJ."}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={queueVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setQueueVisible(false)}
      >
        <View style={styles.queueModalOverlay}>
          <TouchableOpacity
            style={styles.queueModalOverlayTouchable}
            onPress={() => setQueueVisible(false)}
          />
          <View style={styles.queueModalContainer}>
            <View style={styles.queueModalContent}>
              <View style={styles.queueModalHeader}>
                <Text style={styles.queueModalTitle}>Queue</Text>
                <TouchableOpacity
                  style={styles.queueModalClose}
                  onPress={() => setQueueVisible(false)}
                >
                  <Ionicons name="close" size={24} color="hsl(0, 0%, 100%)" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.queueModalScroll}>
                {track && (
                  <View style={styles.queueItemCurrent}>
                    <View style={styles.queueItemInfo}>
                      <Text style={styles.queueItemTitle} numberOfLines={1}>
                        {track.title}
                      </Text>
                      <Text style={styles.queueItemArtist} numberOfLines={1}>
                        {track.artist}
                      </Text>
                    </View>
                    <View style={styles.queueItemBadge}>
                      <Text style={styles.queueItemBadgeText}>Now Playing</Text>
                    </View>
                  </View>
                )}
                {state.queue?.length > 0 ? (
                  state.queue.map((t, index) => (
                    <View key={`${t.id}-${index}`} style={styles.queueItem}>
                      <TouchableOpacity
                        style={styles.queueItemContent}
                        onPress={() => {
                          play(t);
                          setQueueVisible(false);
                        }}
                      >
                        <View style={styles.queueItemNumber}>
                          <Text style={styles.queueItemNumberText}>{index + 1}</Text>
                        </View>
                        <View style={styles.queueItemInfo}>
                          <Text style={styles.queueItemTitle} numberOfLines={1}>
                            {t.title}
                          </Text>
                          <Text style={styles.queueItemArtist} numberOfLines={1}>
                            {t.artist}
                          </Text>
                        </View>
                      </TouchableOpacity>
                      <View style={styles.queueItemActions}>
                        {index > 0 && (
                          <TouchableOpacity
                            style={styles.queueItemReorderButton}
                            onPress={() => moveUp(index)}
                          >
                            <Ionicons name="chevron-up" size={18} color="hsl(75, 100%, 60%)" />
                          </TouchableOpacity>
                        )}
                        {index < (state.queue?.length ?? 0) - 1 && (
                          <TouchableOpacity
                            style={styles.queueItemReorderButton}
                            onPress={() => moveDown(index)}
                          >
                            <Ionicons name="chevron-down" size={18} color="hsl(75, 100%, 60%)" />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.queueItemRemove}
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
                  <View style={styles.queueEmpty}>
                    <Ionicons name="musical-notes-outline" size={48} color="hsl(0, 0%, 30%)" />
                    <Text style={styles.queueEmptyText}>Queue is empty</Text>
                    <Text style={styles.queueEmptySubtext}>
                      Add mixes from the Listen tab
                    </Text>
                  </View>
                )}
              </ScrollView>
              {state.queue?.length > 0 && (
                <TouchableOpacity
                  style={styles.queueClearButton}
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

export default memo(GlobalAudioPlayerUI);
