// components/LockScreenTest.js
// Test component for lock screen media controls

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import lockScreenControls from "../lib/lockScreenControls";

const LockScreenTest = ({
  onBack,
  globalAudioState,
  onPlayAudio,
  onPauseAudio,
  onResumeAudio,
  onStopAudio,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration] = useState(180000); // 3 minutes

  const testTrack = {
    id: "test-123",
    title: "Test Track - Lock Screen Demo",
    artist: "R/HOOD Test Artist",
    image: "https://via.placeholder.com/300x300/00ff00/000000?text=R/HOOD",
    genre: "Electronic",
    durationMillis: duration,
  };

  // Set up callbacks for lock screen control buttons
  useEffect(() => {
    const handleNext = () => {
      const newPosition = Math.max(0, Math.min(duration, position + 30000));
      setPosition(newPosition);
      lockScreenControls.setPlaybackState(isPlaying, newPosition, duration);
    };

    const handlePrevious = () => {
      const newPosition = Math.max(0, Math.min(duration, position - 30000));
      setPosition(newPosition);
      lockScreenControls.setPlaybackState(isPlaying, newPosition, duration);
    };

    lockScreenControls.setCallbacks({
      onPlayPause: async () => {
        if (globalAudioState?.isPlaying) {
          await onPauseAudio?.();
          setIsPlaying(false);
        } else {
          await onResumeAudio?.();
          setIsPlaying(true);
        }
      },
      onNext: handleNext,
      onPrevious: handlePrevious,
    });
  }, [
    globalAudioState?.isPlaying,
    position,
    duration,
    isPlaying,
    onPauseAudio,
    onResumeAudio,
  ]);

  const handleShowNotification = async () => {
    try {
      await lockScreenControls.showLockScreenNotification({
        ...testTrack,
        durationMillis: duration,
      });
      await lockScreenControls.setPlaybackState(isPlaying, position, duration);
      Alert.alert(
        "Success",
        "Lock screen notification shown!\n\nNext steps:\n1. Lock your device\n2. Check the lock screen\n3. You should see media controls"
      );
    } catch (error) {
      Alert.alert(
        "Error",
        `Failed to show lock screen notification: ${error.message}`
      );
      console.error("Error:", error);
    }
  };

  const handleUpdateState = () => {
    const newIsPlaying = !isPlaying;
    setIsPlaying(newIsPlaying);
    lockScreenControls.setPlaybackState(newIsPlaying, position, duration);
    Alert.alert("State Updated", `Now ${newIsPlaying ? "playing" : "paused"}`);
  };

  const handleSeek = (amount) => {
    const newPosition = Math.max(0, Math.min(duration, position + amount));
    setPosition(newPosition);
    lockScreenControls.setPlaybackState(isPlaying, newPosition, duration);
    Alert.alert(
      "Seeked",
      `${amount > 0 ? "Forward" : "Backward"} ${Math.abs(amount / 1000)}s`
    );
  };

  const handleHideNotification = async () => {
    try {
      await lockScreenControls.hideLockScreenNotification();
      Alert.alert("Success", "Lock screen notification hidden!");
    } catch (error) {
      Alert.alert("Error", "Failed to hide lock screen notification");
      console.error("Error:", error);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.containerContent}
    >
      {/* Header with back button */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="hsl(0, 0%, 100%)" />
          </TouchableOpacity>
        )}
        <Text style={styles.title}>Lock Screen Controls Test</Text>
        {onBack && <View style={styles.backButton} />}
      </View>

      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle}>{testTrack.title}</Text>
        <Text style={styles.trackArtist}>{testTrack.artist}</Text>
        <Text style={styles.trackTime}>
          {Math.floor(position / 1000)}s / {Math.floor(duration / 1000)}s
        </Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.button}
          onPress={handleShowNotification}
        >
          <Ionicons name="notifications" size={24} color="white" />
          <Text style={styles.buttonText}>Show Lock Screen</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleUpdateState}>
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={24}
            color="white"
          />
          <Text style={styles.buttonText}>{isPlaying ? "Pause" : "Play"}</Text>
        </TouchableOpacity>

        <View style={styles.seekControls}>
          <TouchableOpacity
            style={styles.seekButton}
            onPress={() => handleSeek(-10000)}
          >
            <Ionicons name="play-back" size={20} color="white" />
            <Text style={styles.seekText}>-10s</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.seekButton}
            onPress={() => handleSeek(10000)}
          >
            <Ionicons name="play-forward" size={20} color="white" />
            <Text style={styles.seekText}>+10s</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleHideNotification}
        >
          <Ionicons name="close" size={24} color="white" />
          <Text style={styles.buttonText}>Hide Notification</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionTitle}>Testing Instructions:</Text>
        <Text style={styles.instructionText}>
          <Text style={styles.bold}>
            For iOS (TestFlight/Development Build):
          </Text>
          {"\n"}
          1. Tap "Show Lock Screen" to initialize controls{"\n"}
          2. Tap "Play" to set playing state{"\n"}
          3. Lock your device (press side/top button){"\n"}
          4. You should see native Now Playing controls{"\n"}
          5. Test play/pause from lock screen{"\n"}
          {"\n"}
          <Text style={styles.bold}>For Android:</Text>
          {"\n"}
          1. Tap "Show Lock Screen" to show notification{"\n"}
          2. Lock your device{"\n"}
          3. You should see MediaStyle notification{"\n"}
          4. Test controls from notification{"\n"}
          {"\n"}
          <Text style={styles.bold}>Note:</Text>
          {"\n"}
          Lock screen controls may not work in Expo Go due to native module
          limitations. Use TestFlight or a development build for full
          functionality.
        </Text>
      </View>

      <View style={styles.platformInfo}>
        <Text style={styles.platformInfoText}>
          Platform: {Platform.OS === "ios" ? "iOS" : "Android"}
        </Text>
        <Text style={styles.platformInfoText}>
          Status: {globalAudioState?.isPlaying ? "Playing" : "Paused"}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 8%)",
  },
  containerContent: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "hsl(75, 100%, 60%)",
    textAlign: "center",
    flex: 1,
    fontFamily: "TS-Block-Bold",
  },
  trackInfo: {
    backgroundColor: "hsl(0, 0%, 12%)",
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
    alignItems: "center",
  },
  trackTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginBottom: 5,
  },
  trackArtist: {
    fontSize: 16,
    color: "hsl(0, 0%, 70%)",
    marginBottom: 10,
  },
  trackTime: {
    fontSize: 14,
    color: "hsl(75, 100%, 60%)",
  },
  controls: {
    gap: 15,
  },
  button: {
    backgroundColor: "hsl(75, 100%, 60%)",
    padding: 15,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  buttonText: {
    color: "black",
    fontSize: 16,
    fontWeight: "bold",
  },
  seekControls: {
    flexDirection: "row",
    gap: 10,
  },
  seekButton: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 20%)",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    gap: 5,
  },
  seekText: {
    color: "white",
    fontSize: 12,
  },
  instructions: {
    marginTop: 30,
    backgroundColor: "hsl(0, 0%, 12%)",
    padding: 15,
    borderRadius: 8,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "hsl(75, 100%, 60%)",
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 14,
    color: "hsl(0, 0%, 70%)",
    lineHeight: 20,
  },
  bold: {
    fontWeight: "bold",
    color: "hsl(75, 100%, 60%)",
  },
  platformInfo: {
    marginTop: 20,
    backgroundColor: "hsl(0, 0%, 12%)",
    padding: 15,
    borderRadius: 8,
  },
  platformInfoText: {
    fontSize: 12,
    color: "hsl(0, 0%, 50%)",
    marginBottom: 5,
  },
});

export default LockScreenTest;
