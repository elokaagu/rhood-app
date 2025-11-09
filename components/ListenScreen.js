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

const parseDurationString = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const colonParts = trimmed.split(":").map((part) => part.trim());
  if (colonParts.length >= 2 && colonParts.length <= 3) {
    const numbers = colonParts.map((part) => Number(part));
    if (numbers.every((part) => Number.isFinite(part))) {
      if (numbers.length === 3) {
        const [hours, minutes, seconds] = numbers;
        return hours * 3600 + minutes * 60 + seconds;
      }
      const [minutes, seconds] = numbers;
      return minutes * 60 + seconds;
    }
  }

  const asNumber = Number(trimmed);
  return Number.isFinite(asNumber) && asNumber > 0 ? asNumber : null;
};

const extractDurationSeconds = (mix) => {
  if (!mix || typeof mix !== "object") return null;

  const metadataSources = [
    mix.duration,
    mix.duration_seconds,
    mix.durationSeconds,
    mix.duration_secs,
    mix.metadata?.duration,
    mix.metadata?.duration_seconds,
    mix.audio_metadata?.duration,
    mix.audio_metadata?.duration_seconds,
    mix.audioMetadata?.duration,
    mix.audioMetadata?.duration_seconds,
  ];

  for (const source of metadataSources) {
    if (source == null) continue;
    if (typeof source === "number" && Number.isFinite(source) && source > 0) {
      return Math.round(source);
    }
    const parsed = parseDurationString(String(source));
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.round(parsed);
    }
  }

  const millisecondSources = [
    mix.duration_millis,
    mix.durationMillis,
    mix.duration_ms,
    mix.metadata?.duration_millis,
    mix.metadata?.durationMillis,
    mix.audio_metadata?.duration_millis,
    mix.audio_metadata?.durationMillis,
    mix.audioMetadata?.duration_millis,
    mix.audioMetadata?.durationMillis,
  ];

  for (const source of millisecondSources) {
    if (source == null) continue;
    const numeric = Number(source);
    if (Number.isFinite(numeric) && numeric > 0) {
      return Math.round(numeric / 1000);
    }
  }

  if (typeof mix.duration_formatted === "string") {
    const parsed = parseDurationString(mix.duration_formatted);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.round(parsed);
    }
  }

  return null;
};

const formatDurationLabel = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0:00";
  }
  const totalSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const normalizeSearchValue = (value) => {
  if (value === null || value === undefined) return "";
  return value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
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
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showAllRecommendations, setShowAllRecommendations] = useState(false);
  const [expandedGenres, setExpandedGenres] = useState({});

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
          let latestArtistName = null;
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
              latestArtistName =
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

          const fallbackArtist =
            mix.artist &&
            typeof mix.artist === "string" &&
            mix.artist.trim().length > 0
              ? mix.artist.trim()
              : "Unknown Artist";
          const resolvedArtist = latestArtistName || fallbackArtist;

        const durationSeconds = extractDurationSeconds(mix);
        const durationLabel = formatDurationLabel(durationSeconds);

          const transformedMix = {
            id: mix.id,
            user_id: mix.user_id, // IMPORTANT: Include for ownership check
            title: mix.title,
          artist: resolvedArtist,
            genre: mix.genre || "Electronic",
          durationSeconds,
          durationFormatted: durationLabel,
          durationLabel,
          duration: durationSeconds,
          durationMillis: durationSeconds
            ? durationSeconds * 1000
            : null,
            description: mix.description || "No description available",
            image:
              mix.artwork_url ||
              "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
            audioUrl: mix.file_url,
            plays: mix.plays || mix.play_count || 0,
            user: userProfile, // Include full user profile data
          artistStatus: userProfile?.status_message || null,
            created_at: mix.created_at || null,
          };

          const searchableParts = [
            transformedMix.title,
            transformedMix.artist,
            transformedMix.genre,
            transformedMix.description,
            userProfile?.username,
            userProfile?.dj_name,
            userProfile?.first_name,
            userProfile?.last_name,
            userProfile?.status_message,
          ]
            .filter(Boolean)
            .map((part) => normalizeSearchValue(part));

          transformedMix.searchIndex = searchableParts.join(" ");

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
  const genreCountsMap = mixes.reduce((acc, mix) => {
    const genreKey =
      typeof mix.genre === "string" && mix.genre.trim().length > 0
        ? mix.genre
        : "Other";
    if (!acc.has(genreKey)) {
      acc.set(genreKey, {
        count: 0,
        normalized: normalizeSearchValue(genreKey) || "other",
      });
    }
    acc.get(genreKey).count += 1;
    return acc;
  }, new Map());

  const genres = [
    "All",
    "Recently Added",
    ...Array.from(genreCountsMap.keys()),
  ];

  // Generate search suggestions

  // Filter mixes
  const filteredMixes = mixes.filter((mix) => {
    const normalizedQuery = normalizeSearchValue(searchQuery);
    const queryTokens = normalizedQuery
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean);

    const matchesSearch =
      queryTokens.length === 0 ||
      (mix.searchIndex &&
        queryTokens.every((token) => mix.searchIndex.includes(token)));

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
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
              }}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="hsl(0, 0%, 50%)" />
            </TouchableOpacity>
          )}
        </View>
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
            onPress={() => {
              handleGenreFilter(genre);
              if (
                genre !== "All" &&
                genre !== "Recently Added" &&
                genreCountsMap.has(genre)
              ) {
                const normalized =
                  genreCountsMap.get(genre)?.normalized || normalizeSearchValue(genre);
                setExpandedGenres((prev) => ({
                  ...prev,
                  [normalized]: true,
                }));
              }
            }}
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
  const renderRecommendations = () => {
    const recommendedMixes = showAllRecommendations ? mixes : mixes.slice(0, 5);
    return (
      <View style={styles.recommendationsSection}>
        <View style={styles.recommendationsHeader}>
          <Text style={styles.recommendationsTitle}>More Like This</Text>
          {mixes.length > 5 && (
            <TouchableOpacity
              style={styles.viewAllButton}
              activeOpacity={0.7}
              onPress={() => setShowAllRecommendations((prev) => !prev)}
            >
              <Text style={styles.viewAllText}>
                {showAllRecommendations ? "Show Less" : "View All"}
              </Text>
            <Ionicons
                name={showAllRecommendations ? "chevron-up" : "chevron-forward"}
              size={16}
              color="hsl(75, 100%, 60%)"
            />
          </TouchableOpacity>
          )}
        </View>
        {showAllRecommendations ? (
          <View style={styles.recommendationsGrid}>
            {recommendedMixes.map((mix) => (
              <TouchableOpacity
                key={`rec-grid-${mix.id}`}
                style={styles.recommendationGridCard}
                onPress={() => handleMixPress(mix)}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: mix.image }}
                  style={styles.recommendationGridImage}
                  resizeMode="cover"
                />
                <View style={styles.recommendationGridText}>
                  <Text style={styles.recommendationTitle} numberOfLines={1}>
                    {mix.title}
                  </Text>
                  <Text style={styles.recommendationArtist} numberOfLines={1}>
                    {mix.artist}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.recommendationsScroll}
          contentContainerStyle={styles.recommendationsContent}
        >
            {recommendedMixes.map((mix) => (
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
            {mixes.length > 5 && !showAllRecommendations && (
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
        )}
      </View>
    );
  };

  const renderFooter = () => (
    <>
      {/* Smart Recommendations */}
      {renderRecommendations()}

      {/* Genre Rows */}
      <View style={styles.genreRowsSection}>
        {Array.from(
          mixes.reduce((acc, mix) => {
            const genreKey =
              typeof mix.genre === "string" && mix.genre.trim().length > 0
                ? mix.genre
                : "Other";
        const normalizedGenre = normalizeSearchValue(genreKey) || "other";
        if (!acc.has(normalizedGenre)) {
          acc.set(normalizedGenre, {
            displayName: genreKey,
            mixes: [],
          });
        }
        acc.get(normalizedGenre).mixes.push(mix);
            return acc;
          }, new Map())
    ).map(([normalizedGenre, genreData]) => {
      const { displayName, mixes: genreMixes } = genreData;
      const isExpanded = !!expandedGenres[normalizedGenre];
      const visibleMixes = isExpanded ? genreMixes : genreMixes.slice(0, 10);

          return (
            <View key={`genre-row-${normalizedGenre}`} style={styles.genreRow}>
              <View style={styles.genreRowHeader}>
            <Text style={styles.genreRowTitle}>{displayName}</Text>
                {genreMixes.length > 10 && (
                  <TouchableOpacity
                    style={styles.genreRowToggle}
                    onPress={() =>
                      setExpandedGenres((prev) => ({
                        ...prev,
                        [normalizedGenre]: !prev[normalizedGenre],
                      }))
                    }
                    activeOpacity={0.7}
                  >
                    <Text style={styles.genreRowToggleText}>
                      {isExpanded ? "Show Less" : "View All"}
                    </Text>
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-forward"}
                      size={14}
                      color="hsl(75, 100%, 60%)"
                    />
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.genreRowContent}
              >
                {visibleMixes.map((mix) => (
                  <TouchableOpacity
                    key={`genre-row-mix-${mix.id}`}
                    style={styles.genreRowCard}
                    onPress={() => handleMixPress(mix)}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: mix.image }}
                      style={styles.genreRowImage}
                      resizeMode="cover"
                    />
                    <View style={styles.genreRowText}>
                      <Text style={styles.genreRowMixTitle} numberOfLines={1}>
                        {mix.title}
                      </Text>
                      <Text style={styles.genreRowMixArtist} numberOfLines={1}>
                        {mix.artist}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          );
        })}
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

  const renderListFooter = () => (
    <>
      {renderFooter()}
      {loadingMore && (
        <View style={styles.loadingMoreContainer}>
          <ActivityIndicator size="small" color="hsl(75, 100%, 60%)" />
          <Text style={styles.loadingMoreText}>Loading more mixes...</Text>
        </View>
      )}
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
        ListFooterComponent={renderListFooter}
        onEndReached={loadMoreMixes}
        onEndReachedThreshold={0.5}
        keyboardShouldPersistTaps="handled"
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
              Share your DJ mix (under 10 minutes) with the R/HOOD community!
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "rgba(75, 255, 150, 0.12)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%, 0.4)",
  },
  viewAllText: {
    fontSize: 13,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(75, 100%, 60%)",
    marginRight: 4,
  },
  recommendationsContent: {
    paddingRight: 20,
    gap: 16,
  },
  recommendationsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 16,
  },
  recommendationGridCard: {
    width: "48%",
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%, 0.1)",
  },
  recommendationGridImage: {
    width: "100%",
    height: 140,
  },
  recommendationGridText: {
    padding: 16,
    gap: 6,
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
  genreRowsSection: {
    marginTop: 28,
    gap: 28,
  },
  genreRow: {
    backgroundColor: "hsl(0, 0%, 6%)",
    borderRadius: 18,
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%, 0.08)",
  },
  genreRowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  genreRowTitle: {
    fontSize: 18,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    letterSpacing: 0.5,
  },
  genreRowToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(75, 255, 150, 0.12)",
  },
  genreRowToggleText: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(75, 100%, 60%)",
  },
  genreRowContent: {
    gap: 16,
  },
  genreRowCard: {
    width: 180,
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%, 0.08)",
    overflow: "hidden",
  },
  genreRowImage: {
    width: "100%",
    height: 120,
  },
  genreRowText: {
    padding: 14,
    gap: 4,
  },
  genreRowMixTitle: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
  },
  genreRowMixArtist: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 60%)",
  },
});
