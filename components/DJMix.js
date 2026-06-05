import React, { useState, useRef, useEffect, useMemo, memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
  Alert,
  PanResponder,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { HapticPatterns } from "../lib/haptics";

const formatSecondsToLabel = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0:00";
  }
  const totalSeconds = Math.round(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const parseDurationValue = (value) => {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const parts = trimmed.split(":").map((part) => part.trim());
    if (parts.length >= 2 && parts.length <= 3) {
      const numbers = parts.map((part) => Number(part));
      if (numbers.every((num) => Number.isFinite(num))) {
        if (numbers.length === 3) {
          const [hours, minutes, seconds] = numbers;
          return hours * 3600 + minutes * 60 + seconds;
        }
        const [minutes, seconds] = numbers;
        return minutes * 60 + seconds;
      }
    }

    const numeric = Number(trimmed);
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric;
    }
  }

  return null;
};

/**
 * Mix row with swipe-to-delete (own mixes), like, queue.
 * Options menu: pass `onOpenOptions(mix)` and render a single `DJMixOptionsModal` at list/screen level.
 */
const DJMix = ({
  mix,
  isPlaying,
  onPlayPause,
  onArtistPress,
  onDelete,
  onAddToQueue,
  currentUserId,
  onLikePress,
  isLiked = false,
  likeCount = 0,
  likeDisabled = false,
  /** When set, ellipsis opens the parent-owned modal (see `DJMixOptionsModal`). */
  onOpenOptions,
}) => {
  const [imageError, setImageError] = useState(false);
  const swipeAnim = useRef(new Animated.Value(0)).current;

  const isOwnMix = Boolean(currentUserId) && mix.user_id === currentUserId;

  const imageSource = useMemo(() => {
    const raw =
      (typeof mix.artwork_url === "string" && mix.artwork_url.trim()) ||
      (typeof mix.image_url === "string" && mix.image_url.trim()) ||
      (typeof mix.image === "string" && mix.image.trim()) ||
      "";
    if (raw.length > 0) {
      return { uri: raw };
    }
    return require("../assets/rhood_logo.webp");
  }, [mix.artwork_url, mix.image_url, mix.image]);

  useEffect(() => {
    setImageError(false);
  }, [imageSource]);

  const resetSwipePositionStable = useMemo(() => {
    const run = () => {
      Animated.spring(swipeAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 40,
        friction: 8,
      }).start();
    };
    return run;
  }, [swipeAnim]);

  // Swipe-to-delete: pan only on main (art + track) so it doesn’t fight like/options taps.
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          isOwnMix &&
          gestureState.dx < -10 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onMoveShouldSetPanResponderCapture: () => false,
        onPanResponderGrant: () => {
          if (!isOwnMix) return;
          swipeAnim.stopAnimation((value) => {
            const x = typeof value === "number" && Number.isFinite(value) ? value : 0;
            swipeAnim.setOffset(x);
            swipeAnim.setValue(0);
          });
        },
        onPanResponderMove: (_, gestureState) => {
          if (isOwnMix && gestureState.dx < 0) {
            const newValue = Math.max(gestureState.dx, -100);
            swipeAnim.setValue(newValue);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          swipeAnim.flattenOffset();

          if (gestureState.dx < -50) {
            Animated.spring(swipeAnim, {
              toValue: -80,
              useNativeDriver: true,
              tension: 40,
              friction: 8,
            }).start();
          } else {
            Animated.spring(swipeAnim, {
              toValue: 0,
              useNativeDriver: true,
              tension: 40,
              friction: 8,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          swipeAnim.flattenOffset();
          Animated.spring(swipeAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
      }),
    [isOwnMix, swipeAnim]
  );

  const displayDuration = useMemo(() => {
    if (
      typeof mix.durationFormatted === "string" &&
      mix.durationFormatted.trim()
    ) {
      return mix.durationFormatted.trim();
    }

    if (typeof mix.durationLabel === "string" && mix.durationLabel.trim()) {
      return mix.durationLabel.trim();
    }

    const durationSources = [
      mix.durationSeconds,
      mix.duration_seconds,
      mix.duration,
      mix.duration_formatted,
    ];

    for (const source of durationSources) {
      const parsed = parseDurationValue(source);
      if (Number.isFinite(parsed) && parsed > 0) {
        return formatSecondsToLabel(parsed);
      }
    }

    return "0:00";
  }, [
    mix.durationFormatted,
    mix.durationLabel,
    mix.durationSeconds,
    mix.duration_seconds,
    mix.duration,
    mix.duration_formatted,
  ]);

  const confirmDeleteFromSwipe = () => {
    Alert.alert(
      "Delete Mix",
      `Are you sure you want to delete "${mix.title}"? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            resetSwipePositionStable();
          },
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            onDelete?.(mix);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.swipeContainer}>
      {isOwnMix && (
        <View style={styles.deleteButtonContainer}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={confirmDeleteFromSwipe}
            activeOpacity={0.7}
          >
            <Ionicons name="trash" size={24} color="white" />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}

      <Animated.View
        style={[
          styles.mixCardAnimated,
          {
            transform: [{ translateX: swipeAnim }],
          },
        ]}
      >
        <View style={[styles.mixCard, isPlaying && styles.mixCardPlaying]}>
          <View style={styles.mixCardSwipeArea} {...panResponder.panHandlers}>
            <TouchableOpacity
              style={styles.mixCardMainPressable}
              onPress={onPlayPause}
              activeOpacity={0.7}
              delayPressIn={isOwnMix ? 100 : 0}
            >
              <View style={styles.albumArtContainer}>
                {!imageError ? (
                  <Image
                    source={imageSource}
                    style={styles.albumArt}
                    resizeMode="cover"
                    onError={(error) => {
                      setImageError(true);
                      if (__DEV__) {
                        const imageUrl = imageSource?.uri || "fallback";
                        console.log(`❌ Failed to load image for "${mix.title}":`, {
                          attemptedUrl: imageUrl,
                          artwork_url: mix.artwork_url,
                          image_url: mix.image_url,
                          image: mix.image,
                          error: error.nativeEvent?.error || "Unknown error",
                        });
                      }
                    }}
                    onLoad={() => {
                      setImageError(false);
                      if (__DEV__) {
                        const imageUrl = imageSource?.uri || "fallback";
                        console.log(
                          `✅ Successfully loaded image for "${mix.title}": ${imageUrl}`
                        );
                      }
                    }}
                  />
                ) : (
                  <View style={styles.fallbackImage}>
                    <Ionicons
                      name="musical-notes"
                      size={24}
                      color="hsl(0, 0%, 60%)"
                    />
                  </View>
                )}

                {isPlaying && (
                  <View style={styles.playOverlay}>
                    <View style={styles.playIconContainer}>
                      <Ionicons name="play" size={16} color="hsl(75, 100%, 60%)" />
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.trackInfo}>
                <Text style={styles.trackTitle} numberOfLines={1} ellipsizeMode="tail">
                  {mix.title}
                </Text>
                <TouchableOpacity
                  onPress={() => onArtistPress?.(mix.artist, mix.user_id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.trackArtist} numberOfLines={1}>
                    {mix.artist}
                  </Text>
                </TouchableOpacity>
                {mix.artistStatus ? (
                  <Text style={styles.trackArtistStatus} numberOfLines={1}>
                    {mix.artistStatus}
                  </Text>
                ) : null}

                <View style={styles.mixDetails}>
                  <Text style={styles.mixDetailText}>{displayDuration}</Text>
                  <Text style={styles.mixDetailSeparator}>•</Text>
                  <Text style={styles.mixDetailText}>
                    {mix.genre || "Electronic"}
                  </Text>
                  {mix.is_primary && (
                    <View style={styles.primaryTagSmall}>
                      <Text style={styles.primaryTagTextSmall}>P</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.likeButton,
                isLiked && styles.likeButtonActive,
                likeDisabled && styles.likeButtonDisabled,
              ]}
              activeOpacity={0.7}
              onPress={() => {
                if (!likeDisabled) {
                  HapticPatterns.like();
                  onLikePress?.();
                }
              }}
            >
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={18}
                color={isLiked ? "hsl(75, 100%, 60%)" : "hsl(0, 0%, 70%)"}
              />
              <Text
                style={[
                  styles.likeCountText,
                  isLiked && styles.likeCountTextActive,
                ]}
              >
                {likeCount ?? 0}
              </Text>
            </TouchableOpacity>

            {typeof onOpenOptions === "function" ? (
              <TouchableOpacity
                style={styles.optionsButton}
                activeOpacity={0.7}
                onPress={() => {
                  HapticPatterns.buttonPress();
                  onOpenOptions(mix);
                }}
              >
                <Ionicons
                  name="ellipsis-horizontal"
                  size={20}
                  color="hsl(0, 0%, 70%)"
                />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  swipeContainer: {
    position: "relative",
    overflow: "hidden",
  },
  mixCardAnimated: {
    backgroundColor: "hsl(0, 0%, 0%)",
  },
  mixCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "hsl(0, 0%, 0%)",
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 8%)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mixCardSwipeArea: {
    flex: 1,
    minWidth: 0,
  },
  mixCardMainPressable: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  mixCardPlaying: {
    borderColor: "hsl(75, 100%, 60%)",
    borderWidth: 2,
    backgroundColor: "hsl(0, 0%, 3%)",
  },
  deleteButtonContainer: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "hsl(0, 100%, 50%)",
  },
  deleteButton: {
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },
  deleteButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  albumArtContainer: {
    position: "relative",
    width: 50,
    height: 50,
    borderRadius: 4,
    overflow: "hidden",
    marginRight: 12,
  },
  playOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  playIconContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "hsl(75, 100%, 60%)",
  },
  albumArt: {
    width: "100%",
    height: "100%",
  },
  fallbackImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "hsl(0, 0%, 15%)",
    justifyContent: "center",
    alignItems: "center",
  },
  trackInfo: {
    flex: 1,
    justifyContent: "center",
    minWidth: 0,
  },
  trackTitle: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 2,
  },
  trackArtist: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 85%)",
    marginBottom: 2,
  },
  trackArtistStatus: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    color: "hsl(75, 100%, 70%)",
    marginBottom: 4,
  },
  optionsButton: {
    padding: 8,
    marginLeft: 8,
  },
  mixDetails: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
    gap: 4,
  },
  likeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 20%)",
    backgroundColor: "hsl(0, 0%, 8%)",
    gap: 6,
  },
  likeButtonActive: {
    borderColor: "hsl(75, 100%, 60%)",
    backgroundColor: "hsla(75, 100%, 60%, 0.12)",
  },
  likeButtonDisabled: {
    opacity: 0.5,
  },
  likeCountText: {
    color: "hsl(0, 0%, 65%)",
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    fontWeight: "500",
  },
  likeCountTextActive: {
    color: "hsl(75, 100%, 70%)",
  },
  mixDetailText: {
    color: "hsl(0, 0%, 60%)",
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    fontWeight: "400",
  },
  mixDetailSeparator: {
    color: "hsl(0, 0%, 40%)",
    fontSize: 12,
    marginHorizontal: 6,
  },
  primaryTagSmall: {
    backgroundColor: "hsl(75, 100%, 60%)",
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },
  primaryTagTextSmall: {
    fontSize: 10,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 0%)",
    fontWeight: "bold",
  },
});

export default memo(DJMix);
export { default as DJMixOptionsModal } from "./DJMixOptionsModal";
