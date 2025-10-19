// components/LockScreenTest.js
// Test component for lock screen media controls

import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import lockScreenControls from "../lib/lockScreenControls";

const LockScreenTest = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration] = useState(180000); // 3 minutes

  const testTrack = {
    id: "test-123",
    title: "Test Track - Lock Screen Demo",
    artist: "R/HOOD Test Artist",
    image: "https://via.placeholder.com/300x300/00ff00/000000?text=R/HOOD",
    audioUrl: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
  };

  const handleShowNotification = async () => {
    try {
      await lockScreenControls.showLockScreenNotification(testTrack);
      Alert.alert(
        "Success",
        "Lock screen notification shown! Check your lock screen."
      );
    } catch (error) {
      Alert.alert("Error", "Failed to show lock screen notification");
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
    <View style={styles.container}>
      <Text style={styles.title}>Lock Screen Controls Test</Text>

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
        <Text style={styles.instructionTitle}>Instructions:</Text>
        <Text style={styles.instructionText}>
          1. Tap "Show Lock Screen" to display the notification{"\n"}
          2. Lock your device{"\n"}
          3. You should see R/HOOD controls on the lock screen{"\n"}
          4. Test play/pause and seek controls{"\n"}
          5. Tap "Hide Notification" to remove it
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 8%)",
    padding: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "hsl(75, 100%, 60%)",
    textAlign: "center",
    marginBottom: 30,
    fontFamily: "TS Block Bold",
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
});

export default LockScreenTest;
