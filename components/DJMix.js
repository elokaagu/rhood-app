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
          <Image
            source={{ uri: mix.image }}
            style={styles.mixImage}
            resizeMode="cover"
          />
          <View style={styles.playButtonOverlay}>
            <Animated.View
              style={[
                styles.playButton,
                isPlaying && { transform: [{ scale: pulseAnim }] },
              ]}
            >
              {isLoading ? (
                <Ionicons name="hourglass" size={24} color="hsl(0, 0%, 100%)" />
              ) : (
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={24}
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
          <View style={styles.statItem}>
            <Ionicons name="volume-high" size={14} color="hsl(0, 0%, 70%)" />
            <Text style={styles.statText}>{formatNumber(mix.plays)}</Text>
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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
    shadowColor: "hsl(0, 0%, 0%)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  leftColumn: {
    alignItems: "center",
    marginRight: 16,
  },
  imageContainer: {
    position: "relative",
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: "hidden",
    marginBottom: 12,
  },
  mixImage: {
    width: "100%",
    height: "100%",
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "hsla(0, 0%, 0%, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  genreBadge: {
    backgroundColor: "hsl(75, 100%, 60%)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  genreText: {
    fontSize: 12,
    fontFamily: "Arial Black",
    fontWeight: "900",
    color: "hsl(0, 0%, 0%)",
  },
  rightColumn: {
    flex: 1,
    justifyContent: "space-between",
  },
  mixInfo: {
    flex: 1,
  },
  mixTitle: {
    fontSize: 18,
    fontFamily: "Arial Black",
    fontWeight: "900",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 6,
  },
  artistContainer: {
    marginBottom: 6,
  },
  artistName: {
    fontSize: 16,
    fontFamily: "Arial",
    fontWeight: "600",
    color: "hsl(75, 100%, 60%)",
  },
  mixDescription: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)",
    lineHeight: 18,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)",
  },
  duration: {
    fontSize: 12,
    fontFamily: "Arial",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 3,
    backgroundColor: "hsl(0, 0%, 15%)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "hsl(75, 100%, 60%)",
    borderRadius: 2,
  },
});

export default DJMix;
