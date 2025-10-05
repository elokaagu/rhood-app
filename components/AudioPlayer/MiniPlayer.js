import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAudio } from "../../contexts/AudioContext";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from "../../lib/sharedStyles";

const MiniPlayer = () => {
  const {
    globalAudioState,
    showFullScreenPlayer,
    setShowFullScreenPlayer,
    pauseGlobalAudio,
    resumeGlobalAudio,
    handleProgressBarPress,
  } = useAudio();

  if (!globalAudioState.currentTrack) {
    return null;
  }

  const formatTime = (millis) => {
    if (!millis) return "0:00";
    const minutes = Math.floor(millis / 60000);
    const seconds = Math.floor((millis % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => setShowFullScreenPlayer(true)}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={[COLORS.backgroundSecondary, COLORS.backgroundTertiary]}
        style={styles.gradient}
      >
        {/* Track Info */}
        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle} numberOfLines={1}>
            {globalAudioState.currentTrack.title}
          </Text>
          <Text style={styles.trackArtist} numberOfLines={1}>
            {globalAudioState.currentTrack.artist}
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.playButton}
            onPress={
              globalAudioState.isPlaying ? pauseGlobalAudio : resumeGlobalAudio
            }
            activeOpacity={0.7}
          >
            <Ionicons
              name={globalAudioState.isPlaying ? "pause" : "play"}
              size={24}
              color={COLORS.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <Text style={styles.timeText}>
            {formatTime(globalAudioState.positionMillis)}
          </Text>
          <TouchableOpacity
            style={styles.progressBar}
            onPress={handleProgressBarPress}
            activeOpacity={0.8}
          >
            <View style={styles.progressBackground}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${globalAudioState.progress * 100}%` },
                ]}
              />
            </View>
          </TouchableOpacity>
          <Text style={styles.timeText}>
            {formatTime(globalAudioState.durationMillis)}
          </Text>
        </View>

        {/* Full Screen Button */}
        <TouchableOpacity
          style={styles.fullScreenButton}
          onPress={() => setShowFullScreenPlayer(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="expand" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 80, // Above navigation
    left: 0,
    right: 0,
    height: 80,
    zIndex: 1000,
  },
  gradient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  trackInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  trackTitle: {
    fontSize: TYPOGRAPHY.base,
    fontFamily: TYPOGRAPHY.primary,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.semibold,
    marginBottom: 2,
  },
  trackArtist: {
    fontSize: TYPOGRAPHY.sm,
    fontFamily: TYPOGRAPHY.primary,
    color: COLORS.textSecondary,
  },
  controls: {
    marginRight: SPACING.sm,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundTertiary,
    justifyContent: "center",
    alignItems: "center",
  },
  progressContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: SPACING.sm,
  },
  timeText: {
    fontSize: TYPOGRAPHY.xs,
    fontFamily: TYPOGRAPHY.primary,
    color: COLORS.textTertiary,
    minWidth: 35,
  },
  progressBar: {
    flex: 1,
    marginHorizontal: SPACING.xs,
  },
  progressBackground: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  fullScreenButton: {
    padding: SPACING.xs,
  },
});

export default MiniPlayer;
