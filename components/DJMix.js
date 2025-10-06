import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
  Modal,
  Alert,
  PanResponder,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

const DJMix = ({
  mix,
  isPlaying,
  isLoading = false,
  onPlayPause,
  onArtistPress,
  onDelete,
  onAddToQueue,
  currentUserId,
  progress = 0,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const swipeAnim = useRef(new Animated.Value(0)).current;

  // Check if current user owns this mix
  const isOwnMix = currentUserId && mix.user_id === currentUserId;

  // Debug logging
  useEffect(() => {
    if (currentUserId && mix.user_id) {
      console.log(`Mix "${mix.title}":`, {
        currentUserId,
        mixUserId: mix.user_id,
        isOwnMix,
        match: currentUserId === mix.user_id,
      });
    }
  }, [currentUserId, mix.user_id, mix.title, isOwnMix]);

  // Validate image URL and provide fallback
  const getImageSource = () => {
    if (mix.image && typeof mix.image === "string" && mix.image.trim() !== "") {
      // Check if it's a valid URL or matches upload pattern
      if (mix.image.includes("supabase") || mix.image.startsWith("http")) {
        return { uri: mix.image };
      }
    }
    // Return fallback image
    return {
      uri: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
    };
  };

  useEffect(() => {
    if (isPlaying) {
      // Start pulsing animation when playing
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isPlaying, pulseAnim]);

  // Swipe to delete gesture handler (only for own mixes)
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => isOwnMix,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          // Only respond to horizontal swipes (left)
          return (
            isOwnMix &&
            gestureState.dx < -10 &&
            Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
          );
        },
        onMoveShouldSetPanResponderCapture: (_, gestureState) => {
          return isOwnMix && gestureState.dx < -10;
        },
        onPanResponderGrant: () => {
          // Start of gesture
          if (isOwnMix) {
            swipeAnim.setOffset(swipeAnim._value);
            swipeAnim.setValue(0);
          }
        },
        onPanResponderMove: (_, gestureState) => {
          if (isOwnMix && gestureState.dx < 0) {
            // Only allow left swipe, max 100px
            const newValue = Math.max(gestureState.dx, -100);
            swipeAnim.setValue(newValue);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          swipeAnim.flattenOffset();

          if (gestureState.dx < -50) {
            // Swipe threshold reached - show delete button
            Animated.spring(swipeAnim, {
              toValue: -80,
              useNativeDriver: true,
              tension: 40,
              friction: 8,
            }).start();
          } else {
            // Reset position
            Animated.spring(swipeAnim, {
              toValue: 0,
              useNativeDriver: true,
              tension: 40,
              friction: 8,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          // Reset if gesture is interrupted
          swipeAnim.flattenOffset();
          Animated.spring(swipeAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
      }),
    [isOwnMix, swipeAnim]
  );

  const handleDelete = () => {
    Alert.alert(
      "Delete Mix",
      `Are you sure you want to delete "${mix.title}"? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            setShowOptionsMenu(false);
            // Reset swipe position
            Animated.spring(swipeAnim, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
          },
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setShowOptionsMenu(false);
            if (onDelete) {
              onDelete(mix);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.swipeContainer}>
      {/* Delete Button (revealed on swipe) */}
      {isOwnMix && (
        <View style={styles.deleteButtonContainer}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Ionicons name="trash" size={24} color="white" />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main Mix Card (swipeable) */}
      <Animated.View
        style={[
          styles.mixCardAnimated,
          {
            transform: [{ translateX: swipeAnim }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={styles.mixCard}
          onPress={onPlayPause}
          activeOpacity={0.7}
          delayPressIn={isOwnMix ? 100 : 0}
        >
          {/* Album Art */}
          <View style={styles.albumArtContainer}>
            {!imageError ? (
              <Image
                source={getImageSource()}
                style={styles.albumArt}
                resizeMode="cover"
                onError={() => {
                  setImageError(true);
                  console.log(`❌ Failed to load image: ${mix.image}`);
                }}
                onLoad={() => {
                  setImageError(false);
                  console.log(`✅ Successfully loaded image: ${mix.image}`);
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
          </View>

          {/* Track Info */}
          <View style={styles.trackInfo}>
            <Text style={styles.trackTitle} numberOfLines={1}>
              {mix.title}
            </Text>
            <TouchableOpacity
              onPress={() =>
                onArtistPress && onArtistPress(mix.artist, mix.user_id)
              }
              activeOpacity={0.7}
            >
              <Text style={styles.trackArtist} numberOfLines={1}>
                {mix.artist}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Options Menu - Show for all mixes */}
          <TouchableOpacity
            style={styles.optionsButton}
            activeOpacity={0.7}
            onPress={() => setShowOptionsMenu(true)}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={20}
              color="hsl(0, 0%, 70%)"
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>

      {/* Options Modal */}
      <Modal
        visible={showOptionsMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowOptionsMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsMenu(false)}
        >
          <View style={styles.optionsModal}>
            {/* Add to Queue - Show for all mixes */}
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                setShowOptionsMenu(false);
                if (onAddToQueue) {
                  onAddToQueue(mix);
                }
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="list" size={20} color="hsl(75, 100%, 60%)" />
              <Text style={styles.optionTextGreen}>Add to Queue</Text>
            </TouchableOpacity>

            {/* Download for Offline */}
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                setShowOptionsMenu(false);
                // Handle download for offline
                console.log("Download mix for offline:", mix.title);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="download" size={20} color="hsl(0, 0%, 100%)" />
              <Text style={styles.optionText}>Download for Offline</Text>
            </TouchableOpacity>

            {/* Delete - Only show for own mixes */}
            {isOwnMix && (
              <TouchableOpacity
                style={styles.optionItem}
                onPress={handleDelete}
                activeOpacity={0.7}
              >
                <Ionicons name="trash" size={20} color="hsl(0, 100%, 60%)" />
                <Text style={styles.optionTextDelete}>Delete Mix</Text>
              </TouchableOpacity>
            )}

            {/* Cancel */}
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => setShowOptionsMenu(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color="hsl(0, 0%, 70%)" />
              <Text style={styles.optionText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  playButtonOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "hsla(0, 0%, 0%, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  playButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "hsla(0, 0%, 0%, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "hsla(255, 255, 255, 0.3)",
  },
  trackInfo: {
    flex: 1,
    justifyContent: "center",
  },
  trackTitle: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 2,
  },
  trackArtist: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(75, 100%, 60%)",
    marginBottom: 2,
  },
  trackDescription: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 60%)",
    marginBottom: 4,
  },
  trackDuration: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
  },
  optionsButton: {
    padding: 8,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  optionsModal: {
    backgroundColor: "hsl(0, 0%, 10%)",
    borderRadius: 12,
    padding: 8,
    width: "80%",
    maxWidth: 300,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 20%)",
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 8,
  },
  optionText: {
    color: "hsl(0, 0%, 70%)",
    fontSize: 16,
    marginLeft: 12,
    fontWeight: "500",
  },
  optionTextGreen: {
    color: "hsl(75, 100%, 60%)",
    fontSize: 16,
    marginLeft: 12,
    fontWeight: "600",
  },
  optionTextDelete: {
    color: "hsl(0, 100%, 60%)",
    fontSize: 16,
    marginLeft: 12,
    fontWeight: "600",
  },
});

export default DJMix;
