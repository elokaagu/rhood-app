import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  RefreshControl,
  Modal,
  Image,
  Animated,
  Platform,
  ActionSheetIOS,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SkeletonMix } from "./Skeleton";
import { supabase, db } from "../lib/supabase";
import { HapticPatterns } from "../lib/haptics";
import { getRecommendedMixes } from "../lib/mixRecommendations";

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
  if (value == null || value === undefined) return null;
  
  // Handle numeric values directly
  if (typeof value === "number") {
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
    return null;
  }
  
  // Handle string values
  if (typeof value !== "string") return null;
  
  const trimmed = value.trim();
  if (!trimmed || trimmed === "0" || trimmed === "0:00") return null;

  const colonParts = trimmed.split(":").map((part) => part.trim());
  if (colonParts.length >= 2 && colonParts.length <= 3) {
    const numbers = colonParts.map((part) => Number(part));
    if (numbers.every((num) => Number.isFinite(num) && num >= 0)) {
      if (numbers.length === 3) {
        const [hours, minutes, seconds] = numbers;
        const totalSeconds = hours * 3600 + minutes * 60 + seconds;
        return totalSeconds > 0 ? totalSeconds : null;
      }
      const [minutes, seconds] = numbers;
      const totalSeconds = minutes * 60 + seconds;
      return totalSeconds > 0 ? totalSeconds : null;
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
    if (source == null || source === undefined) continue;
    // Handle numeric values (including 0, but we'll filter that out later)
    if (typeof source === "number" && Number.isFinite(source) && source > 0) {
      return Math.round(source);
    }
    // Handle string values (including "0", "0:00", etc.)
    if (typeof source === "string" && source.trim()) {
      const parsed = parseDurationString(source);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.round(parsed);
      }
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
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [likedMixIds, setLikedMixIds] = useState(() => new Set());
  const [mixLikeCounts, setMixLikeCounts] = useState({});
  const [likeLoadingMap, setLikeLoadingMap] = useState({});
  const [recommendedMixes, setRecommendedMixes] = useState([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [hasUserMixes, setHasUserMixes] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [showSaveToPlaylistModal, setShowSaveToPlaylistModal] = useState(false);
  const [selectedMixForPlaylist, setSelectedMixForPlaylist] = useState(null);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  
  // Fade-in animation for content
  const fadeAnim = useRef(new Animated.Value(0)).current;

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

      const mixIds = data
        .map((mix) => mix.id)
        .filter((id) => id !== null && id !== undefined);
      let likeCountsMap = {};

      if (mixIds.length > 0) {
        try {
          const { data: likeRows, error: likeError } = await supabase
            .from("mix_likes")
            .select("mix_id")
            .in("mix_id", mixIds);

          if (likeError) {
            if (likeError.code === "42P01" || likeError.code === "PGRST205") {
              console.warn("mix_likes table not found. Skipping like counts.");
            } else {
              console.error("❌ Error fetching mix like counts:", likeError);
            }
          } else if (Array.isArray(likeRows)) {
            likeCountsMap = likeRows.reduce((acc, row) => {
              if (!row?.mix_id) return acc;
              acc[row.mix_id] = (acc[row.mix_id] || 0) + 1;
              return acc;
            }, {});
          }
        } catch (likeFetchError) {
          console.error(
            "❌ Unexpected error fetching like counts:",
            likeFetchError
          );
        }
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

          const resolvedLikeCount =
            likeCountsMap[mix.id] ??
            mix.like_count ??
            mix.likes_count ??
            mix.likes ??
            mix.likeCount ??
            0;

          const durationSeconds = extractDurationSeconds(mix);
          const durationLabel = formatDurationLabel(durationSeconds);

          // Debug logging for duration extraction
          if (!durationSeconds || durationSeconds === 0) {
            console.log(`⚠️ Mix "${mix.title}" has no duration:`, {
              mixId: mix.id,
              duration: mix.duration,
              duration_seconds: mix.duration_seconds,
              durationSeconds: mix.durationSeconds,
              allMixFields: Object.keys(mix),
            });
          }

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
            duration_seconds: durationSeconds, // Also include snake_case version
            durationMillis: durationSeconds ? durationSeconds * 1000 : null,
            description: mix.description || "No description available",
            // Prioritize artwork_url, then image_url, then legacy image field, then null (let display components handle fallback)
            artwork_url: mix.artwork_url || mix.image_url || mix.image || null,
            image: mix.artwork_url || mix.image_url || mix.image || null,
            audioUrl: mix.file_url,
            plays: mix.plays || mix.play_count || 0,
            user: userProfile, // Include full user profile data
            artistStatus: userProfile?.status_message || null,
            created_at: mix.created_at || null,
            likeCount:
              Number.isFinite(Number(resolvedLikeCount)) &&
              Number(resolvedLikeCount) >= 0
                ? Number(resolvedLikeCount)
                : 0,
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
          console.log(`   🖼️ Artwork URL (raw): ${mix.artwork_url}`);
          console.log(`   🖼️ Image URL (raw): ${mix.image_url}`);
          console.log(`   🖼️ Image (raw): ${mix.image}`);
          console.log(`   👤 Artist: ${transformedMix.artist}`);

          return transformedMix;
        })
      );

      setMixLikeCounts(likeCountsMap);
      setMixes(transformedMixes);
    } catch (error) {
      console.error("❌ Error in fetchMixes:", error);
      setMixes([]);
    } finally {
      setLoading(false);

    }
  };

  // Load recommended mixes
  const loadRecommendedMixes = async () => {
    if (!user?.id) return;
    
    try {
      setRecommendationsLoading(true);
      const recommendations = await getRecommendedMixes(user.id, 10);
      setRecommendedMixes(recommendations || []);
    } catch (error) {
      console.error("Error loading recommended mixes:", error);
      setRecommendedMixes([]);
    } finally {
      setRecommendationsLoading(false);
    }
  };

  // Load mixes on mount
  useEffect(() => {
    fetchMixes();
  }, []);

  // Load recommended mixes when user changes
  useEffect(() => {
    if (user?.id) {
      loadRecommendedMixes();
    }
  }, [user?.id]);

  // Check if user has uploaded mixes
  useEffect(() => {
    const checkUserMixes = async () => {
      if (!user?.id) {
        setHasUserMixes(false);
        return;
      }

      try {
        const hasMixes = await db.hasUserUploadedMixes(user.id);
        setHasUserMixes(hasMixes);
      } catch (error) {
        console.error("Error checking user mixes:", error);
        setHasUserMixes(false);
      }
    };

    checkUserMixes();
  }, [user?.id]);

  useEffect(() => {
    const fetchUserLikedMixes = async () => {
      if (!user?.id) {
        setLikedMixIds(new Set());
        return;
      }

      try {
        const { data, error } = await supabase
          .from("mix_likes")
          .select("mix_id")
          .eq("user_id", user.id);

        if (error) {
          if (error.code === "42P01" || error.code === "PGRST205") {
            console.warn(
              "mix_likes table not found. Skipping liked mixes fetch."
            );
            return;
          }
          console.error("❌ Error fetching liked mixes:", error);
          return;
        }

        const likedSet = new Set(
          (data || [])
            .map((row) => row?.mix_id)
            .filter((mixId) => mixId !== null && mixId !== undefined)
        );

        setLikedMixIds(likedSet);
      } catch (error) {
        console.error("❌ Unexpected error fetching liked mixes:", error);
      }
    };

    fetchUserLikedMixes();
  }, [user?.id]);

  // Calculate trending mixes (ordered by likes + plays)
  const trendingMixes = React.useMemo(() => {
    return [...mixes]
      .map((mix) => {
        const likes = mixLikeCounts[mix.id] ?? mix.likeCount ?? 0;
        const plays = mix.plays ?? mix.play_count ?? 0;
        // Weighted score: likes are worth more than plays
        const score = likes * 2 + plays;
        return { ...mix, trendingScore: score };
      })
      .filter((mix) => mix.trendingScore > 0)
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, 20); // Top 20 trending
  }, [mixes, mixLikeCounts]);

  // Get user's liked mixes
  const userLikedMixes = React.useMemo(() => {
    if (!user?.id || likedMixIds.size === 0) return [];
    return mixes
      .filter((mix) => likedMixIds.has(mix.id))
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [mixes, likedMixIds, user?.id]);

  // Get unique genres from mixes
  const availableGenres = React.useMemo(() => {
    const genreSet = new Set();
    mixes.forEach((mix) => {
      if (mix.genre && mix.genre.trim()) {
        genreSet.add(mix.genre.trim());
      }
    });
    return Array.from(genreSet).sort();
  }, [mixes]);

  // Filter mixes for search
  const filteredMixes = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const normalizedQuery = normalizeSearchValue(searchQuery);
    const queryTokens = normalizedQuery
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean);

    return mixes.filter((mix) => {
    const matchesSearch =
      queryTokens.length === 0 ||
      (mix.searchIndex &&
        queryTokens.every((token) => mix.searchIndex.includes(token)));
      return matchesSearch;
  });
  }, [mixes, searchQuery]);

  // Sync playingMixId with globalAudioState (check both currentTrack and isPlaying)
  useEffect(() => {
    if (globalAudioState.currentTrack && globalAudioState.isPlaying) {
      const currentMix = mixes.find(
        (mix) => mix.id === globalAudioState.currentTrack.id
      );
      if (currentMix) {
        setPlayingMixId(globalAudioState.currentTrack.id);
      }
    } else {
      setPlayingMixId(null);
    }
  }, [globalAudioState.currentTrack, globalAudioState.isPlaying, mixes]);
  
  // Fade-in animation when content loads
  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [loading]);

  // Handle play/pause when user interacts with mix
  const handleMixPress = (mix) => {
    HapticPatterns.playPause();
    const isCurrentlyPlaying = playingMixId === mix.id && globalAudioState.isPlaying;
    
    if (isCurrentlyPlaying) {
      // Currently playing this mix - pause it
      onPauseAudio();
    } else if (playingMixId === mix.id && !globalAudioState.isPlaying) {
      // This mix is loaded but paused - resume it
      onResumeAudio();
    } else {
      // Play new mix - include user profile data for DJ image
      const normalizedMix = {
        ...mix,
        audioUrl: mix.audioUrl || mix.file_url || mix.audio_url || null,
        image: mix.artwork_url || mix.image_url || mix.image || null,
        user_id: mix.user_id || mix.user?.id,
        user_image: mix.user_image || mix.user?.profile_image_url,
        user_dj_name: mix.user_dj_name || mix.user?.dj_name,
        user_bio: mix.user_bio || mix.user?.bio,
        user: mix.user, // Include full user object if available
      };

      if (!normalizedMix.audioUrl) {
        return;
      }

      onPlayAudio(normalizedMix);
    }
  };

  // Handle long press to show mix options
  const handleMixLongPress = (mix) => {
    HapticPatterns.itemPress();
    const normalizedMix = {
      ...mix,
      audioUrl: mix.audioUrl || mix.file_url || mix.audio_url || null,
      image: mix.artwork_url || mix.image_url || mix.image || null,
      user_id: mix.user_id || mix.user?.id,
      user_image: mix.user_image || mix.user?.profile_image_url,
      user_dj_name: mix.user_dj_name || mix.user?.dj_name,
      user_bio: mix.user_bio || mix.user?.bio,
      user: mix.user,
    };

    if (!normalizedMix.audioUrl) {
      return;
    }

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Add to Queue", "Play Next", "Save to Playlist"],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            // Add to Queue
            if (onAddToQueue) {
              onAddToQueue(normalizedMix);
              HapticPatterns.success();
            }
          } else if (buttonIndex === 2) {
            // Play Next
            if (onPlayNext) {
              onPlayNext(normalizedMix);
              HapticPatterns.success();
            }
          } else if (buttonIndex === 3) {
            // Save to Playlist
            handleSaveToPlaylist(normalizedMix);
          }
        }
      );
    } else {
      // Android
      Alert.alert(
        mix.title || "Mix",
        "Choose an option",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Add to Queue",
            onPress: () => {
              if (onAddToQueue) {
                onAddToQueue(normalizedMix);
                HapticPatterns.success();
              }
            },
          },
          {
            text: "Play Next",
            onPress: () => {
              if (onPlayNext) {
                onPlayNext(normalizedMix);
                HapticPatterns.success();
              }
            },
          },
          {
            text: "Save to Playlist",
            onPress: () => {
              handleSaveToPlaylist(normalizedMix);
            },
          },
        ],
        { cancelable: true }
      );
    }
  };

  const handleArtistPress = (artistName, userId) => {
    HapticPatterns.itemPress();
    if (!userId) {
      Alert.alert("Error", "Unable to find artist profile");
      return;
    }

    // Navigate to the artist's profile
    onNavigate("user-profile", { userId });
  };

  const handleUploadMix = () => {
    HapticPatterns.buttonPress();
    setShowUploadModal(true);
  };

  // Fetch user's playlists
  const fetchPlaylists = useCallback(async () => {
    if (!user?.id) {
      setPlaylists([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("playlists")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        // If table doesn't exist, that's okay - we'll create it on first use
        if (error.code === "42P01" || error.code === "PGRST205") {
          console.log("Playlists table doesn't exist yet");
          setPlaylists([]);
          return;
        }
        console.error("❌ Error fetching playlists:", error);
        setPlaylists([]);
        return;
      }

      // Get mix counts for each playlist
      const playlistsWithCounts = await Promise.all(
        (data || []).map(async (playlist) => {
          try {
            const { count, error: countError } = await supabase
              .from("playlist_mixes")
              .select("*", { count: "exact", head: true })
              .eq("playlist_id", playlist.id);

            if (countError) {
              console.warn("Error getting mix count for playlist:", countError);
              return { ...playlist, mixCount: 0 };
            }

            return { ...playlist, mixCount: count || 0 };
          } catch (err) {
            console.warn("Error getting mix count:", err);
            return { ...playlist, mixCount: 0 };
          }
        })
      );

      setPlaylists(playlistsWithCounts);
    } catch (error) {
      console.error("❌ Error fetching playlists:", error);
      setPlaylists([]);
    }
  }, [user?.id]);

  // Save mix to playlist
  const handleSaveToPlaylist = useCallback((mix) => {
    if (!user?.id) {
      Alert.alert("Sign In Required", "You need to be signed in to save mixes to playlists.");
      return;
    }
    setSelectedMixForPlaylist(mix);
    setShowSaveToPlaylistModal(true);
    fetchPlaylists();
  }, [user?.id, fetchPlaylists]);

  // Create new playlist
  const handleCreatePlaylist = useCallback(async () => {
    if (!newPlaylistName.trim()) {
      Alert.alert("Error", "Please enter a playlist name");
      return;
    }

    if (!user?.id) {
      Alert.alert("Error", "You must be signed in to create playlists");
      return;
    }

    try {
      setCreatingPlaylist(true);
      const { data, error } = await supabase
        .from("playlists")
        .insert({
          user_id: user.id,
          name: newPlaylistName.trim(),
          description: null,
        })
        .select()
        .single();

      if (error) {
        // If table doesn't exist, show helpful error
        if (error.code === "42P01" || error.code === "PGRST205") {
          Alert.alert(
            "Database Setup Required",
            "The playlists feature requires database setup. Please contact support."
          );
          return;
        }
        throw error;
      }

      // Add mix to the newly created playlist
      if (selectedMixForPlaylist?.id && data?.id) {
        await handleAddMixToPlaylist(data.id, selectedMixForPlaylist.id);
      }

      setNewPlaylistName("");
      setShowSaveToPlaylistModal(false);
      setSelectedMixForPlaylist(null);
      fetchPlaylists();
      HapticPatterns.success();
      Alert.alert("Success", `"${newPlaylistName.trim()}" created and mix added!`);
    } catch (error) {
      console.error("❌ Error creating playlist:", error);
      Alert.alert("Error", "Failed to create playlist. Please try again.");
    } finally {
      setCreatingPlaylist(false);
    }
  }, [newPlaylistName, user?.id, selectedMixForPlaylist, fetchPlaylists]);

  // Add mix to existing playlist
  const handleAddMixToPlaylist = useCallback(async (playlistId, mixId) => {
    try {
      const { error } = await supabase
        .from("playlist_mixes")
        .insert({
          playlist_id: playlistId,
          mix_id: mixId,
        });

      if (error) {
        // If duplicate, that's okay
        if (error.code === "23505") {
          return; // Already in playlist
        }
        // If table doesn't exist, show helpful error
        if (error.code === "42P01" || error.code === "PGRST205") {
          Alert.alert(
            "Database Setup Required",
            "The playlists feature requires database setup. Please contact support."
          );
          return;
        }
        throw error;
      }

      HapticPatterns.success();
    } catch (error) {
      console.error("❌ Error adding mix to playlist:", error);
      throw error;
    }
  }, []);

  // Add mix to existing playlist handler
  const handleSelectPlaylist = useCallback(async (playlist) => {
    if (!selectedMixForPlaylist?.id) return;

    try {
      await handleAddMixToPlaylist(playlist.id, selectedMixForPlaylist.id);
      setShowSaveToPlaylistModal(false);
      setSelectedMixForPlaylist(null);
      fetchPlaylists();
      Alert.alert("Success", `Added to "${playlist.name}"`);
    } catch (error) {
      Alert.alert("Error", "Failed to add mix to playlist. Please try again.");
    }
  }, [selectedMixForPlaylist, handleAddMixToPlaylist, fetchPlaylists]);

  // Fetch playlists on mount and when user changes
  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  const handleRefresh = async () => {
    HapticPatterns.pullToRefresh();
    setRefreshing(true);
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

  const handleToggleLike = async (mix) => {
    if (!mix?.id) {
      return;
    }

    if (!user?.id) {
      Alert.alert(
        "Sign In Required",
        "You need to be signed in to like a mix.",
        [{ text: "OK" }]
      );
      return;
    }

    HapticPatterns.like();

    setLikeLoadingMap((prev) => ({
      ...prev,
      [mix.id]: true,
    }));

    try {
      const isCurrentlyLiked = likedMixIds.has(mix.id);

      if (!isCurrentlyLiked) {
        const { error: likeError } = await supabase
          .from("mix_likes")
          .insert([{ mix_id: mix.id, user_id: user.id }]);

        if (likeError) {
          if (likeError.code === "23505") {
            console.warn("Mix already liked. Syncing local state.");
            setLikedMixIds((prev) => {
              const updated = new Set(prev);
              updated.add(mix.id);
              return updated;
            });
          } else if (
            likeError.code === "42P01" ||
            likeError.code === "PGRST205"
          ) {
            Alert.alert(
              "Feature Unavailable",
              "Mix likes are not available right now. Please try again later."
            );
            return;
          } else {
            console.error("❌ Error liking mix:", likeError);
            Alert.alert(
              "Error",
              "We couldn't like this mix right now. Please try again."
            );
            return;
          }
        } else {
          setLikedMixIds((prev) => {
            const updated = new Set(prev);
            updated.add(mix.id);
            return updated;
          });

          setMixLikeCounts((prev) => {
            const currentCount = prev?.[mix.id] || 0;
            return {
              ...prev,
              [mix.id]: currentCount + 1,
            };
          });

          setMixes((prev) =>
            prev.map((item) => {
              if (item.id === mix.id) {
                const nextCount =
                  (Number.isFinite(item.likeCount) ? item.likeCount : 0) + 1;
                return { ...item, likeCount: nextCount };
              }
              return item;
            })
          );

          if (mix.user_id && mix.user_id !== user.id) {
            try {
              await db.incrementUserCredits(mix.user_id, 10);
            } catch (creditError) {
              console.error("❌ Error awarding credits:", creditError);
            }
          }
        }
      } else {
        const { error: unlikeError } = await supabase
          .from("mix_likes")
          .delete()
          .eq("mix_id", mix.id)
          .eq("user_id", user.id);

        if (unlikeError) {
          if (unlikeError.code === "42P01" || unlikeError.code === "PGRST205") {
            Alert.alert(
              "Feature Unavailable",
              "Mix likes are not available right now. Please try again later."
            );
            return;
          }

          console.error("❌ Error unliking mix:", unlikeError);
          Alert.alert(
            "Error",
            "We couldn't unlike this mix right now. Please try again."
          );
          return;
        }

        setLikedMixIds((prev) => {
          const updated = new Set(prev);
          updated.delete(mix.id);
          return updated;
        });

        setMixLikeCounts((prev) => {
          const currentCount = prev?.[mix.id] || 0;
          const nextCount = Math.max(0, currentCount - 1);
          return {
            ...prev,
            [mix.id]: nextCount,
          };
        });

        setMixes((prev) =>
          prev.map((item) => {
            if (item.id === mix.id) {
              const baseCount = Number.isFinite(item.likeCount)
                ? item.likeCount
                : 0;
              const nextCount = Math.max(0, baseCount - 1);
              return { ...item, likeCount: nextCount };
            }
            return item;
          })
        );

        if (mix.user_id && mix.user_id !== user.id) {
          try {
            await db.incrementUserCredits(mix.user_id, -10);
          } catch (creditError) {
            console.error("❌ Error rolling back credits:", creditError);
          }
        }
      }
    } catch (error) {
      console.error("❌ Unexpected error liking mix:", error);
      Alert.alert(
        "Error",
        "We couldn't like this mix right now. Please try again."
      );
    } finally {
      setLikeLoadingMap((prev) => {
        const { [mix.id]: _ignored, ...rest } = prev;
        return rest;
      });
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
            onChangeText={(text) => {
              setSearchQuery(text);
              // Clear genre selection when typing
              if (text.trim() && selectedGenre) {
                setSelectedGenre(null);
              }
            }}
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

      {/* Genre Chips */}
      {availableGenres.length > 0 && (
        <View style={styles.genreFilterContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.genreFilterContent}
      >
            {availableGenres.map((genre) => {
              const isActive = selectedGenre === genre;
              return (
          <TouchableOpacity
            key={genre}
            style={[
              styles.genreChip,
                    isActive && styles.genreChipActive,
            ]}
            onPress={() => {
                    HapticPatterns.itemPress();
                    if (selectedGenre === genre) {
                      // Deselect if already selected
                      setSelectedGenre(null);
                      setSearchQuery("");
                    } else {
                      // Select genre and set search query
                      setSelectedGenre(genre);
                      setSearchQuery(genre);
              }
            }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.genreChipText,
                      isActive && styles.genreChipTextActive,
              ]}
            >
              {genre}
            </Text>
          </TouchableOpacity>
              );
            })}
      </ScrollView>
        </View>
      )}
    </>
  );

  // Trending / Most Popular section
  const renderTrending = () => {
    if (trendingMixes.length === 0) {
      return null;
    }

    return (
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => {
            HapticPatterns.itemPress();
            if (onNavigate) {
              onNavigate("trending-mixes");
            }
          }}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons
              name="flame"
              size={18}
              color="hsl(75, 100%, 60%)"
            />
            <Text style={styles.sectionTitle}>TRENDING</Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color="hsl(0, 0%, 60%)"
          />
        </TouchableOpacity>
        <Text style={styles.sectionSubtitle}>
          Who's hottest on the platform right now
        </Text>
        <View style={styles.popularList}>
          {trendingMixes.map((mix) => {
            const isPlaying = playingMixId === mix.id && globalAudioState.isPlaying;
            return (
              <TouchableOpacity
                key={`trending-${mix.id}`}
                style={styles.popularRow}
                onPress={() => handleMixPress(mix)}
                onLongPress={() => handleMixLongPress(mix)}
                delayLongPress={500}
                activeOpacity={0.8}
              >
                <View style={styles.popularImageWrap}>
                  <Image
                    source={
                      mix.artwork_url || mix.image_url || mix.image
                        ? { uri: mix.artwork_url || mix.image_url || mix.image }
                        : require("../assets/rhood_logo.webp")
                    }
                    style={styles.popularImage}
                    resizeMode="cover"
                  />
                  {isPlaying && (
                    <View style={styles.recommendationPlayingOverlay}>
                      <Ionicons
                        name="play"
                        size={20}
                        color="hsl(75, 100%, 60%)"
                      />
                    </View>
                  )}
                </View>
                <View style={styles.popularInfo}>
                  <Text style={styles.popularTitle} numberOfLines={1}>
                    {mix.title}
                  </Text>
                  <Text style={styles.popularSubtitle} numberOfLines={1}>
                    {mix.artist || mix.user_dj_name || "Unknown"}
                  </Text>
                  <View style={styles.popularMetaRow}>
                    {mix.durationFormatted && (
                      <Text style={styles.popularMeta}>
                        {mix.durationFormatted}
                    </Text>
                  )}
                    {mix.genre && (
                      <>
                        {mix.durationFormatted && (
                          <Text style={styles.popularMeta}> • </Text>
                        )}
                        <Text style={styles.popularMeta}>{mix.genre}</Text>
                      </>
                    )}
                </View>
                </View>
                <TouchableOpacity
                  style={styles.likeButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleToggleLike(mix);
                  }}
                  activeOpacity={0.7}
                  disabled={likeLoadingMap[mix.id]}
                >
                  <Ionicons
                    name={likedMixIds.has(mix.id) ? "heart" : "heart-outline"}
                    size={18}
                    color={likedMixIds.has(mix.id) ? "hsl(75, 100%, 60%)" : "hsl(0, 0%, 60%)"}
                  />
                </TouchableOpacity>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color="hsl(0, 0%, 60%)"
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // Your Likes section
  const renderYourLikes = () => {
    if (!user?.id || userLikedMixes.length === 0) {
      return null;
    }

    return (
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => {
            HapticPatterns.itemPress();
            if (onNavigate) {
              onNavigate("your-likes");
            }
          }}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons
              name="heart"
              size={18}
                color="hsl(75, 100%, 60%)"
              />
            <Text style={styles.sectionTitle}>YOUR LIKES</Text>
        </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color="hsl(0, 0%, 60%)"
          />
        </TouchableOpacity>
        <Text style={styles.sectionSubtitle}>
          Mixes you've already liked
        </Text>
        <View style={styles.popularList}>
          {userLikedMixes.map((mix) => {
              const isPlaying = playingMixId === mix.id;
              return (
                <TouchableOpacity
                key={`liked-${mix.id}`}
                style={styles.popularRow}
                  onPress={() => handleMixPress(mix)}
                  onLongPress={() => handleMixLongPress(mix)}
                  delayLongPress={500}
                  activeOpacity={0.8}
                >
                <View style={styles.popularImageWrap}>
                    <Image
                      source={
                      mix.artwork_url || mix.image_url || mix.image
                        ? { uri: mix.artwork_url || mix.image_url || mix.image }
                          : require("../assets/rhood_logo.webp")
                      }
                    style={styles.popularImage}
                      resizeMode="cover"
                    />
                    {isPlaying && (
                      <View style={styles.recommendationPlayingOverlay}>
                        <Ionicons
                          name="play"
                        size={20}
                          color="hsl(75, 100%, 60%)"
                        />
                      </View>
                    )}
                  </View>
                <View style={styles.popularInfo}>
                  <Text style={styles.popularTitle} numberOfLines={1}>
                      {mix.title}
                    </Text>
                  <Text style={styles.popularSubtitle} numberOfLines={1}>
                      {mix.artist || mix.user_dj_name || "Unknown"}
                    </Text>
                  <View style={styles.popularMetaRow}>
                    {mix.durationFormatted && (
                      <Text style={styles.popularMeta}>
                        {mix.durationFormatted}
                      </Text>
                    )}
                    {mix.genre && (
                      <>
                        {mix.durationFormatted && (
                          <Text style={styles.popularMeta}> • </Text>
                        )}
                        <Text style={styles.popularMeta}>{mix.genre}</Text>
                      </>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.likeButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleToggleLike(mix);
                  }}
                  activeOpacity={0.7}
                  disabled={likeLoadingMap[mix.id]}
                >
                  <Ionicons
                    name={likedMixIds.has(mix.id) ? "heart" : "heart-outline"}
                    size={18}
                    color={likedMixIds.has(mix.id) ? "hsl(75, 100%, 60%)" : "hsl(0, 0%, 60%)"}
                  />
                </TouchableOpacity>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color="hsl(0, 0%, 60%)"
                />
                </TouchableOpacity>
              );
            })}
          </View>
      </View>
    );
  };

  // You May Like section (recommendations)
  const renderYouMayLike = () => {
    if (recommendedMixes.length === 0) {
      return null;
    }

    return (
      <View style={styles.recommendationsSection}>
        <View style={styles.recommendationsHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons
              name="sparkles"
              size={18}
              color="hsl(75, 100%, 60%)"
            />
            <Text style={styles.recommendationsTitle}>
              YOU MAY LIKE
            </Text>
          </View>
        </View>
        <Text style={styles.recommendationExplainer}>
          Recommendations based on your likes and connections
        </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.recommendationsScroll}
            contentContainerStyle={styles.recommendationsContent}
          >
            {recommendedMixes.map((mix) => {
              const isPlaying = playingMixId === mix.id;
              return (
                <TouchableOpacity
                  key={mix.id}
                  style={styles.recommendationCard}
                  onPress={() => handleMixPress(mix)}
                  onLongPress={() => handleMixLongPress(mix)}
                  delayLongPress={500}
                  activeOpacity={0.8}
                >
                  <View style={styles.recommendationImageContainer}>
                    <Image
                      source={
                      mix.artwork_url || mix.image_url || mix.image
                        ? { uri: mix.artwork_url || mix.image_url || mix.image }
                          : require("../assets/rhood_logo.webp")
                      }
                      style={styles.recommendationImage}
                      resizeMode="cover"
                    />
                    {isPlaying && (
                      <View style={styles.recommendationPlayingOverlay}>
                        <Ionicons
                          name="play"
                          size={24}
                          color="hsl(75, 100%, 60%)"
                        />
                      </View>
                    )}
                    {/* Like button overlay */}
                    <TouchableOpacity
                      style={styles.recommendationLikeButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleToggleLike(mix);
                      }}
                      activeOpacity={0.7}
                      disabled={likeLoadingMap[mix.id]}
                    >
                      <Ionicons
                        name={likedMixIds.has(mix.id) ? "heart" : "heart-outline"}
                        size={20}
                        color={likedMixIds.has(mix.id) ? "hsl(75, 100%, 60%)" : "hsl(0, 0%, 100%)"}
                      />
                    </TouchableOpacity>
                  {/* Dark gradient overlay at bottom for text visibility */}
                  <LinearGradient
                    colors={["transparent", "rgba(0, 0, 0, 0.3)", "rgba(0, 0, 0, 0.8)", "rgba(0, 0, 0, 0.95)"]}
                    style={styles.recommendationGradientOverlay}
                  />
                  {/* Text overlay */}
                  <View style={styles.recommendationInfo}>
                    <Text
                      style={styles.recommendationTitle}
                      numberOfLines={1}
                    >
                      {mix.title}
                    </Text>
                    <Text
                      style={styles.recommendationArtist}
                      numberOfLines={1}
                    >
                      {mix.artist || mix.user_dj_name || "Unknown"}
                    </Text>
                    {mix.genre && (
                      <Text
                        style={styles.recommendationGenre}
                        numberOfLines={1}
                      >
                        {mix.genre}
                      </Text>
                    )}
                  </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
      </View>
    );
  };

  // Playlists section
  const renderPlaylists = () => {
    if (!user?.id || playlists.length === 0) {
      return null;
    }

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons
              name="musical-notes"
              size={18}
              color="hsl(75, 100%, 60%)"
            />
            <Text style={styles.sectionTitle}>YOUR PLAYLISTS</Text>
          </View>
        </View>
        <Text style={styles.sectionSubtitle}>
          Your saved collections of mixes
        </Text>
        <View style={styles.playlistsList}>
          {playlists.map((playlist) => (
            <TouchableOpacity
              key={playlist.id}
              style={styles.playlistRow}
              onPress={() => {
                HapticPatterns.itemPress();
                if (onNavigate) {
                  onNavigate("playlist-detail", { playlistId: playlist.id, playlistName: playlist.name });
                }
              }}
              activeOpacity={0.8}
            >
              <View style={styles.playlistIconContainer}>
                <Ionicons
                  name="musical-notes"
                  size={24}
                  color="hsl(75, 100%, 60%)"
                />
              </View>
              <View style={styles.playlistInfo}>
                <Text style={styles.playlistName} numberOfLines={1}>
                  {playlist.name}
                </Text>
                <Text style={styles.playlistMeta}>
                  {playlist.mixCount || 0} {playlist.mixCount === 1 ? "mix" : "mixes"}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color="hsl(0, 0%, 60%)"
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderFooter = () => (
    <>
      {/* Upload CTA */}
      <View style={styles.uploadSection}>
        <View style={styles.uploadCard}>
          <Text style={styles.uploadTitle}>Share Your Mix</Text>
          <Text style={styles.uploadDescription}>
            {hasUserMixes
              ? "Update your mix or upload a new one"
              : "Upload your own DJ mix and connect with the community"}
          </Text>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={handleUploadMix}
            activeOpacity={0.8}
          >
            <Text style={styles.uploadButtonText}>
              {hasUserMixes ? "Manage Mixes" : "Upload Mix"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Spacing */}
      <View style={styles.bottomSpacing} />
    </>
  );


  // Render search results if searching
  const renderSearchResults = () => {
    if (!searchQuery.trim()) return null;

          return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>SEARCH RESULTS</Text>
              </View>
        {filteredMixes.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
              name="search"
                size={48}
                color="hsl(0, 0%, 30%)"
              />
            <Text style={styles.emptyStateTitle}>No results found</Text>
              <Text style={styles.emptyStateSubtitle}>
              No mixes match "{searchQuery}". Try a different search term.
              </Text>
          </View>
        ) : (
          <View style={styles.popularList}>
            {filteredMixes.map((mix) => {
              const isPlaying = playingMixId === mix.id;
              return (
                <TouchableOpacity
                  key={`search-${mix.id}`}
                  style={styles.popularRow}
                  onPress={() => handleMixPress(mix)}
                  onLongPress={() => handleMixLongPress(mix)}
                  delayLongPress={500}
                  activeOpacity={0.8}
                >
                  <View style={styles.popularImageWrap}>
                    <Image
                      source={
                        mix.artwork_url || mix.image_url || mix.image
                          ? { uri: mix.artwork_url || mix.image_url || mix.image }
                          : require("../assets/rhood_logo.webp")
                      }
                      style={styles.popularImage}
                      resizeMode="cover"
                    />
                    {isPlaying && (
                      <View style={styles.recommendationPlayingOverlay}>
                        <Ionicons
                          name="play"
                          size={20}
                          color="hsl(75, 100%, 60%)"
                        />
                      </View>
                    )}
                  </View>
                  <View style={styles.popularInfo}>
                    <Text style={styles.popularTitle} numberOfLines={1}>
                      {mix.title}
                  </Text>
                    <Text style={styles.popularSubtitle} numberOfLines={1}>
                      {mix.artist || mix.user_dj_name || "Unknown"}
                    </Text>
                    <View style={styles.popularMetaRow}>
                      {mix.durationFormatted && (
                        <Text style={styles.popularMeta}>
                          {mix.durationFormatted}
                        </Text>
                      )}
                      {mix.genre && (
                        <>
                          {mix.durationFormatted && (
                            <Text style={styles.popularMeta}> • </Text>
                          )}
                          <Text style={styles.popularMeta}>{mix.genre}</Text>
                        </>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.likeButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleToggleLike(mix);
                    }}
                    activeOpacity={0.7}
                    disabled={likeLoadingMap[mix.id]}
                  >
                    <Ionicons
                      name={likedMixIds.has(mix.id) ? "heart" : "heart-outline"}
                      size={18}
                      color={likedMixIds.has(mix.id) ? "hsl(75, 100%, 60%)" : "hsl(0, 0%, 60%)"}
                    />
                  </TouchableOpacity>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color="hsl(0, 0%, 60%)"
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="hsl(75, 100%, 60%)"
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {renderHeader()}
        
        {loading ? (
          <View style={styles.skeletonContainer}>
            <SkeletonMix />
            <SkeletonMix />
            <SkeletonMix />
            <SkeletonMix />
            <SkeletonMix />
          </View>
        ) : (
          <Animated.View style={{ opacity: fadeAnim }}>
            {searchQuery.trim() ? (
              renderSearchResults()
            ) : (
              <>
                {renderPlaylists()}
                {renderTrending()}
                {renderYourLikes()}
                {renderYouMayLike()}
              </>
            )}
            {renderFooter()}
          </Animated.View>
        )}
      </ScrollView>

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

      {/* Save to Playlist Modal */}
      <Modal
        visible={showSaveToPlaylistModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowSaveToPlaylistModal(false);
          setSelectedMixForPlaylist(null);
          setNewPlaylistName("");
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.playlistModalContent}>
            <View style={styles.playlistModalHeader}>
              <Text style={styles.playlistModalTitle}>Save to Playlist</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowSaveToPlaylistModal(false);
                  setSelectedMixForPlaylist(null);
                  setNewPlaylistName("");
                }}
                style={styles.playlistModalClose}
              >
                <Ionicons name="close" size={24} color="hsl(0, 0%, 100%)" />
              </TouchableOpacity>
            </View>

            {selectedMixForPlaylist && (
              <View style={styles.playlistMixPreview}>
                <Image
                  source={
                    selectedMixForPlaylist.artwork_url ||
                    selectedMixForPlaylist.image_url ||
                    selectedMixForPlaylist.image
                      ? {
                          uri:
                            selectedMixForPlaylist.artwork_url ||
                            selectedMixForPlaylist.image_url ||
                            selectedMixForPlaylist.image,
                        }
                      : require("../assets/rhood_logo.webp")
                  }
                  style={styles.playlistMixPreviewImage}
                  resizeMode="cover"
                />
                <View style={styles.playlistMixPreviewInfo}>
                  <Text style={styles.playlistMixPreviewTitle} numberOfLines={1}>
                    {selectedMixForPlaylist.title}
                  </Text>
                  <Text style={styles.playlistMixPreviewArtist} numberOfLines={1}>
                    {selectedMixForPlaylist.artist ||
                      selectedMixForPlaylist.user_dj_name ||
                      "Unknown"}
                  </Text>
                </View>
              </View>
            )}

            <ScrollView style={styles.playlistModalScroll}>
              {/* Create New Playlist */}
              <View style={styles.createPlaylistSection}>
                <Text style={styles.createPlaylistTitle}>Create New Playlist</Text>
                <View style={styles.createPlaylistInputContainer}>
                  <TextInput
                    style={styles.createPlaylistInput}
                    placeholder="Playlist name"
                    placeholderTextColor="hsl(0, 0%, 50%)"
                    value={newPlaylistName}
                    onChangeText={setNewPlaylistName}
                    maxLength={50}
                  />
                  <TouchableOpacity
                    style={[
                      styles.createPlaylistButton,
                      (!newPlaylistName.trim() || creatingPlaylist) &&
                        styles.createPlaylistButtonDisabled,
                    ]}
                    onPress={handleCreatePlaylist}
                    disabled={!newPlaylistName.trim() || creatingPlaylist}
                    activeOpacity={0.8}
                  >
                    {creatingPlaylist ? (
                      <ActivityIndicator size="small" color="hsl(0, 0%, 0%)" />
                    ) : (
                      <Text style={styles.createPlaylistButtonText}>Create</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Existing Playlists */}
              {playlists.length > 0 && (
                <View style={styles.existingPlaylistsSection}>
                  <Text style={styles.existingPlaylistsTitle}>Add to Existing Playlist</Text>
                  {playlists.map((playlist) => (
                    <TouchableOpacity
                      key={playlist.id}
                      style={styles.existingPlaylistItem}
                      onPress={() => handleSelectPlaylist(playlist)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.existingPlaylistIcon}>
                        <Ionicons
                          name="musical-notes"
                          size={20}
                          color="hsl(75, 100%, 60%)"
                        />
                      </View>
                      <View style={styles.existingPlaylistInfo}>
                        <Text style={styles.existingPlaylistName} numberOfLines={1}>
                          {playlist.name}
                        </Text>
                        <Text style={styles.existingPlaylistMeta}>
                          {playlist.mixCount || 0} {playlist.mixCount === 1 ? "mix" : "mixes"}
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color="hsl(0, 0%, 60%)"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
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
    fontFamily: "TS Block Bold",
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 160,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "TS Block Bold",
    fontWeight: "900",
    color: "hsl(0, 0%, 100%)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 60%)",
    marginBottom: 16,
    lineHeight: 18,
  },
  popularMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
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
    fontFamily: "TS Block Bold",
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
    fontFamily: "TS Block Bold",
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
  recommendationImageContainer: {
    position: "relative",
    width: "100%",
    height: 140,
    marginBottom: 8,
  },
  recommendationImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    backgroundColor: "hsl(0, 0%, 12%)",
  },
  recommendationPlayingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  recommendationInfo: {
    padding: 0,
    gap: 2,
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
  // Shuffle Styles
  shuffleContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  shuffleButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "hsl(0, 0%, 8%)",
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%, 0.3)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  shuffleButtonText: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(75, 100%, 60%)",
  },
  // Genre Filter Styles
  genreFilterContainer: {
    marginBottom: 16,
    marginTop: 8,
  },
  genreFilterContent: {
    paddingHorizontal: 20,
    gap: 8,
    paddingRight: 20,
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
    fontFamily: "TS Block Bold",
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
  recommendationsSection: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  recommendationsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  recommendationsTitle: {
    fontSize: 18,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    letterSpacing: 0.5,
  },
  recommendationsScroll: {
    marginHorizontal: -20,
  },
  recommendationsContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  recommendationCard: {
    width: 160,
    height: 200,
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%, 0.1)",
  },
  recommendationImageContainer: {
    position: "relative",
    width: "100%",
    height: "100%",
    flex: 1,
  },
  recommendationImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "hsl(0, 0%, 12%)",
  },
  recommendationPlayingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  recommendationGradientOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "50%",
  },
  recommendationInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    gap: 4,
    zIndex: 1,
  },
  recommendationTitle: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
  },
  recommendationArtist: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 85%)",
  },
  recommendationGenre: {
    fontSize: 11,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 60%)",
    marginTop: 2,
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
    paddingHorizontal: 20,
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
    borderRadius: 16,
    backgroundColor: "hsl(0, 0%, 12%)",
  },
  recommendationGridText: {
    padding: 16,
    gap: 6,
  },
  // Popular releases style list (for More Like This)
  popularList: {
    marginTop: 8,
  },
  popularRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  popularImageWrap: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "hsl(0, 0%, 12%)",
  },
  popularImage: {
    width: "100%",
    height: "100%",
  },
  popularInfo: {
    flex: 1,
    gap: 4,
  },
  popularTitle: {
    fontSize: 16,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
  },
  popularSubtitle: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 80%)",
  },
  popularMeta: {
    fontSize: 13,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 60%)",
  },
  likeButton: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  recommendationLikeButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
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
    marginTop: 36,
    gap: 32,
  },
  genreRow: {
    backgroundColor: "transparent",
    borderRadius: 18,
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderWidth: 0,
    borderColor: "transparent",
    marginHorizontal: 20,
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
    gap: 20,
  },
  genreRowCard: {
    width: 180,
    height: 220,
    backgroundColor: "transparent",
    borderRadius: 16,
    borderWidth: 0,
    borderColor: "transparent",
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  genreRowImage: {
    ...StyleSheet.absoluteFillObject,
  },
  genreRowGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  genreRowTextOverlay: {
    padding: 16,
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
  recommendationExplainer: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 60%)",
    marginTop: 4,
    marginBottom: 16,
    paddingHorizontal: 20,
    lineHeight: 16,
  },
  genreRowExplainer: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 60%)",
    marginTop: 4,
    lineHeight: 16,
  },
  // Playlist Styles
  playlistsList: {
    marginTop: 8,
  },
  playlistRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  playlistIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "hsl(0, 0%, 12%)",
    justifyContent: "center",
    alignItems: "center",
  },
  playlistInfo: {
    flex: 1,
    gap: 4,
  },
  playlistName: {
    fontSize: 16,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
  },
  playlistMeta: {
    fontSize: 13,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 60%)",
  },
  // Save to Playlist Modal Styles
  playlistModalContent: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: 20,
  },
  playlistModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  playlistModalTitle: {
    fontSize: 20,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    fontWeight: "bold",
  },
  playlistModalClose: {
    padding: 4,
  },
  playlistMixPreview: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  playlistMixPreviewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  playlistMixPreviewInfo: {
    flex: 1,
    gap: 4,
  },
  playlistMixPreviewTitle: {
    fontSize: 16,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
  },
  playlistMixPreviewArtist: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
  },
  playlistModalScroll: {
    maxHeight: 400,
  },
  createPlaylistSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  createPlaylistTitle: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 12,
  },
  createPlaylistInputContainer: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  createPlaylistInput: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 12%)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 100%)",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 20%)",
  },
  createPlaylistButton: {
    backgroundColor: "hsl(75, 100%, 60%)",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  createPlaylistButtonDisabled: {
    opacity: 0.5,
  },
  createPlaylistButtonText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 0%)",
  },
  existingPlaylistsSection: {
    padding: 20,
  },
  existingPlaylistsTitle: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 12,
  },
  existingPlaylistItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  existingPlaylistIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "hsl(0, 0%, 12%)",
    justifyContent: "center",
    alignItems: "center",
  },
  existingPlaylistInfo: {
    flex: 1,
    gap: 4,
  },
  existingPlaylistName: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "500",
    color: "hsl(0, 0%, 100%)",
  },
  existingPlaylistMeta: {
    fontSize: 13,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 60%)",
  },
});
