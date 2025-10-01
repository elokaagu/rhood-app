import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

const DJMix = ({
  mix,
  isPlaying,
  isLoading = false,
  onPlayPause,
  onArtistPress,
  progress = 0,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

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

  return (
    <TouchableOpacity 
      style={styles.mixCard}
      onPress={onPlayPause}
      activeOpacity={0.7}
    >
      {/* Track Number */}
      <View style={styles.trackNumber}>
        <Text style={styles.trackNumberText}>{mix.trackNumber || mix.id}</Text>
      </View>

      {/* Album Art */}
      <View style={styles.albumArtContainer}>
        {!imageError ? (
          <Image
            source={{ uri: mix.image }}
            style={styles.albumArt}
            resizeMode="cover"
            onError={() => setImageError(true)}
            onLoad={() => setImageError(false)}
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
        {/* Play Button Overlay */}
        <View style={styles.playButtonOverlay}>
          <Animated.View
            style={[
              styles.playButton,
              isPlaying && { transform: [{ scale: pulseAnim }] },
            ]}
          >
            {isLoading ? (
              <Ionicons name="hourglass" size={16} color="hsl(0, 0%, 100%)" />
            ) : (
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={16}
                color="hsl(0, 0%, 100%)"
              />
            )}
          </Animated.View>
        </View>
      </View>

      {/* Track Info */}
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {mix.title}
        </Text>
        <Text style={styles.trackArtist} numberOfLines={1}>
          {mix.artist}
        </Text>
        <Text style={styles.trackDescription} numberOfLines={1}>
          {mix.description}
        </Text>
        <View style={styles.trackMeta}>
          <Text style={styles.trackDuration}>{mix.duration}</Text>
          <View style={styles.genreBadge}>
            <Text style={styles.genreText}>{mix.genre}</Text>
          </View>
        </View>
      </View>

      {/* Options Menu */}
      <TouchableOpacity style={styles.optionsButton} activeOpacity={0.7}>
        <Ionicons name="ellipsis-vertical" size={20} color="hsl(0, 0%, 70%)" />
      </TouchableOpacity>

      {/* Progress Bar - Only show when playing */}
      {isPlaying && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  mixCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "hsl(0, 0%, 0%)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 8%)",
  },
  trackNumber: {
    width: 32,
    alignItems: "center",
    marginRight: 16,
  },
  trackNumberText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
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
  trackMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  trackDuration: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
  },
  genreBadge: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%)",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  genreText: {
    fontSize: 10,
    fontFamily: "Helvetica Neue",
    fontWeight: "500",
    color: "hsl(75, 100%, 60%)",
  },
  optionsButton: {
    padding: 8,
    marginLeft: 8,
  },
  progressContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  progressBar: {
    height: 2,
    backgroundColor: "hsl(0, 0%, 15%)",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "hsl(75, 100%, 60%)",
  },
});

export default DJMix;
