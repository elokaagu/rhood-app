import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  memo,
  useRef,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  RefreshControl,
  Platform,
  ActionSheetIOS,
  Modal,
  TextInput,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { HapticPatterns } from "../lib/haptics";
import { LIST_PERFORMANCE } from "../lib/performanceConstants";
import * as ImagePicker from "expo-image-picker";
import ProgressiveImage from "./ProgressiveImage";
import { normalizeMixForPlayback } from "../lib/yourLikesUtils";
import { invalidateUserPlaylistsCache } from "../hooks/useListenPlaylists";

const SEARCH_DEBOUNCE_MS = 350;
const PLAYLIST_NAME_MAX_LEN = 255;

// Memoized mix row: stable props reduce re-renders when only playing state changes
const PlaylistDetailMixRow = memo(function PlaylistDetailMixRow({
  mix,
  index,
  totalCount,
  isPlaying,
  isEditMode,
  onPress,
  onLongPress,
  onRemove,
  onMoveUp,
  onMoveDown,
}) {
  const mixImageUri =
    mix.artwork_url || mix.image_url || mix.image
      ? { uri: mix.artwork_url || mix.image_url || mix.image }
      : null;
  return (
    <TouchableOpacity
      style={[styles.mixRow, isEditMode && styles.mixRowEdit]}
      onPress={() => onPress(mix)}
      onLongPress={() => onLongPress(mix)}
      delayLongPress={500}
      activeOpacity={0.8}
    >
      {isEditMode && (
        <View style={styles.reorderButtons}>
          <TouchableOpacity
            style={[styles.reorderButton, index === 0 && styles.reorderButtonDisabled]}
            onPress={() => onMoveUp(mix, index)}
            disabled={index === 0}
          >
            <Ionicons
              name="chevron-up"
              size={18}
              color={index === 0 ? "hsl(0, 0%, 30%)" : "hsl(0, 0%, 70%)"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.reorderButton,
              index === totalCount - 1 && styles.reorderButtonDisabled,
            ]}
            onPress={() => onMoveDown(mix, index)}
            disabled={index === totalCount - 1}
          >
            <Ionicons
              name="chevron-down"
              size={18}
              color={
                index === totalCount - 1 ? "hsl(0, 0%, 30%)" : "hsl(0, 0%, 70%)"
              }
            />
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.mixImageWrap}>
        <Image
          source={mixImageUri || require("../assets/rhood_logo.webp")}
          style={styles.mixImage}
          resizeMode="cover"
        />
        {isPlaying && !isEditMode && (
          <View style={styles.playingOverlay}>
            <Ionicons name="play" size={20} color="hsl(75, 100%, 60%)" />
          </View>
        )}
      </View>
      <View style={styles.mixInfo}>
        <Text style={styles.mixTitle} numberOfLines={1} ellipsizeMode="tail">
          {mix.title}
        </Text>
        <Text style={styles.mixSubtitle} numberOfLines={1}>
          {mix.artist || mix.user_dj_name || "Unknown"}
        </Text>
        <View style={styles.mixMetaRow}>
          {mix.durationFormatted && (
            <Text style={styles.mixMeta}>{mix.durationFormatted}</Text>
          )}
          {mix.genre && (
            <>
              {mix.durationFormatted && <Text style={styles.mixMeta}> • </Text>}
              <Text style={styles.mixMeta}>{mix.genre}</Text>
            </>
          )}
        </View>
      </View>
      {isEditMode ? (
        <TouchableOpacity style={styles.removeButton} onPress={() => onRemove(mix)}>
          <Ionicons name="trash-outline" size={20} color="hsl(0, 100%, 60%)" />
        </TouchableOpacity>
      ) : (
        <Ionicons name="chevron-forward" size={18} color="hsl(0, 0%, 60%)" />
      )}
    </TouchableOpacity>
  );
});

function PlaylistDetailScreen({
  globalAudioState,
  onPlayAudio,
  onPauseAudio,
  onResumeAudio,
  onBack,
  user,
  onAddToQueue,
  onPlayNext,
  playlistId,
  playlistName,
}) {
  const insets = useSafeAreaInsets();
  const [mixes, setMixes] = useState([]);
  const [playingMixId, setPlayingMixId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showAddMixesModal, setShowAddMixesModal] = useState(false);
  const [availableMixes, setAvailableMixes] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingMixes, setLoadingMixes] = useState(false);
  const [playlistData, setPlaylistData] = useState(null);
  const [uploadingArtwork, setUploadingArtwork] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [renamingPlaylist, setRenamingPlaylist] = useState(false);
  const searchDebounceRef = useRef(null);

  const displayPlaylistName =
    playlistData?.name || playlistName || "Playlist";

  const isPlaylistOwner =
    !!playlistData?.user_id &&
    !!user?.id &&
    playlistData.user_id === user.id;
  const effectiveEditMode = isPlaylistOwner && isEditMode;

  useEffect(
    () => () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    },
    []
  );

  // Fetch mixes in playlist
  const fetchPlaylistMixes = useCallback(async () => {
    if (!playlistId || !user?.id) {
      setMixes([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data: playlistRow, error: playlistError } = await supabase
        .from("playlists")
        .select("*")
        .eq("id", playlistId)
        .single();

      if (playlistError || !playlistRow) {
        console.error("❌ Error fetching playlist:", playlistError);
        setPlaylistData(null);
        setMixes([]);
        setIsEditMode(false);
        setLoading(false);
        return;
      }

      setPlaylistData(playlistRow);
      if (playlistRow.user_id !== user.id) {
        setIsEditMode(false);
      }

      // Get mix IDs from playlist_mixes, ordered by position
      const { data: playlistMixesData, error: playlistMixesError } = await supabase
        .from("playlist_mixes")
        .select("mix_id, added_at, position")
        .eq("playlist_id", playlistId)
        .order("position", { ascending: true, nullsFirst: false })
        .order("added_at", { ascending: true });

      if (playlistMixesError) {
        console.error("❌ Error fetching playlist mixes:", playlistMixesError);
        setMixes([]);
        setLoading(false);
        return;
      }

      console.log("📋 Found playlist mixes:", playlistMixesData?.length || 0);

      if (!playlistMixesData || playlistMixesData.length === 0) {
        console.log("ℹ️ No mixes found in playlist");
        setMixes([]);
        setLoading(false);
        return;
      }

      const positionMap = {};
      playlistMixesData.forEach((pm) => {
        positionMap[pm.mix_id] = pm.position ?? 0;
      });

      const mixIds = playlistMixesData.map((pm) => pm.mix_id).filter(Boolean);

      // Fetch the actual mixes
      const { data: mixesData, error: mixesError } = await supabase
        .from("mixes")
        .select("*")
        .in("id", mixIds);

      if (mixesError) {
        console.error("❌ Error fetching mixes:", mixesError);
        setMixes([]);
        setLoading(false);
        return;
      }

      // Sort mixes by position from playlist_mixes
      const sortedMixes = mixIds
        .map((id) => mixesData.find((m) => m.id === id))
        .filter(Boolean);

      // Batch-fetch user profiles (one query instead of N)
      const userIds = [...new Set(sortedMixes.map((m) => m.user_id).filter(Boolean))];
      let profileMap = {};
      if (userIds.length > 0) {
        try {
          const { data: profilesData } = await supabase
            .from("user_profiles")
            .select("id, dj_name, profile_image_url, bio")
            .in("id", userIds);
          profileMap = (profilesData || []).reduce((acc, p) => {
            if (p?.id) acc[p.id] = p;
            return acc;
          }, {});
        } catch (err) {
          if (__DEV__) console.warn("Batch fetch user_profiles failed:", err);
        }
      }

      const transformedMixes = sortedMixes.map((mix) => {
        const userProfile = mix.user_id ? profileMap[mix.user_id] ?? null : null;
        return {
          ...mix,
          audioUrl: mix.file_url || mix.audio_url || null,
          image: mix.artwork_url || mix.image_url || mix.image || null,
          artist: mix.artist || userProfile?.dj_name || "Unknown",
          user_dj_name: userProfile?.dj_name,
          user_image: userProfile?.profile_image_url,
          user_bio: userProfile?.bio,
          user_id: mix.user_id,
          user: userProfile,
          position: positionMap[mix.id] ?? 0,
          sourcePlaylistId: playlistId,
          sourcePlaylistName: playlistRow.name || playlistName || "Playlist",
        };
      });

      setMixes(transformedMixes);
    } catch (error) {
      console.error("❌ Error in fetchPlaylistMixes:", error);
      setMixes([]);
    } finally {
      setLoading(false);
    }
  }, [playlistId, user?.id]);

  useEffect(() => {
    fetchPlaylistMixes();
  }, [fetchPlaylistMixes]);

  // Sync playing state
  useEffect(() => {
    if (globalAudioState.currentTrack) {
      setPlayingMixId(globalAudioState.currentTrack.id);
    } else {
      setPlayingMixId(null);
    }
  }, [globalAudioState.currentTrack]);

  const handleRefresh = useCallback(async () => {
    HapticPatterns.pullToRefresh();
    setRefreshing(true);
    await fetchPlaylistMixes();
    setRefreshing(false);
  }, [fetchPlaylistMixes]);

  const handleRemoveFromPlaylist = useCallback(
    async (mix) => {
    if (!playlistId || !mix.id) return;

    Alert.alert(
      "Remove from Playlist?",
      `Remove "${mix.title}" from this playlist?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("playlist_mixes")
                .delete()
                .eq("playlist_id", playlistId)
                .eq("mix_id", mix.id);

              if (error) {
                throw error;
              }

              setMixes((prev) => prev.filter((m) => m.id !== mix.id));
              HapticPatterns.success();
            } catch (error) {
              console.error("❌ Error removing mix from playlist:", error);
              Alert.alert("Error", "Failed to remove mix from playlist");
            }
          },
        },
      ]
    );
    },
    [playlistId]
  );

  // Update positions in database (stable for move handlers)
  const updatePositions = useCallback(
    async (orderedMixes) => {
      const results = await Promise.all(
        orderedMixes.map((mix, i) =>
          supabase
            .from("playlist_mixes")
            .update({ position: i })
            .eq("playlist_id", playlistId)
            .eq("mix_id", mix.id)
        )
      );
      const err = results.find((r) => r.error)?.error;
      if (err) throw err;
    },
    [playlistId]
  );

  const handleMoveUp = useCallback(
    async (mix, index) => {
      if (index === 0) return;
      try {
        const newMixes = [...mixes];
        [newMixes[index - 1], newMixes[index]] = [newMixes[index], newMixes[index - 1]];
        setMixes(newMixes);
        await updatePositions(newMixes);
        HapticPatterns.success();
      } catch (error) {
        console.error("❌ Error moving mix up:", error);
        Alert.alert("Error", "Failed to reorder playlist");
        fetchPlaylistMixes();
      }
    },
    [mixes, updatePositions, fetchPlaylistMixes]
  );

  const handleMoveDown = useCallback(
    async (mix, index) => {
      if (index === mixes.length - 1) return;
      try {
        const newMixes = [...mixes];
        [newMixes[index], newMixes[index + 1]] = [newMixes[index + 1], newMixes[index]];
        setMixes(newMixes);
        await updatePositions(newMixes);
        HapticPatterns.success();
      } catch (error) {
        console.error("❌ Error moving mix down:", error);
        Alert.alert("Error", "Failed to reorder playlist");
        fetchPlaylistMixes();
      }
    },
    [mixes, updatePositions, fetchPlaylistMixes]
  );

  const handleMixPress = useCallback(
    (mix) => {
      if (effectiveEditMode) return;
      HapticPatterns.playPause();
      const current = globalAudioState.currentTrack;
      const sameTrack =
        current &&
        (String(current.id) === String(mix.id) ||
          String(current.id) === String(mix?.id));

      if (sameTrack) {
        if (globalAudioState.isPlaying) {
          onPauseAudio?.();
        } else {
          onResumeAudio?.();
        }
        return;
      }

      const normalized = normalizeMixForPlayback(mix);
      if (!normalized?.audioUrl) return;
      onPlayAudio?.(normalized);
    },
    [
      effectiveEditMode,
      globalAudioState.currentTrack,
      globalAudioState.isPlaying,
      onPauseAudio,
      onResumeAudio,
      onPlayAudio,
    ]
  );

  const handleMixLongPress = useCallback(
    (mix) => {
      if (effectiveEditMode) return;
      HapticPatterns.itemPress();
      const normalizedMix = normalizeMixForPlayback(mix);
      if (!normalizedMix?.audioUrl) return;
      if (Platform.OS === "ios") {
        const options = isPlaylistOwner
          ? ["Cancel", "Add to Queue", "Play Next", "Remove from Playlist"]
          : ["Cancel", "Add to Queue", "Play Next"];
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options,
            cancelButtonIndex: 0,
            destructiveButtonIndex: isPlaylistOwner ? 3 : undefined,
          },
          (buttonIndex) => {
            if (buttonIndex === 1) {
              onAddToQueue?.(normalizedMix);
              HapticPatterns.success();
            } else if (buttonIndex === 2) {
              onPlayNext?.(normalizedMix);
              HapticPatterns.success();
            } else if (buttonIndex === 3 && isPlaylistOwner) {
              handleRemoveFromPlaylist(mix);
            }
          }
        );
      } else {
        const buttons = [
          { text: "Cancel", style: "cancel" },
          {
            text: "Add to Queue",
            onPress: () => {
              onAddToQueue?.(normalizedMix);
              HapticPatterns.success();
            },
          },
          {
            text: "Play Next",
            onPress: () => {
              onPlayNext?.(normalizedMix);
              HapticPatterns.success();
            },
          },
        ];
        if (isPlaylistOwner) {
          buttons.push({
            text: "Remove from Playlist",
            style: "destructive",
            onPress: () => handleRemoveFromPlaylist(mix),
          });
        }
        Alert.alert(mix.title || "Mix", "Choose an option", buttons, {
          cancelable: true,
        });
      }
    },
    [
      effectiveEditMode,
      isPlaylistOwner,
      onAddToQueue,
      onPlayNext,
      handleRemoveFromPlaylist,
    ]
  );

  // Fetch available mixes for adding
  const fetchAvailableMixes = useCallback(async (query = "") => {
    if (!user?.id) return;

    try {
      setLoadingMixes(true);
      let queryBuilder = supabase
        .from("mixes")
        .select("*, user_profiles!mixes_user_id_fkey(dj_name, profile_image_url)")
        .eq("is_public", true)
        .limit(50);

      if (query.trim()) {
        queryBuilder = queryBuilder.or(`title.ilike.%${query}%,genre.ilike.%${query}%`);
      }

      const { data, error } = await queryBuilder.order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      // Filter out mixes already in playlist
      const playlistMixIds = new Set(mixes.map((m) => m.id));
      const available = (data || []).filter((mix) => !playlistMixIds.has(mix.id));

      setAvailableMixes(available);
    } catch (error) {
      console.error("❌ Error fetching available mixes:", error);
      Alert.alert("Error", "Failed to load mixes");
    } finally {
      setLoadingMixes(false);
    }
  }, [mixes, user?.id]);

  // Add mix to playlist
  const handleAddMixToPlaylist = async (mix) => {
    if (!playlistId || !mix.id) return;

    try {
      // Get current max position
      const maxPosition = mixes.length > 0 ? Math.max(...mixes.map((m) => m.position ?? 0)) : -1;

      const { error } = await supabase.from("playlist_mixes").insert({
        playlist_id: playlistId,
        mix_id: mix.id,
        position: maxPosition + 1,
      });

      if (error) {
        if (error.code === "23505") {
          Alert.alert("Already Added", "This mix is already in the playlist");
          return;
        }
        throw error;
      }

      // Refresh playlist
      await fetchPlaylistMixes();
      setShowAddMixesModal(false);
      setSearchQuery("");
      HapticPatterns.success();
      Alert.alert("Success", `Added "${mix.title}" to playlist`);
    } catch (error) {
      console.error("❌ Error adding mix to playlist:", error);
      Alert.alert("Error", "Failed to add mix to playlist");
    }
  };

  // Open add mixes modal
  const handleOpenAddMixes = () => {
    setShowAddMixesModal(true);
    fetchAvailableMixes();
  };

  // Upload playlist artwork
  const uploadPlaylistArtwork = async (imageUri) => {
    try {
      console.log("📤 Uploading playlist artwork...");

      // Generate unique filename
      const fileExt = imageUri.split(".").pop() || "jpg";
      const fileName = `playlist_${playlistId}_${Date.now()}.${fileExt}`;

      // Convert image to Uint8Array
      const response = await fetch(imageUri);
      const arrayBuffer = await response.arrayBuffer();
      const fileData = new Uint8Array(arrayBuffer);

      // Upload to Supabase storage (using mixes bucket like profile images)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("mixes")
        .upload(`playlist_images/${fileName}`, fileData, {
          contentType: `image/${fileExt}`,
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("mixes")
        .getPublicUrl(`playlist_images/${fileName}`);

      console.log("✅ Playlist artwork uploaded:", urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      console.error("❌ Error uploading playlist artwork:", error);
      throw error;
    }
  };

  // Handle edit artwork
  const handleEditArtwork = () => {
    Alert.alert(
      "Edit Playlist Artwork",
      "Choose how you'd like to add artwork",
      [
        {
          text: "Camera",
          onPress: () => openImagePicker("camera"),
        },
        {
          text: "Photo Library",
          onPress: () => openImagePicker("library"),
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  // Open image picker
  const openImagePicker = async (source) => {
    try {
      let result;

      if (source === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            "Permission Required",
            "Camera permission is needed to take photos"
          );
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            "Permission Required",
            "Photo library permission is needed to select images"
          );
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]) {
        const localUri = result.assets[0].uri;

        // Show loading state
        setUploadingArtwork(true);

        try {
          // Upload image to Supabase storage
          const publicUrl = await uploadPlaylistArtwork(localUri);

          // Update playlist with public URL
          const { error: updateError } = await supabase
            .from("playlists")
            .update({ image_url: publicUrl })
            .eq("id", playlistId);

          if (updateError) {
            throw updateError;
          }

          // Update local state
          setPlaylistData((prev) => ({ ...prev, image_url: publicUrl }));

          console.log("✅ Playlist artwork updated with URL:", publicUrl);
          HapticPatterns.success();
          Alert.alert("Success", "Playlist artwork updated!");
        } catch (uploadError) {
          console.error("❌ Failed to upload artwork:", uploadError);
          Alert.alert(
            "Upload Error",
            "Failed to upload artwork. Please try again."
          );
        } finally {
          setUploadingArtwork(false);
        }
      }
    } catch (error) {
      console.error("❌ Image picker error:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
      setUploadingArtwork(false);
    }
  };

  // Toggle edit mode
  const toggleEditMode = () => {
    if (!isPlaylistOwner) return;
    setIsEditMode(!isEditMode);
    HapticPatterns.itemPress();
  };

  const openRenameModal = useCallback(() => {
    if (!isPlaylistOwner) return;
    const current = (playlistData?.name || playlistName || "").trim();
    setRenameDraft(current);
    setShowRenameModal(true);
    HapticPatterns.itemPress();
  }, [isPlaylistOwner, playlistData?.name, playlistName]);

  const handleSaveRename = useCallback(async () => {
    const nextName = renameDraft.trim();
    if (!nextName) {
      Alert.alert("Name required", "Please enter a playlist name.");
      return;
    }
    if (nextName.length > PLAYLIST_NAME_MAX_LEN) {
      Alert.alert(
        "Name too long",
        `Use at most ${PLAYLIST_NAME_MAX_LEN} characters.`
      );
      return;
    }
    if (!playlistId || !user?.id || !isPlaylistOwner) return;
    if (nextName === (playlistData?.name || playlistName || "").trim()) {
      setShowRenameModal(false);
      return;
    }

    try {
      setRenamingPlaylist(true);
      const { error } = await supabase
        .from("playlists")
        .update({
          name: nextName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", playlistId)
        .eq("user_id", user.id);

      if (error) throw error;

      setPlaylistData((prev) => (prev ? { ...prev, name: nextName } : prev));
      invalidateUserPlaylistsCache(user.id);
      setShowRenameModal(false);
      HapticPatterns.success();
    } catch (e) {
      console.error("❌ Error renaming playlist:", e);
      Alert.alert("Error", "Could not rename playlist. Try again.");
    } finally {
      setRenamingPlaylist(false);
    }
  }, [
    renameDraft,
    playlistId,
    user?.id,
    isPlaylistOwner,
    playlistData?.name,
    playlistName,
  ]);

  // All hooks must run unconditionally (before any early return)
  const keyExtractor = useCallback((item) => item.id, []);

  const renderMixRow = useCallback(
    ({ item: mix, index }) => (
      <View style={[styles.mixRowWrap, index === 0 && styles.mixRowWrapFirst]}>
        <PlaylistDetailMixRow
          mix={mix}
          index={index}
          totalCount={mixes.length}
          isPlaying={
            String(playingMixId) === String(mix.id) &&
            globalAudioState.isPlaying
          }
          isEditMode={effectiveEditMode}
          onPress={handleMixPress}
          onLongPress={handleMixLongPress}
          onRemove={handleRemoveFromPlaylist}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
        />
      </View>
    ),
    [
      mixes.length,
      playingMixId,
      globalAudioState.isPlaying,
      effectiveEditMode,
      handleMixPress,
      handleMixLongPress,
      handleRemoveFromPlaylist,
      handleMoveUp,
      handleMoveDown,
    ]
  );

  const listHeader = useMemo(
    () =>
      playlistData?.image_url ? (
        <View style={styles.artworkContainer}>
          <ProgressiveImage
            source={{ uri: playlistData.image_url }}
            style={styles.playlistArtwork}
            contentFit="cover"
            placeholder={
              <View
                style={[
                  styles.playlistArtwork,
                  { justifyContent: "center", alignItems: "center" },
                ]}
              >
                <Ionicons name="musical-notes" size={48} color="hsl(0, 0%, 30%)" />
              </View>
            }
          />
          {effectiveEditMode && (
            <TouchableOpacity
              style={styles.artworkEditOverlay}
              onPress={handleEditArtwork}
            >
              <Ionicons name="camera" size={24} color="hsl(0, 0%, 100%)" />
              <Text style={styles.artworkEditText}>Change Artwork</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null,
    [playlistData?.image_url, effectiveEditMode]
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="hsl(0, 0%, 100%)" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {displayPlaylistName}
            </Text>
          </View>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="hsl(75, 100%, 60%)" />
          <Text style={styles.loadingText}>Loading playlist...</Text>
        </View>
      </View>
    );
  }

  if (!playlistData) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="hsl(0, 0%, 100%)" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Playlist
            </Text>
          </View>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="lock-closed-outline" size={48} color="hsl(0, 0%, 40%)" />
          <Text style={styles.emptyTitle}>Couldn&apos;t open this playlist</Text>
          <Text style={styles.emptySubtitle}>
            It may be private or you don&apos;t have access.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="hsl(0, 0%, 100%)" />
        </TouchableOpacity>
        {isPlaylistOwner ? (
          <TouchableOpacity
            style={styles.headerTitleWrap}
            onPress={openRenameModal}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Playlist ${displayPlaylistName}. Tap to rename`}
          >
            <Text style={styles.headerTitle} numberOfLines={1}>
              {displayPlaylistName}
            </Text>
            <Ionicons
              name="pencil"
              size={14}
              color="hsl(0, 0%, 45%)"
              style={styles.headerRenameHint}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {displayPlaylistName}
            </Text>
          </View>
        )}
        {isPlaylistOwner ? (
          <TouchableOpacity style={styles.backButton} onPress={toggleEditMode}>
            <Text style={[styles.editButton, isEditMode && styles.editButtonActive]}>
              {isEditMode ? "Done" : "Edit"}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backButton} />
        )}
      </View>

      {effectiveEditMode && (
        <View style={styles.editToolbar}>
          <TouchableOpacity style={styles.toolbarButton} onPress={openRenameModal}>
            <Ionicons name="create-outline" size={20} color="hsl(75, 100%, 60%)" />
            <Text style={styles.toolbarButtonText}>Rename</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolbarButton} onPress={handleOpenAddMixes}>
            <Ionicons name="add-circle" size={20} color="hsl(75, 100%, 60%)" />
            <Text style={styles.toolbarButtonText}>Add Mixes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolbarButton} onPress={handleEditArtwork}>
            <Ionicons name="image" size={20} color="hsl(75, 100%, 60%)" />
            <Text style={styles.toolbarButtonText}>Artwork</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={mixes}
        keyExtractor={keyExtractor}
        renderItem={renderMixRow}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="musical-notes-outline" size={64} color="hsl(0, 0%, 30%)" />
            <Text style={styles.emptyTitle}>No mixes in this playlist</Text>
            <Text style={styles.emptySubtitle}>
              {!isPlaylistOwner
                ? "This playlist is empty."
                : isEditMode
                  ? "Tap 'Add Mixes' to get started"
                  : "Add mixes to this playlist from the Listen tab"}
            </Text>
          </View>
        }
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="hsl(75, 100%, 60%)"
          />
        }
        initialNumToRender={LIST_PERFORMANCE.INITIAL_NUM_TO_RENDER}
        maxToRenderPerBatch={LIST_PERFORMANCE.MAX_TO_RENDER_PER_BATCH}
        windowSize={LIST_PERFORMANCE.WINDOW_SIZE}
        removeClippedSubviews={LIST_PERFORMANCE.REMOVE_CLIPPED_SUBVIEWS}
      />

      {/* Add Mixes Modal */}
      <Modal
        visible={showAddMixesModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowAddMixesModal(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => {
                setShowAddMixesModal(false);
                setSearchQuery("");
              }}
            >
              <Ionicons name="close" size={24} color="hsl(0, 0%, 100%)" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Mixes</Text>
            <View style={styles.modalCloseButton} />
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="hsl(0, 0%, 60%)" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search mixes..."
              placeholderTextColor="hsl(0, 0%, 60%)"
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                if (searchDebounceRef.current) {
                  clearTimeout(searchDebounceRef.current);
                }
                searchDebounceRef.current = setTimeout(() => {
                  searchDebounceRef.current = null;
                  fetchAvailableMixes(text);
                }, SEARCH_DEBOUNCE_MS);
              }}
            />
          </View>

          {loadingMixes ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color="hsl(75, 100%, 60%)" />
            </View>
          ) : (
            <FlatList
              data={availableMixes}
              keyExtractor={(item) => item.id}
              initialNumToRender={LIST_PERFORMANCE.INITIAL_NUM_TO_RENDER}
              maxToRenderPerBatch={LIST_PERFORMANCE.MAX_TO_RENDER_PER_BATCH}
              windowSize={LIST_PERFORMANCE.WINDOW_SIZE}
              removeClippedSubviews={LIST_PERFORMANCE.REMOVE_CLIPPED_SUBVIEWS}
              renderItem={({ item: mix }) => (
                <TouchableOpacity
                  style={styles.availableMixRow}
                  onPress={() => handleAddMixToPlaylist(mix)}
                >
                  <Image
                    source={
                      mix.artwork_url || mix.image_url || mix.image
                        ? { uri: mix.artwork_url || mix.image_url || mix.image }
                        : require("../assets/rhood_logo.webp")
                    }
                    style={styles.availableMixImage}
                    resizeMode="cover"
                  />
                  <View style={styles.availableMixInfo}>
                    <Text style={styles.availableMixTitle} numberOfLines={1}>
                      {mix.title}
                    </Text>
                    <Text style={styles.availableMixSubtitle} numberOfLines={1}>
                      {mix.artist || mix.user_profiles?.dj_name || "Unknown"}
                    </Text>
                  </View>
                  <Ionicons name="add-circle" size={24} color="hsl(75, 100%, 60%)" />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.modalEmpty}>
                  <Text style={styles.modalEmptyText}>
                    {searchQuery ? "No mixes found" : "No mixes available"}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </Modal>

      <Modal
        visible={showRenameModal}
        animationType="fade"
        transparent
        onRequestClose={() => !renamingPlaylist && setShowRenameModal(false)}
      >
        <View style={styles.renameModalOverlay}>
          <View style={styles.renameModalCard}>
            <Text style={styles.renameModalTitle}>Rename playlist</Text>
            <TextInput
              style={styles.renameModalInput}
              value={renameDraft}
              onChangeText={setRenameDraft}
              placeholder="Playlist name"
              placeholderTextColor="hsl(0, 0%, 45%)"
              maxLength={PLAYLIST_NAME_MAX_LEN}
              autoFocus
              autoCorrect={false}
              editable={!renamingPlaylist}
            />
            <View style={styles.renameModalActions}>
              <TouchableOpacity
                style={styles.renameModalButtonSecondary}
                onPress={() => setShowRenameModal(false)}
                disabled={renamingPlaylist}
              >
                <Text style={styles.renameModalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.renameModalButtonPrimary,
                  renamingPlaylist && styles.renameModalButtonDisabled,
                ]}
                onPress={handleSaveRename}
                disabled={renamingPlaylist}
              >
                {renamingPlaylist ? (
                  <ActivityIndicator color="hsl(0, 0%, 0%)" size="small" />
                ) : (
                  <Text style={styles.renameModalButtonPrimaryText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default memo(PlaylistDetailScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 0%)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  backButton: {
    width: 60,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerTitleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 4,
  },
  headerTitle: {
    flexShrink: 1,
    fontSize: 18,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    textAlign: "center",
    textTransform: "uppercase",
  },
  headerRenameHint: {
    marginTop: 2,
  },
  editButton: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(75, 100%, 60%)",
  },
  editButtonActive: {
    fontWeight: "600",
  },
  renameModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  renameModalCard: {
    backgroundColor: "hsl(0, 0%, 10%)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 20%)",
  },
  renameModalTitle: {
    fontSize: 18,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 14,
    textTransform: "uppercase",
  },
  renameModalInput: {
    backgroundColor: "hsl(0, 0%, 6%)",
    borderWidth: 1,
    borderColor: "hsl(75, 50%, 35%)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 18,
  },
  renameModalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  renameModalButtonSecondary: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  renameModalButtonSecondaryText: {
    fontSize: 16,
    color: "hsl(0, 0%, 70%)",
    fontFamily: "Helvetica Neue",
  },
  renameModalButtonPrimary: {
    backgroundColor: "hsl(75, 100%, 60%)",
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 10,
    minWidth: 88,
    alignItems: "center",
    justifyContent: "center",
  },
  renameModalButtonPrimaryText: {
    fontSize: 16,
    fontWeight: "600",
    color: "hsl(0, 0%, 0%)",
    fontFamily: "Helvetica Neue",
  },
  renameModalButtonDisabled: {
    opacity: 0.6,
  },
  editToolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
    gap: 16,
  },
  toolbarButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "hsl(0, 0%, 10%)",
  },
  toolbarButtonText: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(75, 100%, 60%)",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: "hsl(0, 0%, 70%)",
    fontSize: 16,
    fontFamily: "Helvetica Neue",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  artworkContainer: {
    width: "100%",
    height: 200,
    marginBottom: 20,
    position: "relative",
  },
  playlistArtwork: {
    width: "100%",
    height: "100%",
    backgroundColor: "hsl(0, 0%, 12%)",
  },
  artworkEditOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  artworkEditText: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 100%)",
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    minHeight: 400,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
    textAlign: "center",
  },
  mixRowWrap: {
    paddingHorizontal: 20,
  },
  mixRowWrapFirst: {
    paddingTop: 20,
  },
  mixRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  mixRowEdit: {
    paddingVertical: 16,
  },
  reorderButtons: {
    gap: 4,
  },
  reorderButton: {
    padding: 4,
  },
  reorderButtonDisabled: {
    opacity: 0.3,
  },
  mixImageWrap: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "hsl(0, 0%, 12%)",
    position: "relative",
  },
  mixImage: {
    width: "100%",
    height: "100%",
  },
  playingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  mixInfo: {
    flex: 1,
    gap: 4,
  },
  mixTitle: {
    fontSize: 16,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
  },
  mixSubtitle: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 80%)",
  },
  mixMetaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  mixMeta: {
    fontSize: 13,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 60%)",
  },
  removeButton: {
    padding: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 0%)",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    textAlign: "center",
    textTransform: "uppercase",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "hsl(0, 0%, 10%)",
    borderRadius: 12,
    gap: 12,
  },
  searchIcon: {
    marginRight: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 100%)",
  },
  modalLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  availableMixRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  availableMixImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: "hsl(0, 0%, 12%)",
  },
  availableMixInfo: {
    flex: 1,
    gap: 4,
  },
  availableMixTitle: {
    fontSize: 16,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
  },
  availableMixSubtitle: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 80%)",
  },
  modalEmpty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  modalEmptyText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 60%)",
  },
});
