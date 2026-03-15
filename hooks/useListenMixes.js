import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  RefreshControl,
  Platform,
  ActionSheetIOS,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { supabase, db } from "../lib/supabase";
import { HapticPatterns } from "../lib/haptics";
import { getRecommendedMixes } from "../lib/mixRecommendations";
import { LIST_PERFORMANCE, LISTEN_LIST_PERFORMANCE } from "../lib/performanceConstants";
import ListenScreenHeader from "../components/ListenScreenHeader";
import ListenScreenFooter from "../components/ListenScreenFooter";
import {
  ListenMixRow,
  ListenPlaylistRow,
  ListenSectionHeader,
  ListenRecommendationStrip,
} from "../components/ListenScreenRows";
import { extractDurationSeconds, formatDurationLabel, normalizeSearchValue } from "../lib/listenScreenUtils";
import styles from "../components/ListenScreen.styles";

export function useListenMixes({
  user,
  globalAudioState,
  onPlayAudio,
  onPauseAudio,
  onResumeAudio,
  onStopAudio,
  onAddToQueue,
  onPlayNext,
  onNavigate,
  handleSaveToPlaylist,
  playlists = [],
}) {
  const [mixes, setMixes] = useState([]);
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
  const [userMixes, setUserMixes] = useState([]);
  const [showManageMixesModal, setShowManageMixesModal] = useState(false);
  const [loadingUserMixes, setLoadingUserMixes] = useState(false);
  const [pinnedMixesCount, setPinnedMixesCount] = useState(0);


  // Derive from global audio: avoids sync effect and state updates when mixes change
  const playingMixId =
    globalAudioState.currentTrack && globalAudioState.isPlaying
      ? globalAudioState.currentTrack.id
      : null;

  const fetchMixes = useCallback(async () => {
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

      if (__DEV__) console.log(`✅ Fetched ${data.length} mixes from database`);

      if (data.length === 0) {
        if (__DEV__) console.log("📭 No mixes found in database");
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

      // Batch-fetch all user profiles for mixes in one query (avoids N+1)
      const userIds = [...new Set(data.map((m) => m.user_id).filter(Boolean))];
      let profilesById = {};
      if (userIds.length > 0) {
        try {
          const { data: profiles, error: profilesError } = await supabase
            .from("user_profiles")
            .select("id, dj_name, first_name, last_name, bio, profile_image_url, username, status_message")
            .in("id", userIds);

          if (!profilesError && Array.isArray(profiles)) {
            profilesById = profiles.reduce((acc, p) => {
              if (p?.id) acc[p.id] = p;
              return acc;
            }, {});
          }
        } catch (profilesFetchError) {
          console.error("❌ Error batch-fetching user profiles:", profilesFetchError);
        }
      }

      // Transform mixes synchronously using batched profiles
      const transformedMixes = data.map((mix) => {
        const profile = mix.user_id ? profilesById[mix.user_id] : null;
        const latestArtistName = profile
          ? profile.dj_name ||
            `${profile.first_name || ""} ${profile.last_name || ""}`.trim() ||
            "Unknown Artist"
          : null;

        const userProfile = profile
          ? {
              id: mix.user_id,
              dj_name: profile.dj_name,
              first_name: profile.first_name,
              last_name: profile.last_name,
              bio: profile.bio,
              profile_image_url: profile.profile_image_url,
              username: profile.username,
              status_message: profile.status_message,
            }
          : null;

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

        if (__DEV__ && (!durationSeconds || durationSeconds === 0)) {
          console.log(`⚠️ Mix "${mix.title}" has no duration:`, {
            mixId: mix.id,
            duration: mix.duration,
            duration_seconds: mix.duration_seconds,
          });
        }

        const transformedMix = {
          id: mix.id,
          user_id: mix.user_id,
          title: mix.title,
          artist: resolvedArtist,
          genre: mix.genre || "Electronic",
          durationSeconds,
          durationFormatted: durationLabel,
          durationLabel,
          duration: durationSeconds,
          duration_seconds: durationSeconds,
          durationMillis: durationSeconds ? durationSeconds * 1000 : null,
          description: mix.description || "No description available",
          artwork_url: mix.artwork_url || mix.image_url || mix.image || null,
          image: mix.artwork_url || mix.image_url || mix.image || null,
          audioUrl: mix.file_url,
          plays: mix.plays || mix.play_count || 0,
          user: userProfile,
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

        return transformedMix;
      });

      setMixLikeCounts(likeCountsMap);
      setMixes(transformedMixes);
    } catch (error) {
      console.error("❌ Error in fetchMixes:", error);
      setMixes([]);
    } finally {
      setLoading(false);
    }
  }, []);

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

  // Single effect: run all user-dependent loads when user is available (avoids 4 separate effects)
  useEffect(() => {
    if (!user?.id) {
      setLikedMixIds(new Set());
      setHasUserMixes(false);
      return;
    }
    (async () => {
      await Promise.all([
        loadRecommendedMixes(),
        (async () => {
          try {
            const hasMixes = await db.hasUserUploadedMixes(user.id);
            setHasUserMixes(hasMixes);
          } catch (error) {
            if (__DEV__) console.error("Error checking user mixes:", error);
            setHasUserMixes(false);
          }
        })(),
        (async () => {
          try {
            const { data, error } = await supabase
              .from("mix_likes")
              .select("mix_id")
              .eq("user_id", user.id);
            if (error) {
              if (error.code !== "42P01" && error.code !== "PGRST205") {
                console.error("❌ Error fetching liked mixes:", error);
              }
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
        })(),
      ]);
    })();
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

  const handleMixPress = useCallback(
    (mix) => {
      HapticPatterns.playPause();
      const isCurrentlyPlaying = playingMixId === mix.id && globalAudioState.isPlaying;

      if (isCurrentlyPlaying) {
        onPauseAudio();
      } else if (playingMixId === mix.id && !globalAudioState.isPlaying) {
        onResumeAudio();
      } else {
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

        if (!normalizedMix.audioUrl) return;
        onPlayAudio(normalizedMix);
      }
    },
    [globalAudioState.currentTrack, globalAudioState.isPlaying, onPauseAudio, onResumeAudio, onPlayAudio]
  );

  const handleMixLongPress = useCallback(
    (mix) => {
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

      if (!normalizedMix.audioUrl) return;

      const isOwnMix = user?.id && normalizedMix.user_id === user.id;

      if (Platform.OS === "ios") {
        const options = ["Cancel", "Add to Queue", "Play Next", "Save to Playlist"];
        if (isOwnMix) options.push("Delete Mix");

        ActionSheetIOS.showActionSheetWithOptions(
          {
            options,
            cancelButtonIndex: 0,
            destructiveButtonIndex: isOwnMix ? options.length - 1 : undefined,
          },
          (buttonIndex) => {
            if (buttonIndex === 1 && onAddToQueue) {
              onAddToQueue(normalizedMix);
              HapticPatterns.success();
            } else if (buttonIndex === 2 && onPlayNext) {
              onPlayNext(normalizedMix);
              HapticPatterns.success();
            } else if (buttonIndex === 3) {
              handleSaveToPlaylist(normalizedMix);
            } else if (buttonIndex === 4 && isOwnMix) {
              handleDeleteMix(normalizedMix);
            }
          }
        );
      } else {
        const alertOptions = [
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
          { text: "Save to Playlist", onPress: () => handleSaveToPlaylist(normalizedMix) },
        ];
        if (isOwnMix) {
          alertOptions.push({
            text: "Delete Mix",
            style: "destructive",
            onPress: () => handleDeleteMix(normalizedMix),
          });
        }
        Alert.alert(mix.title || "Mix", "Choose an option", alertOptions, { cancelable: true });
      }
    },
    [user?.id, onAddToQueue, onPlayNext, handleSaveToPlaylist, handleDeleteMix]
  );

  const handleArtistPress = (artistName, userId) => {
    HapticPatterns.itemPress();
    if (!userId) {
      Alert.alert("Error", "Unable to find artist profile");
      return;
    }

    // Navigate to the artist's profile
    onNavigate("user-profile", { userId });
  };

  const handleUploadMix = useCallback(() => {
    HapticPatterns.buttonPress();
    if (hasUserMixes) {
      fetchUserMixes();
      setShowManageMixesModal(true);
    } else {
      setShowUploadModal(true);
    }
  }, [hasUserMixes, fetchUserMixes]);

  const fetchUserMixes = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoadingUserMixes(true);
      const mixes = await db.getUserMixes(user.id);
      setUserMixes(mixes || []);
      const pinnedCount = (mixes || []).filter((m) => m.is_pinned).length;
      setPinnedMixesCount(pinnedCount);
    } catch (error) {
      console.error("❌ Error fetching user mixes:", error);
      setUserMixes([]);
    } finally {
      setLoadingUserMixes(false);
    }
  }, [user?.id]);

  // Handle pin/unpin mix
  const handlePinMix = async (mix) => {
    if (!user?.id) return;

    // Check if we can pin (max 3)
    const currentPinnedCount = userMixes.filter(m => m.is_pinned && m.id !== mix.id).length;
    if (!mix.is_pinned && currentPinnedCount >= 3) {
      Alert.alert(
        "Maximum Pinned Mixes",
        "You can only pin up to 3 mixes. Please unpin another mix first.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      const { error } = await supabase
        .from("mixes")
        .update({ is_pinned: !mix.is_pinned })
        .eq("id", mix.id)
        .eq("user_id", user.id);

      if (error) throw error;

      // Update local state
      setUserMixes((prev) =>
        prev.map((m) =>
          m.id === mix.id ? { ...m, is_pinned: !m.is_pinned } : m
        )
      );

      // Update pinned count
      const newPinnedCount = mix.is_pinned ? pinnedMixesCount - 1 : pinnedMixesCount + 1;
      setPinnedMixesCount(newPinnedCount);

      HapticPatterns.success();
    } catch (error) {
      console.error("❌ Error pinning/unpinning mix:", error);
      Alert.alert("Error", "Failed to update pinned status. Please try again.");
    }
  };

  // Handle edit mix
  const handleEditMix = (mix) => {
    setShowManageMixesModal(false);
    if (onNavigate) {
      onNavigate("upload-mix", { mixId: mix.id });
    }
  };

  // Handle delete mix
  const handleDeleteMixFromManage = async (mix) => {
    Alert.alert(
      "Delete Mix",
      `Are you sure you want to delete "${mix.title}"? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Delete from database
              const { error: dbError } = await supabase
                .from("mixes")
                .delete()
                .eq("id", mix.id);

              if (dbError) {
                console.error("❌ Error deleting mix:", dbError);
                Alert.alert("Error", "Failed to delete mix. Please try again.");
                return;
              }

              // Delete audio file from storage
              if (mix.file_url && typeof mix.file_url === "string") {
                const audioPath = mix.file_url.split("/mixes/")[1];
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
                mix.artwork_url &&
                typeof mix.artwork_url === "string" &&
                mix.artwork_url.includes("supabase")
              ) {
                const artworkPath = mix.artwork_url.split("/mixes/")[1];
                if (artworkPath) {
                  const { error: artworkError } = await supabase.storage
                    .from("mixes")
                    .remove([artworkPath]);

                  if (artworkError) {
                    console.error("❌ Error deleting artwork:", artworkError);
                  }
                }
              }

              // Stop audio if this mix is currently playing
              if (playingMixId === mix.id) {
                onStopAudio();
              }

              // Refresh mixes list
              await fetchUserMixes();
              
              // Update hasUserMixes state
              const remainingMixes = userMixes.filter((m) => m.id !== mix.id);
              setHasUserMixes(remainingMixes.length > 0);
              
              HapticPatterns.success();
            } catch (error) {
              console.error("❌ Error deleting mix:", error);
              Alert.alert("Error", "Failed to delete mix. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleRefresh = useCallback(async () => {
    HapticPatterns.pullToRefresh();
    setRefreshing(true);
    await fetchMixes();
    setRefreshing(false);
  }, [fetchMixes]);

  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={handleRefresh}
        tintColor="hsl(75, 100%, 60%)"
      />
    ),
    [refreshing, handleRefresh]
  );

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

  const renderHeader = useCallback(
    () => (
      <ListenScreenHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedGenre={selectedGenre}
        setSelectedGenre={setSelectedGenre}
        refreshing={refreshing}
        availableGenres={availableGenres}
      />
    ),
    [searchQuery, selectedGenre, refreshing, availableGenres]
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
                  <ProgressiveImage
                    source={
                      mix.artwork_url || mix.image_url || mix.image
                        ? { uri: mix.artwork_url || mix.image_url || mix.image }
                        : null
                    }
                    style={styles.popularImage}
                    contentFit="cover"
                    placeholder={
                      <View style={[styles.popularImage, { backgroundColor: "hsl(0, 0%, 12%)", justifyContent: "center", alignItems: "center" }]}>
                        <Ionicons name="musical-notes" size={24} color="hsl(75, 100%, 60%)" />
                      </View>
                    }
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
                    <ProgressiveImage
                      source={
                        mix.artwork_url || mix.image_url || mix.image
                          ? { uri: mix.artwork_url || mix.image_url || mix.image }
                          : null
                      }
                      style={styles.popularImage}
                      contentFit="cover"
                      placeholder={
                        <View style={[styles.popularImage, { backgroundColor: "hsl(0, 0%, 12%)", justifyContent: "center", alignItems: "center" }]}>
                          <Ionicons name="musical-notes" size={24} color="hsl(75, 100%, 60%)" />
                        </View>
                      }
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
                    <ProgressiveImage
                      source={
                        mix.artwork_url || mix.image_url || mix.image
                          ? { uri: mix.artwork_url || mix.image_url || mix.image }
                          : null
                      }
                      style={styles.recommendationImage}
                      contentFit="cover"
                      placeholder={
                        <View style={[styles.recommendationImage, { backgroundColor: "hsl(0, 0%, 12%)", justifyContent: "center", alignItems: "center" }]}>
                          <Ionicons name="musical-notes" size={28} color="hsl(75, 100%, 60%)" />
                        </View>
                      }
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
                {playlist.image_url ? (
                  <Image
                    source={{ uri: playlist.image_url }}
                    style={styles.playlistImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons
                    name="musical-notes"
                    size={24}
                    color="hsl(75, 100%, 60%)"
                  />
                )}
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

  const renderFooter = useCallback(
    () => <ListenScreenFooter hasUserMixes={hasUserMixes} onUploadMix={handleUploadMix} />,
    [hasUserMixes, handleUploadMix]
  );

  // Sections for SectionList (virtualized home content)
  const sections = useMemo(() => {
    const s = [];
    if (user?.id && playlists.length > 0) {
      s.push({
        id: "playlists",
        title: "YOUR PLAYLISTS",
        subtitle: "Your saved collections of mixes",
        data: playlists,
        type: "playlist",
      });
    }
    if (trendingMixes.length > 0) {
      s.push({
        id: "trending",
        title: "TRENDING",
        subtitle: "Who's hottest on the platform right now",
        data: trendingMixes,
        type: "mix",
        onSeeAll: () => onNavigate?.("trending-mixes"),
      });
    }
    if (user?.id && userLikedMixes.length > 0) {
      s.push({
        id: "yourLikes",
        title: "YOUR LIKES",
        subtitle: "Mixes you've already liked",
        data: userLikedMixes,
        type: "mix",
        onSeeAll: () => onNavigate?.("your-likes"),
      });
    }
    if (recommendedMixes.length > 0) {
      s.push({
        id: "youMayLike",
        title: "YOU MAY LIKE",
        subtitle: "Recommendations based on your likes and connections",
        data: [recommendedMixes],
        type: "horizontalMixes",
      });
    }
    return s;
  }, [user?.id, playlists, trendingMixes, userLikedMixes, recommendedMixes, onNavigate]);

  // SectionList only passes (item, index), not section - derive key from item shape to avoid crash
  const keyExtractor = useCallback((item, index) => {
    if (item == null) return `item-${index}`;
    if (Array.isArray(item)) return `youMayLike-${index}`;
    if (typeof item.mixCount === "number" && item.name != null) return `playlist-${item.id ?? index}`;
    return `mix-${item.id ?? index}`;
  }, []);

  const {
    ESTIMATED_MIX_ROW_HEIGHT,
    ESTIMATED_PLAYLIST_ROW_HEIGHT,
    ESTIMATED_HORIZONTAL_SECTION_HEIGHT,
    ESTIMATED_SECTION_HEADER_HEIGHT,
  } = LISTEN_LIST_PERFORMANCE;

  const getSectionItemLayout = useCallback(
    (data, index) => {
      const secs = sections ?? [];
      let offset = 0;
      let idx = 0;
      for (const section of secs) {
        offset += ESTIMATED_SECTION_HEADER_HEIGHT;
        const h =
          section.type === "horizontalMixes"
            ? ESTIMATED_HORIZONTAL_SECTION_HEIGHT
            : section.type === "playlist"
              ? ESTIMATED_PLAYLIST_ROW_HEIGHT
              : ESTIMATED_MIX_ROW_HEIGHT;
        const count = section.data?.length ?? 0;
        for (let i = 0; i < count; i++) {
          if (idx === index) return { length: h, offset, index };
          offset += h;
          idx++;
        }
      }
      return { length: ESTIMATED_MIX_ROW_HEIGHT, offset: 0, index };
    },
    [sections]
  );

  const getSearchItemLayout = useCallback((data, index) => {
    const h = LISTEN_LIST_PERFORMANCE.ESTIMATED_MIX_ROW_HEIGHT;
    return { length: h, offset: h * index, index };
  }, []);

  const searchKeyExtractor = useCallback((item) => `search-${item.id}`, []);

  const renderSectionHeader = useCallback(({ section }) => <ListenSectionHeader section={section} />, []);

  const renderMixRow = useCallback(
    (mix) => (
      <ListenMixRow
        mix={mix}
        isPlaying={playingMixId === mix.id && globalAudioState.isPlaying}
        isLiked={likedMixIds.has(mix.id)}
        likeLoading={!!likeLoadingMap[mix.id]}
        onPress={handleMixPress}
        onLongPress={handleMixLongPress}
        onToggleLike={handleToggleLike}
      />
    ),
    [
      playingMixId,
      globalAudioState.isPlaying,
      handleMixPress,
      handleMixLongPress,
      handleToggleLike,
      likeLoadingMap,
      likedMixIds,
    ]
  );

  const handlePlaylistPress = useCallback(
    (playlist) => {
      onNavigate?.("playlist-detail", {
        playlistId: playlist.id,
        playlistName: playlist.name,
      });
    },
    [onNavigate]
  );

  const renderSectionItem = useCallback(
    ({ item, section }) => {
      if (!section) return null;
      if (item == null && section.type !== "horizontalMixes") return null;
      if (section.type === "horizontalMixes") {
        const mixes = Array.isArray(item) ? item : [];
        return (
          <ListenRecommendationStrip
            mixes={mixes}
            playingMixId={playingMixId}
            likedMixIds={likedMixIds}
            likeLoadingMap={likeLoadingMap}
            onMixPress={handleMixPress}
            onMixLongPress={handleMixLongPress}
            onToggleLike={handleToggleLike}
          />
        );
      }
      if (section.type === "playlist") {
        return <ListenPlaylistRow playlist={item} onPress={handlePlaylistPress} />;
      }
      return <View style={styles.sectionItemWrap}>{renderMixRow(item)}</View>;
    },
    [
      playingMixId,
      handleMixPress,
      handleMixLongPress,
      handleToggleLike,
      likeLoadingMap,
      likedMixIds,
      handlePlaylistPress,
      renderMixRow,
    ]
  );

  const renderSearchMixItem = useCallback(
    ({ item: mix }) => (
      <View style={styles.sectionItemWrap}>{renderMixRow(mix)}</View>
    ),
    [renderMixRow]
  );

  const searchListEmptyComponent = useCallback(
    () => (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>SEARCH RESULTS</Text>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="search" size={48} color="hsl(0, 0%, 30%)" />
          <Text style={styles.emptyStateTitle}>No results found</Text>
          <Text style={styles.emptyStateSubtitle}>
            No mixes match "{searchQuery}". Try a different search term.
          </Text>
        </View>
      </View>
    ),
    [searchQuery]
  );

  return {
    mixes,
    setMixes,
    playingMixId,
    searchQuery,
    setSearchQuery,
    selectedGenre,
    setSelectedGenre,
    showUploadModal,
    setShowUploadModal,
    refreshing,
    loading,
    likedMixIds,
    mixLikeCounts,
    likeLoadingMap,
    recommendedMixes,
    recommendationsLoading,
    hasUserMixes,
    userMixes,
    setUserMixes,
    showManageMixesModal,
    setShowManageMixesModal,
    loadingUserMixes,
    pinnedMixesCount,
    setPinnedMixesCount,
    fetchMixes,
    loadRecommendedMixes,
    trendingMixes,
    userLikedMixes,
    availableGenres,
    filteredMixes,
    handleMixPress,
    handleMixLongPress,
    handleArtistPress,
    handleUploadMix,
    fetchUserMixes,
    handlePinMix,
    handleEditMix,
    handleDeleteMixFromManage,
    handleRefresh,
    refreshControl,
    handleDeleteMix,
    handleAddToQueue,
    handleToggleLike,
    renderHeader,
    renderFooter,
    renderTrending,
    renderYourLikes,
    renderRecommendations: renderYouMayLike,
    sections,
    keyExtractor,
    searchKeyExtractor,
    getSectionItemLayout,
    getSearchItemLayout,
    renderSectionHeader,
    renderMixRow,
    renderSectionItem,
    renderSearchMixItem,
    searchListEmptyComponent,
  };
}
