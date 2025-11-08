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
  Image,
  ActivityIndicator,
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
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

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
          let userProfile = null;

          // Try to fetch user profile for artist name and bio
          if (mix.user_id) {
            const { data: profile } = await supabase
              .from("user_profiles")
              .select(
                "dj_name, first_name, last_name, bio, profile_image_url, username"
              )
              .eq("id", mix.user_id)
              .single();

            if (profile) {
              artistName =
                profile.dj_name ||
                `${profile.first_name || ""} ${
                  profile.last_name || ""
                }`.trim() ||
                "Unknown Artist";

              userProfile = {
                id: mix.user_id,
                dj_name: profile.dj_name,
                first_name: profile.first_name,
                last_name: profile.last_name,
                bio: profile.bio,
                profile_image_url: profile.profile_image_url,
                username: profile.username,
              status_message: profile.status_message,
              };
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
            user: userProfile, // Include full user profile data
          artistStatus: userProfile?.status_message || null,
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
  const genres = [
    "All",
    "Recently Added",
    ...new Set(mixes.map((mix) => mix.genre)),
  ];

  // Generate search suggestions
  const generateSearchSuggestions = (query) => {
    if (query.length < 2) return [];

    const suggestions = new Set();

    // Add mix titles
    mixes.forEach((mix) => {
      if (mix.title.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add(mix.title);
      }
    });

    // Add artist names
    mixes.forEach((mix) => {
      if (mix.artist.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add(mix.artist);
      }
    });

    // Add genres
    genres.forEach((genre) => {
      if (genre.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add(genre);
      }
    });

    return Array.from(suggestions).slice(0, 5);
  };

  // Update search suggestions when query changes
  useEffect(() => {
    if (searchQuery.length >= 2) {
      const suggestions = generateSearchSuggestions(searchQuery);
      setSearchSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchQuery, mixes]);

  // Filter mixes
  const filteredMixes = mixes.filter((mix) => {
    const matchesSearch =
      mix.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mix.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mix.description.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesFilter = true;

    if (selectedGenre === "All") {
      matchesFilter = true;
    } else if (selectedGenre === "Recently Added") {
      // Sort by creation date (most recent first)
      matchesFilter = true;
    } else {
      matchesFilter = mix.genre === selectedGenre;
    }

    return matchesSearch && matchesFilter;
  });

  // Sort filtered mixes based on selected filter
  const sortedMixes = [...filteredMixes].sort((a, b) => {
    if (selectedGenre === "Recently Added") {
      // Sort by creation date (most recent first)
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    }
    // Default sort by creation date
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
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

  const handleArtistPress = (artistName, userId) => {
    if (!userId) {
      Alert.alert("Error", "Unable to find artist profile");
      return;
    }

    // Navigate to the artist's profile
    onNavigate("user-profile", { userId });
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

  // Load more mixes for infinite scroll
  const loadMoreMixes = async () => {
    if (loadingMore || !hasMoreData) return;

    try {
      setLoadingMore(true);
      const nextPage = currentPage + 1;

      // Simulate API call with pagination
      const { data: newMixes, error } = await supabase
        .from("mixes")
        .select("*")
        .range((nextPage - 1) * 10, nextPage * 10 - 1)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (newMixes && newMixes.length > 0) {
        setMixes((prev) => [...prev, ...newMixes]);
        setCurrentPage(nextPage);
      } else {
        setHasMoreData(false);
      }
    } catch (error) {
      console.error("Error loading more mixes:", error);
    } finally {
      setLoadingMore(false);
    }
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

  const handleSuggestionSelect = (suggestion) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
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
        <Text style={styles.tsBlockBoldHeading}>LISTEN</Text>
        <Text style={styles.headerSubtitle}>
          DJ mixes from the R/HOOD community
          {refreshing && " • Refreshing..."}
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
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
            onFocus={() => {
              if (searchSuggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            onBlur={() => {
              // Delay hiding suggestions to allow tapping
              setTimeout(() => setShowSuggestions(false), 150);
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
                setShowSuggestions(false);
              }}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="hsl(0, 0%, 50%)" />
            </TouchableOpacity>
          )}
        </View>

        {/* Search Suggestions */}
        {showSuggestions && searchSuggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            {searchSuggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionItem}
                onPress={() => handleSuggestionSelect(suggestion)}
              >
                <Ionicons name="search" size={16} color="hsl(0, 0%, 60%)" />
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </View>
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
            activeOpacity={0.7}
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
      {/* Smart Recommendations */}
      <View style={styles.recommendationsSection}>
        <View style={styles.recommendationsHeader}>
          <Text style={styles.recommendationsTitle}>More Like This</Text>
          <TouchableOpacity style={styles.viewAllButton} activeOpacity={0.7}>
            <Text style={styles.viewAllText}>View All</Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color="hsl(75, 100%, 60%)"
            />
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.recommendationsScroll}
          contentContainerStyle={styles.recommendationsContent}
        >
          {mixes.slice(0, 5).map((mix, index) => (
            <TouchableOpacity
              key={`rec-${mix.id}`}
              style={styles.recommendationCard}
              onPress={() => handleMixPress(mix)}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: mix.image }}
                style={styles.recommendationImage}
                resizeMode="cover"
              />
              <Text style={styles.recommendationTitle} numberOfLines={1}>
                {mix.title}
              </Text>
              <Text style={styles.recommendationArtist} numberOfLines={1}>
                {mix.artist}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Partial next card indicator */}
          {mixes.length > 5 && (
            <View style={styles.partialCardIndicator}>
              <View style={styles.partialCard}>
                <Ionicons
                  name="chevron-forward"
                  size={24}
                  color="hsl(75, 100%, 60%)"
                />
                <Text style={styles.partialCardText}>More</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Upload CTA */}
      <View style={styles.uploadSection}>
        <View style={styles.uploadCard}>
          <Text style={styles.uploadTitle}>Share Your Mix</Text>
          <Text style={styles.uploadDescription}>
            Upload your own DJ mix and connect with the community
          </Text>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={handleUploadMix}
            activeOpacity={0.8}
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
        data={loading ? [] : sortedMixes}
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
        onEndReached={loadMoreMixes}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() => (
          <>
            {renderFooter()}
            {loadingMore && (
              <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color="hsl(75, 100%, 60%)" />
                <Text style={styles.loadingMoreText}>
                  Loading more mixes...
                </Text>
              </View>
            )}
          </>
        )}
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
                  ? `No results for "${searchQuery}". Try a different search term or genre filter.`
                  : "No mixes available. Try adjusting your filters or upload your own mix!"}
              </Text>
              {!searchQuery.trim() && (
                <TouchableOpacity
                  style={styles.emptyStateButton}
                  onPress={handleUploadMix}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emptyStateButtonText}>
                    Upload Your First Mix
                  </Text>
                </TouchableOpacity>
              )}
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
                activeOpacity={0.7}
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
                activeOpacity={0.8}
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
  tsBlockBoldHeading: {
    fontFamily: "TS-Block-Bold",
    fontSize: 18, // Reduced from 22 for better balance
    color: "#FFFFFF", // Brand white
    textAlign: "left", // Left aligned as per guidelines
    textTransform: "uppercase", // Always uppercase
    lineHeight: 22, // Adjusted line height
    letterSpacing: 0.5, // Reduced letter spacing
    marginBottom: 12, // Reduced margin for tighter spacing
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
    height: 160, // Increased to account for play bar height and fade overlay
  },
  // Recommendations Section Styles
  recommendationsSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  recommendationsTitle: {
    fontSize: 16, // Reduced from 18 for consistency
    fontFamily: "TS-Block-Bold",
    fontWeight: "900",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 0.5, // Added letter spacing for consistency
  },
  recommendationsScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  recommendationCard: {
    width: 140,
    marginRight: 16,
  },
  recommendationImage: {
    width: "100%",
    height: 140,
    borderRadius: 12,
    marginBottom: 8,
  },
  recommendationTitle: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    fontWeight: "bold", // Changed from "600" to "bold"
    color: "hsl(0, 0%, 100%)",
    marginBottom: 2,
  },
  recommendationArtist: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 85%)", // Changed from green to light gray
  },
  // Loading More Styles
  loadingMoreContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 60%)",
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
  searchWrapper: {
    margin: 20,
    marginBottom: 16,
    position: "relative",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  suggestionsContainer: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    marginTop: -1,
    zIndex: 1000,
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  suggestionText: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 85%)",
    marginLeft: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "hsl(0, 0%, 100%)",
    fontFamily: "Helvetica Neue",
  },
  clearButton: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: "hsl(0, 0%, 15%)",
    marginLeft: 8,
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
    backgroundColor: "hsl(0, 0%, 12%)", // Slightly lighter background
    borderWidth: 1.5, // Thicker border for better visibility
    borderColor: "hsl(0, 0%, 25%)", // Lighter border color
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
    color: "hsl(0, 0%, 85%)", // Lighter text for better contrast
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
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: "hsl(75, 100%, 60%)",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 0%)",
    textAlign: "center",
  },
  // Enhanced Recommendations Styles
  recommendationsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%)",
  },
  viewAllText: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(75, 100%, 60%)",
    marginRight: 4,
  },
  recommendationsContent: {
    paddingRight: 20,
  },
  partialCardIndicator: {
    width: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  partialCard: {
    width: 50,
    height: 50,
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%)",
  },
  partialCardText: {
    fontSize: 10,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(75, 100%, 60%)",
    marginTop: 2,
  },
});
