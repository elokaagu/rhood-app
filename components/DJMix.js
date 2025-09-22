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
  const [isFavorited, setIsFavorited] = useState(false);
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

  const formatNumber = (num) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "k";
    }
    return num.toString();
  };

  return (
    <View style={styles.mixCard}>
      {/* Left Column - Image and Genre Badge */}
      <View style={styles.leftColumn}>
        <TouchableOpacity
          style={styles.imageContainer}
          onPress={onPlayPause}
          activeOpacity={0.8}
        >
          {!imageError ? (
            <Image
              source={{ uri: mix.image }}
              style={styles.mixImage}
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
          <View style={styles.playButtonOverlay}>
            <Animated.View
              style={[
                styles.playButton,
                isPlaying && { transform: [{ scale: pulseAnim }] },
              ]}
            >
              {isLoading ? (
                <Ionicons name="hourglass" size={20} color="hsl(0, 0%, 100%)" />
              ) : (
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={20}
                  color="hsl(0, 0%, 100%)"
                />
              )}
            </Animated.View>
          </View>
        </TouchableOpacity>

        <View style={styles.genreBadge}>
          <Text style={styles.genreText}>{mix.genre}</Text>
        </View>
      </View>

      {/* Right Column - Mix Info */}
      <View style={styles.rightColumn}>
        <View style={styles.mixInfo}>
          <Text style={styles.mixTitle} numberOfLines={1}>
            {mix.title}
          </Text>

          <TouchableOpacity
            onPress={() => onArtistPress(mix.artist)}
            style={styles.artistContainer}
          >
            <Text style={styles.artistName}>{mix.artist}</Text>
          </TouchableOpacity>

          <Text style={styles.mixDescription} numberOfLines={2}>
            {mix.description}
          </Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statsLeft}>
            <View style={styles.statItem}>
              <Ionicons name="volume-high" size={14} color="hsl(0, 0%, 70%)" />
              <Text style={styles.statText}>{formatNumber(mix.plays)}</Text>
            </View>
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={() => setIsFavorited(!isFavorited)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isFavorited ? "heart" : "heart-outline"}
                size={16}
                color={isFavorited ? "hsl(0, 100%, 60%)" : "hsl(0, 0%, 70%)"}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.duration}>{mix.duration}</Text>
        </View>

        {/* Progress Bar - Only show when playing */}
        {isPlaying && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mixCard: {
    flexDirection: "row",
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
    shadowColor: "hsl(0, 0%, 0%)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  leftColumn: {
    alignItems: "center",
    marginRight: 16,
  },
  imageContainer: {
    position: "relative",
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 12,
  },
  mixImage: {
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
    backgroundColor: "hsla(0, 0%, 0%, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "hsla(0, 0%, 0%, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "hsla(255, 255, 255, 0.4)",
    shadowColor: "hsl(75, 100%, 60%)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  genreBadge: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  genreText: {
    fontSize: 11,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(75, 100%, 60%)",
  },
  rightColumn: {
    flex: 1,
    justifyContent: "space-between",
  },
  mixInfo: {
    flex: 1,
  },
  mixTitle: {
    fontSize: 14,
    fontFamily: "TS-Block-Bold",
    fontWeight: "900",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 6,
  },
  artistContainer: {
    marginBottom: 6,
  },
  artistName: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(75, 100%, 60%)",
  },
  mixDescription: {
    fontSize: 13,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 60%)",
    lineHeight: 16,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  statsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  favoriteButton: {
    padding: 4,
  },
  statText: {
    fontSize: 13,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 80%)",
    fontWeight: "500",
  },
  duration: {
    fontSize: 10,
    fontFamily: "TS-Block-Bold",
    fontWeight: "900",
    color: "hsl(75, 100%, 60%)",
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: "hsl(0, 0%, 15%)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "hsl(75, 100%, 60%)",
    borderRadius: 2,
    shadowColor: "hsl(75, 100%, 60%)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 2,
  },
});

export default DJMix;
