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
import DJMix from "./DJMix";

// Audio optimization utilities for handling large files
const getAudioOptimization = (audioUrl) => {
  const fileName = audioUrl.toString();
  const isWav = fileName.includes(".wav");
  const isLargeFile = fileName.includes("rhood-demo-audio"); // Your large WAV file

  return {
    isWav,
    isLargeFile,
    recommendedFormat: isWav ? "MP3" : "Current format is optimal",
    compressionTip: isWav
      ? "Consider converting to MP3 for better performance"
      : null,
    streamingOptimized: true,
    // Performance recommendations
    maxFileSize: isWav ? "50MB" : "10MB",
    compressionRatio: isWav ? "10:1" : "5:1",
  };
};

/*
PERFORMANCE OPTIMIZATION STRATEGIES FOR LARGE AUDIO FILES:

1. FORMAT CONVERSION:
   - Convert WAV to MP3 (90% size reduction)
   - Use AAC for iOS (better compression)
   - Target bitrate: 128-192 kbps for music

2. STREAMING OPTIMIZATION:
   - Use progressive loading
   - Enable native player implementations
   - Implement buffering strategies

3. CACHING STRATEGIES:
   - Cache frequently played tracks
   - Preload next track in queue
   - Use disk caching for large files

4. USER EXPERIENCE:
   - Show loading indicators
   - Provide quality options (High/Low)
   - Implement offline mode for favorites

5. TECHNICAL IMPLEMENTATIONS:
   - Use Web Audio API for web
   - Implement chunked loading
   - Add compression detection
*/

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
    audioUrl: require("../assets/audio/unique-original-mix.mp3"),
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
    audioUrl: require("../assets/audio/lost-jun-tanaka-blend.mp3"),
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
    audioUrl: require("../assets/audio/in-ur-arms-ft-stripess.mp3"),
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
    audioUrl: require("../assets/audio/any-time-any-place-janet-jackson.mp3"),
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
    audioUrl: require("../assets/audio/unique-original-mix.mp3"),
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
    audioUrl: require("../assets/audio/lost-jun-tanaka-blend.mp3"),
    plays: 934,
    likes: 112,
  },
];

export default function ListenScreen({
  globalAudioState,
  onPlayAudio,
  onPauseAudio,
  onResumeAudio,
  onStopAudio,
}) {
  const [mixes, setMixes] = useState(mockMixes);
  const [playingMixId, setPlayingMixId] = useState(null);

  // Sync local playing state with global audio state
  useEffect(() => {
    if (globalAudioState.currentTrack) {
      const currentMix = mixes.find(
        (mix) => mix.id === globalAudioState.currentTrack.id
      );
      if (currentMix) {
        setPlayingMixId(globalAudioState.currentTrack.id);
      }
    } else {
      setPlayingMixId(null);
    }
  }, [globalAudioState.currentTrack, mixes]);

  // Handle play/pause when user interacts with mix
  const handleMixPress = (mix) => {
    if (playingMixId === mix.id) {
      // Currently playing this mix - pause it
      onPauseAudio();
    } else {
      // Play this mix
      onPlayAudio(mix);
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
      </View>

      {/* Mixes List */}
      <View style={styles.mixesContainer}>
        {mixes.map((mix) => (
          <DJMix
            key={mix.id}
            mix={mix}
            isPlaying={playingMixId === mix.id}
            isLoading={globalAudioState.isLoading && playingMixId === mix.id}
            onPlayPause={() => handleMixPress(mix)}
            onArtistPress={handleArtistPress}
            progress={playingMixId === mix.id ? globalAudioState.progress : 0}
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
