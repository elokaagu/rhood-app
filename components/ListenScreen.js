import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  RefreshControl,
  FlatList,
  Modal,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import DJMix from "./DJMix";
import AnimatedListItem from "./AnimatedListItem";
import { SkeletonMix } from "./Skeleton";
import { LIST_PERFORMANCE } from "../lib/performanceConstants";
import { supabase } from "../lib/supabase";

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

export default function ListenScreen({
  globalAudioState,
  onPlayAudio,
  onPauseAudio,
  onResumeAudio,
  onStopAudio,
  onAddToQueue,
  onPlayNext,
  onClearQueue,
  onNavigate,
  user,
}) {
  const [mixes, setMixes] = useState([]);
  const [playingMixId, setPlayingMixId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch mixes from Supabase
  const fetchMixes = async () => {
    try {
      setLoading(true);

      // First, try to fetch mixes without joins (simplest approach)
      const { data, error } = await supabase
        .from("mixes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Error fetching mixes from database:", error);
        setMixes([]);
        return;
      }

      console.log(`✅ Fetched ${data.length} mixes from database`);

      if (data.length === 0) {
        console.log("📭 No mixes found in database");
        setMixes([]);
        return;
      }

      // For each mix, fetch the user profile separately
      const transformedMixes = await Promise.all(
        data.map(async (mix) => {
          let artistName = "Unknown Artist";

          // Try to fetch user profile for artist name
          if (mix.user_id) {
            const { data: profile } = await supabase
              .from("user_profiles")
              .select("dj_name, first_name, last_name")
              .eq("id", mix.user_id)
              .single();

            if (profile) {
              artistName =
                profile.dj_name ||
                `${profile.first_name || ""} ${
                  profile.last_name || ""
                }`.trim() ||
                "Unknown Artist";
            }
          }

          const transformedMix = {
            id: mix.id,
            user_id: mix.user_id, // IMPORTANT: Include for ownership check
            title: mix.title,
            artist: mix.artist || artistName,
            genre: mix.genre || "Electronic",
            duration: mix.duration
              ? `${Math.floor(mix.duration / 60)}:${(mix.duration % 60)
                  .toString()
                  .padStart(2, "0")}`
              : "5:00",
            description: mix.description || "No description available",
            image:
              mix.artwork_url ||
              "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
            audioUrl: mix.file_url,
            plays: mix.plays || mix.play_count || 0,
          };

          // Debug logging for uploaded mixes
          console.log(`🎵 Mix ${transformedMix.id} (${transformedMix.title}):`);
          console.log(`   📁 Audio URL: ${transformedMix.audioUrl}`);
          console.log(`   🖼️ Artwork URL: ${transformedMix.image}`);
          console.log(`   👤 Artist: ${transformedMix.artist}`);

          return transformedMix;
        })
      );

      setMixes(transformedMixes);
    } catch (error) {
      console.error("❌ Error in fetchMixes:", error);
      setMixes([]);
    } finally {
      setLoading(false);

      // Fade in content after loading
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  };

  // Load mixes on mount
  useEffect(() => {
    fetchMixes();
  }, []);

  // Get unique genres for filter
  const genres = ["All", ...new Set(mixes.map((mix) => mix.genre))];

  // Filter mixes
  const filteredMixes = mixes.filter((mix) => {
    const matchesSearch =
      mix.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mix.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mix.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = selectedGenre === "All" || mix.genre === selectedGenre;
    return matchesSearch && matchesGenre;
  });

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
    setShowUploadModal(true);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    fadeAnim.setValue(0); // Reset fade animation
    await fetchMixes();
    setRefreshing(false);
  };

  const handleDeleteMix = async (mix) => {
    try {
      console.log("🗑️ Deleting mix:", mix.title);

      // Stop audio if this mix is currently playing
      if (playingMixId === mix.id) {
        onStopAudio();
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from("mixes")
        .delete()
        .eq("id", mix.id);

      if (dbError) {
        console.error("❌ Error deleting mix from database:", dbError);
        Alert.alert("Error", "Failed to delete mix. Please try again.");
        return;
      }

      // Delete audio file from storage
      if (mix.audioUrl && typeof mix.audioUrl === "string") {
        const audioPath = mix.audioUrl.split("/mixes/")[1];
        if (audioPath) {
          const { error: audioError } = await supabase.storage
            .from("mixes")
            .remove([audioPath]);

          if (audioError) {
            console.error("❌ Error deleting audio file:", audioError);
          }
        }
      }

      // Delete artwork from storage if it exists
      if (
        mix.image &&
        typeof mix.image === "string" &&
        mix.image.includes("supabase")
      ) {
        const artworkPath = mix.image.split("/mixes/")[1];
        if (artworkPath) {
          const { error: artworkError } = await supabase.storage
            .from("mixes")
            .remove([artworkPath]);

          if (artworkError) {
            console.error("❌ Error deleting artwork:", artworkError);
          }
        }
      }

      // Remove from local state
      setMixes((prevMixes) => prevMixes.filter((m) => m.id !== mix.id));

      console.log("✅ Mix deleted successfully");
      Alert.alert("Success", "Mix deleted successfully");
    } catch (error) {
      console.error("❌ Error deleting mix:", error);
      Alert.alert("Error", "Failed to delete mix. Please try again.");
    }
  };

  const handleGenreFilter = (genre) => {
    setSelectedGenre(genre);
  };

  const handleAddToQueue = (mix) => {
    if (onAddToQueue) {
      onAddToQueue(mix);
      Alert.alert(
        "Added to Queue",
        `"${mix.title}" by ${mix.artist} has been added to your queue.`,
        [{ text: "OK" }]
      );
      console.log("🎵 Added to queue:", mix.title);
    }
  };

  // Header component for FlatList
  const renderHeader = () => (
    <>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>LISTEN</Text>
        <Text style={styles.headerSubtitle}>
          5 minute sets from DJs in R/HOOD
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="hsl(0, 0%, 50%)" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search mixes, artists, or genres..."
          placeholderTextColor="hsl(0, 0%, 50%)"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery("")}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={20} color="hsl(0, 0%, 50%)" />
          </TouchableOpacity>
        )}
      </View>

      {/* Genre Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.genreFilterContainer}
        contentContainerStyle={styles.genreFilterContent}
      >
        {genres.map((genre) => (
          <TouchableOpacity
            key={genre}
            style={[
              styles.genreChip,
              selectedGenre === genre && styles.genreChipActive,
            ]}
            onPress={() => handleGenreFilter(genre)}
          >
            <Text
              style={[
                styles.genreChipText,
                selectedGenre === genre && styles.genreChipTextActive,
              ]}
            >
              {genre}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </>
  );

  // Footer component for FlatList
  const renderFooter = () => (
    <>
      {/* Upload CTA */}
      <View style={styles.uploadSection}>
        <View style={styles.uploadCard}>
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
    </>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={loading ? [] : filteredMixes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item: mix, index }) => (
          <AnimatedListItem index={index} delay={80}>
            <DJMix
              mix={{ ...mix, trackNumber: index + 1 }}
              isPlaying={playingMixId === mix.id}
              isLoading={globalAudioState.isLoading && playingMixId === mix.id}
              onPlayPause={() => handleMixPress(mix)}
              onArtistPress={handleArtistPress}
              onDelete={handleDeleteMix}
              onAddToQueue={handleAddToQueue}
              currentUserId={user?.id}
              progress={playingMixId === mix.id ? globalAudioState.progress : 0}
            />
          </AnimatedListItem>
        )}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={() => {
          if (loading) {
            return (
              <View style={styles.skeletonContainer}>
                <SkeletonMix />
                <SkeletonMix />
                <SkeletonMix />
                <SkeletonMix />
                <SkeletonMix />
              </View>
            );
          }

          return (
            <View style={styles.emptyState}>
              <Ionicons
                name="musical-notes"
                size={48}
                color="hsl(0, 0%, 30%)"
              />
              <Text style={styles.emptyStateTitle}>No mixes found</Text>
              <Text style={styles.emptyStateSubtitle}>
                {searchQuery.trim()
                  ? `No results for "${searchQuery}"`
                  : "Try adjusting your filters"}
              </Text>
            </View>
          );
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="hsl(75, 100%, 60%)"
          />
        }
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={LIST_PERFORMANCE.REMOVE_CLIPPED_SUBVIEWS}
        initialNumToRender={LIST_PERFORMANCE.INITIAL_NUM_TO_RENDER}
        maxToRenderPerBatch={LIST_PERFORMANCE.MAX_TO_RENDER_PER_BATCH}
        windowSize={LIST_PERFORMANCE.WINDOW_SIZE}
        getItemLayout={(data, index) => ({
          length: 80, // Approximate height of each DJMix item
          offset: 80 * index,
          index,
        })}
        contentContainerStyle={styles.flatListContent}
      />

      {/* Upload Mix Modal - R/HOOD Themed */}
      <Modal
        visible={showUploadModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUploadModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons
              name="cloud-upload-outline"
              size={64}
              color="hsl(75, 100%, 60%)"
              style={styles.modalIcon}
            />
            <Text style={styles.modalTitle}>Upload Your Mix</Text>
            <Text style={styles.modalDescription}>
              Share your 5-minute DJ mix with the R/HOOD community!
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowUploadModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalUploadButton}
                onPress={() => {
                  setShowUploadModal(false);
                  if (onNavigate) {
                    onNavigate("upload-mix");
                  }
                }}
              >
                <LinearGradient
                  colors={["hsl(75, 100%, 60%)", "hsl(75, 100%, 50%)"]}
                  style={styles.modalUploadGradient}
                >
                  <Text style={styles.modalUploadText}>Upload</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
    fontFamily: "TS-Block-Bold",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
  },
  flatListContent: {
    flexGrow: 1,
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
    fontFamily: "TS-Block-Bold",
    fontWeight: "900",
    color: "hsl(0, 0%, 100%)",
    marginTop: 12,
    marginBottom: 8,
  },
  uploadDescription: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
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
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 0%)",
  },
  bottomSpacing: {
    height: 20,
  },
  // Modal Styles - R/HOOD Theme
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 20,
    padding: 32,
    width: "85%",
    maxWidth: 400,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "hsl(75, 100%, 60%)",
  },
  modalIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 12,
    textAlign: "center",
  },
  modalDescription: {
    fontSize: 16,
    color: "hsl(0, 0%, 70%)",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalCancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "hsl(0, 0%, 15%)",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 25%)",
    alignItems: "center",
  },
  modalCancelText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  modalUploadButton: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  modalUploadGradient: {
    padding: 14,
    alignItems: "center",
  },
  modalUploadText: {
    color: "black",
    fontSize: 16,
    fontWeight: "bold",
  },
  // Search Bar Styles
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "hsl(0, 0%, 100%)",
    fontFamily: "Helvetica Neue",
  },
  clearButton: {
    padding: 4,
  },
  // Genre Filter Styles
  genreFilterContainer: {
    marginBottom: 16,
  },
  genreFilterContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  genreChip: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  genreChipActive: {
    backgroundColor: "hsl(75, 100%, 60%)",
    borderColor: "hsl(75, 100%, 60%)",
  },
  genreChipText: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    fontWeight: "500",
    color: "hsl(0, 0%, 70%)",
  },
  genreChipTextActive: {
    color: "hsl(0, 0%, 0%)",
    fontWeight: "600",
  },
  // Empty State Styles
  skeletonContainer: {
    padding: 20,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontFamily: "TS-Block-Bold",
    color: "hsl(0, 0%, 100%)",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 60%)",
    textAlign: "center",
    lineHeight: 20,
  },
});
