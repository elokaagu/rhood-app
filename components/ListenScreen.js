import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import DJMix from "./DJMix";

// Mock DJ mixes data
const mockMixes = [
  {
    id: 1,
    title: "Midnight Warehouse Vibes",
    artist: "DJ Marcus Chen",
    genre: "Techno",
    duration: "5:00",
    description: "Dark, pulsing techno perfect for late-night sessions",
    image:
      "https://images.unsplash.com/photo-1571266028243-e68fdf4ce6d9?w=400&h=400&fit=crop",
    audioUrl: require("../assets/audio/Unique - Original Mix.mp3"), // Smaller demo audio file
    plays: 1240,
    likes: 89,
  },
  {
    id: 2,
    title: "Sunset Rooftop Sessions",
    artist: "Sofia Rodriguez",
    genre: "Deep House",
    duration: "5:00",
    description: "Smooth deep house for golden hour moments",
    image:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
    audioUrl: require("../assets/audio/Unique - Original Mix.mp3"), // Smaller demo audio file
    plays: 892,
    likes: 156,
  },
  {
    id: 3,
    title: "Underground Energy",
    artist: "Alex Thompson",
    genre: "Drum & Bass",
    duration: "5:00",
    description: "High-energy drum & bass to get your blood pumping",
    image:
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=400&fit=crop",
    audioUrl: require("../assets/audio/Unique - Original Mix.mp3"), // Smaller demo audio file
    plays: 2103,
    likes: 234,
  },
  {
    id: 4,
    title: "Beach Festival Highlights",
    artist: "Luna Martinez",
    genre: "Progressive",
    duration: "5:00",
    description: "Ethereal progressive house from the beach festival",
    image:
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop",
    audioUrl: require("../assets/audio/Unique - Original Mix.mp3"), // Smaller demo audio file
    plays: 1456,
    likes: 178,
  },
  {
    id: 5,
    title: "Industrial Soundscapes",
    artist: "Max Blackwood",
    genre: "Industrial",
    duration: "5:00",
    description: "Raw industrial beats from the underground scene",
    image:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
    audioUrl: require("../assets/audio/Unique - Original Mix.mp3"), // Smaller demo audio file
    plays: 678,
    likes: 45,
  },
  {
    id: 6,
    title: "Neon City Nights",
    artist: "Zara Kim",
    genre: "Synthwave",
    duration: "5:00",
    description: "Retro-futuristic synthwave for cyberpunk vibes",
    image:
      "https://images.unsplash.com/photo-1571266028243-e68fdf4ce6d9?w=400&h=400&fit=crop",
    audioUrl: require("../assets/audio/Unique - Original Mix.mp3"), // Smaller demo audio file
    plays: 934,
    likes: 112,
  },
];

export default function ListenScreen() {
  const [mixes, setMixes] = useState(mockMixes);
  const [playingMixId, setPlayingMixId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [sound, setSound] = useState(null);

  // Initialize audio mode
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
          interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
        });
      } catch (error) {
        console.log("Error setting up audio mode:", error);
      }
    };
    setupAudio();
  }, []);

  // Handle audio playback
  useEffect(() => {
    const playAudio = async () => {
      if (playingMixId) {
        try {
          setIsLoading(true);

          // Stop any currently playing sound
          if (sound) {
            await sound.unloadAsync();
            setSound(null);
          }

          // Find the mix to play
          const mixToPlay = mixes.find((mix) => mix.id === playingMixId);
          if (!mixToPlay) return;

          // Create and load new sound
          const { sound: newSound } = await Audio.Sound.createAsync(
            mixToPlay.audioUrl,
            { shouldPlay: true },
            onPlaybackStatusUpdate
          );

          setSound(newSound);
          setIsLoading(false);
        } catch (error) {
          console.log("Error playing audio:", error);
          setIsLoading(false);
          Alert.alert(
            "Playback Error",
            "Could not play this audio file. Please try again."
          );
        }
      } else {
        // Stop current sound
        if (sound) {
          try {
            await sound.unloadAsync();
            setSound(null);
          } catch (error) {
            console.log("Error stopping audio:", error);
          }
        }
        setProgress(0);
      }
    };

    playAudio();
  }, [playingMixId, mixes]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      if (status.didJustFinish) {
        // Audio finished playing
        setPlayingMixId(null);
        setProgress(0);
      } else if (status.positionMillis && status.durationMillis) {
        // Update progress
        const progressPercent =
          (status.positionMillis / status.durationMillis) * 100;
        setProgress(progressPercent);
      }
    }
  };

  const handlePlayPause = async (mixId) => {
    if (playingMixId === mixId) {
      // Pause current mix
      if (sound) {
        try {
          await sound.pauseAsync();
        } catch (error) {
          console.log("Error pausing audio:", error);
        }
      }
      setPlayingMixId(null);
    } else {
      // Play new mix (pause any currently playing)
      setPlayingMixId(mixId);
    }
  };

  const handleArtistPress = (artistName) => {
    Alert.alert(
      "Connect with Artist",
      `Would you like to connect with ${artistName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Connect",
          onPress: () => {
            // Here you would navigate to the artist's profile
            Alert.alert("Success", `Connection request sent to ${artistName}!`);
          },
        },
      ]
    );
  };

  const handleUploadMix = () => {
    Alert.alert(
      "Upload Your Mix",
      "Share your 5-minute DJ mix with the R/HOOD community!",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Upload",
          onPress: () =>
            Alert.alert("Coming Soon", "Mix upload feature coming soon!"),
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>DJ Mixes</Text>
        <Text style={styles.headerSubtitle}>5-minute sets from top DJs</Text>
        <Text style={styles.largeFileWarning}>
          🎵 Demo audio: "Unique - Original Mix" - optimized for performance
        </Text>
      </View>

      {/* Mixes List */}
      <View style={styles.mixesContainer}>
        {mixes.map((mix) => (
          <DJMix
            key={mix.id}
            mix={mix}
            isPlaying={playingMixId === mix.id}
            isLoading={isLoading && playingMixId === mix.id}
            onPlayPause={() => handlePlayPause(mix.id)}
            onArtistPress={handleArtistPress}
            progress={playingMixId === mix.id ? progress : 0}
          />
        ))}
      </View>

      {/* Upload CTA */}
      <View style={styles.uploadSection}>
        <View style={styles.uploadCard}>
          <Ionicons
            name="add-circle-outline"
            size={48}
            color="hsl(75, 100%, 60%)"
          />
          <Text style={styles.uploadTitle}>Share Your Mix</Text>
          <Text style={styles.uploadDescription}>
            Upload your own 5-minute DJ mix and connect with the community
          </Text>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={handleUploadMix}
          >
            <Text style={styles.uploadButtonText}>Upload Mix</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Spacing */}
      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 0%)",
  },
  header: {
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Arial Black",
    fontWeight: "900",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)",
  },
  largeFileWarning: {
    fontSize: 12,
    fontFamily: "Arial",
    color: "hsl(45, 100%, 60%)",
    marginTop: 8,
    fontStyle: "italic",
  },
  mixesContainer: {
    padding: 16,
  },
  uploadSection: {
    padding: 16,
    paddingTop: 8,
  },
  uploadCard: {
    backgroundColor: "hsl(0, 0%, 5%)",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
    borderStyle: "dashed",
  },
  uploadTitle: {
    fontSize: 18,
    fontFamily: "Arial Black",
    fontWeight: "900",
    color: "hsl(0, 0%, 100%)",
    marginTop: 12,
    marginBottom: 8,
  },
  uploadDescription: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  uploadButton: {
    backgroundColor: "hsl(75, 100%, 60%)",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    fontFamily: "Arial",
    fontWeight: "600",
    color: "hsl(0, 0%, 0%)",
  },
  bottomSpacing: {
    height: 20,
  },
});
