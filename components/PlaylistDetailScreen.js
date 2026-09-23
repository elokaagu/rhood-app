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
  RefreshControl,
  Platform,
  ActionSheetIOS,
  Modal,
  TextInput,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../lib/supabase";
import { HapticPatterns } from "../lib/haptics";
import { LIST_PERFORMANCE } from "../lib/performanceConstants";
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from "../lib/sharedStyles";
import { formatMixGenreLabel } from "../lib/mixGenres";
import { normalizeMixForPlayback } from "../lib/yourLikesUtils";
import { invalidateUserPlaylistsCache } from "../hooks/useListenPlaylists";
import ProgressiveImage from "./ProgressiveImage";
import RhoodModal from "./RhoodModal";

const SEARCH_DEBOUNCE_MS = 350;
const PLAYLIST_NAME_MAX_LEN = 255;

function formatMixDuration(duration) {
  const sec = Number(duration);
  if (!Number.isFinite(sec) || sec <= 0) return "";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

const PlaylistDetailMixRow = memo(function PlaylistDetailMixRow({
  mix,
  index,
  totalCount,
  isPlaying,
  isOwner,
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
  const genreLabel = formatMixGenreLabel(mix.genre);
  const durationLabel = formatMixDuration(mix.duration);
  const meta = [durationLabel, genreLabel].filter(Boolean).join("  ·  ");

  return (
    <TouchableOpacity
      style={styles.mixRow}
      onPress={() => onPress(mix)}
      onLongPress={() => onLongPress(mix)}
      delayLongPress={500}
      activeOpacity={0.8}
    >
      {isOwner && totalCount > 1 ? (
        <View style={styles.reorderButtons}>
          <TouchableOpacity
            style={styles.reorderButton}
            onPress={() => onMoveUp(mix, index)}
            disabled={index === 0}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons
              name="chevron-up"
              size={16}
              color={index === 0 ? COLORS.borderLight : COLORS.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.reorderButton}
            onPress={() => onMoveDown(mix, index)}
            disabled={index === totalCount - 1}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons
              name="chevron-down"
              size={16}
              color={
                index === totalCount - 1
                  ? COLORS.borderLight
                  : COLORS.textSecondary
              }
            />
          </TouchableOpacity>
        </View>
      ) : null}
      <View style={styles.mixImageWrap}>
        <Image
          source={mixImageUri || require("../assets/rhood_logo.webp")}
          style={styles.mixImage}
          resizeMode="cover"
        />
        {isPlaying ? (
          <View style={styles.playingOverlay}>
            <Ionicons name="play" size={18} color={COLORS.primary} />
          </View>
        ) : null}
      </View>
      <View style={styles.mixInfo}>
        <Text style={styles.mixTitle} numberOfLines={2} ellipsizeMode="tail">
          {mix.title}
        </Text>
        <Text style={styles.mixSubtitle} numberOfLines={1}>
          {mix.artist || mix.user_dj_name || "Unknown"}
        </Text>
        {meta ? (
          <Text style={styles.mixMeta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      {isOwner ? (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => onRemove(mix)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={`Remove ${mix.title} from playlist`}
        >
          <Ionicons name="trash-outline" size={20} color={COLORS.textTertiary} />
        </TouchableOpacity>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
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
  const [showAddMixesModal, setShowAddMixesModal] = useState(false);
  const [availableMixes, setAvailableMixes] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingMixes, setLoadingMixes] = useState(false);
  const [playlistData, setPlaylistData] = useState(null);
  const [uploadingArtwork, setUploadingArtwork] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [renamingPlaylist, setRenamingPlaylist] = useState(false);
  const [deletingPlaylist, setDeletingPlaylist] = useState(false);
  const [feedback, setFeedback] = useState({
    visible: false,
    type: "info",
    title: "",
    message: "",
    primaryButtonText: "OK",
    secondaryButtonText: undefined,
  });
  const [confirm, setConfirm] = useState({
    visible: false,
    title: "",
    message: "",
    primaryButtonText: "Remove",
  });
  const feedbackActionsRef = useRef({ primary: null, secondary: null });
  const confirmActionRef = useRef(null);
  const searchDebounceRef = useRef(null);

  const displayPlaylistName =
    playlistData?.name || playlistName || "Playlist";

  const isPlaylistOwner =
    !!playlistData?.user_id &&
    !!user?.id &&
    playlistData.user_id === user.id;

  const closeFeedback = useCallback(() => {
    setFeedback((prev) => ({ ...prev, visible: false }));
  }, []);

  const showFeedback = useCallback(
    ({
      type = "info",
      title,
      message,
      primaryButtonText = "OK",
      secondaryButtonText,
      onPrimaryPress,
      onSecondaryPress,
    }) => {
      feedbackActionsRef.current = {
        primary: onPrimaryPress || null,
        secondary: onSecondaryPress || null,
      };
      setFeedback({
        visible: true,
        type,
        title,
        message,
        primaryButtonText,
        secondaryButtonText,
      });
    },
    []
  );

  const handleFeedbackPrimary = useCallback(() => {
    const fn = feedbackActionsRef.current.primary;
    closeFeedback();
    fn?.();
  }, [closeFeedback]);

  const handleFeedbackSecondary = useCallback(() => {
    const fn = feedbackActionsRef.current.secondary;
    closeFeedback();
    fn?.();
  }, [closeFeedback]);

  const closeConfirm = useCallback(() => {
    setConfirm((prev) => ({ ...prev, visible: false }));
  }, []);

  const showConfirm = useCallback(
    ({ title, message, primaryButtonText = "Remove", onConfirm }) => {
      confirmActionRef.current = onConfirm || null;
      setConfirm({
        visible: true,
        title,
        message,
        primaryButtonText,
      });
    },
    []
  );

  const handleConfirmPrimary = useCallback(() => {
    const fn = confirmActionRef.current;
    closeConfirm();
    fn?.();
  }, [closeConfirm]);

  useEffect(
    () => () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    },
    []
  );

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
        setLoading(false);
        return;
      }

      setPlaylistData(playlistRow);

      const { data: playlistMixesData, error: playlistMixesError } =
        await supabase
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

      if (!playlistMixesData || playlistMixesData.length === 0) {
        setMixes([]);
        setLoading(false);
        return;
      }

      const positionMap = {};
      playlistMixesData.forEach((pm) => {
        positionMap[pm.mix_id] = pm.position ?? 0;
      });

      const mixIds = playlistMixesData.map((pm) => pm.mix_id).filter(Boolean);

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

      const sortedMixes = mixIds
        .map((id) => mixesData.find((m) => m.id === id))
        .filter(Boolean);

      const userIds = [
        ...new Set(sortedMixes.map((m) => m.user_id).filter(Boolean)),
      ];
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
  }, [playlistId, user?.id, playlistName]);

  useEffect(() => {
    fetchPlaylistMixes();
  }, [fetchPlaylistMixes]);

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

  const removeMix = useCallback(
    async (mix) => {
      if (!playlistId || !mix.id) return;
      try {
        const { error } = await supabase
          .from("playlist_mixes")
          .delete()
          .eq("playlist_id", playlistId)
          .eq("mix_id", mix.id);

        if (error) throw error;

        setMixes((prev) => prev.filter((m) => m.id !== mix.id));
        if (user?.id) invalidateUserPlaylistsCache(user.id);
        HapticPatterns.success();
      } catch (error) {
        console.error("❌ Error removing mix from playlist:", error);
        showFeedback({
          type: "error",
          title: "Couldn't remove mix",
          message: "Failed to remove this mix. Please try again.",
        });
      }
    },
    [playlistId, user?.id, showFeedback]
  );

  const handleRemoveFromPlaylist = useCallback(
    (mix) => {
      showConfirm({
        title: "Remove mix?",
        message: `Remove “${mix.title}” from this playlist?`,
        primaryButtonText: "Remove",
        onConfirm: () => removeMix(mix),
      });
    },
    [showConfirm, removeMix]
  );

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
        [newMixes[index - 1], newMixes[index]] = [
          newMixes[index],
          newMixes[index - 1],
        ];
        setMixes(newMixes);
        await updatePositions(newMixes);
        HapticPatterns.success();
      } catch (error) {
        console.error("❌ Error moving mix up:", error);
        showFeedback({
          type: "error",
          title: "Couldn't reorder",
          message: "Failed to reorder this playlist.",
        });
        fetchPlaylistMixes();
      }
    },
    [mixes, updatePositions, fetchPlaylistMixes, showFeedback]
  );

  const handleMoveDown = useCallback(
    async (mix, index) => {
      if (index === mixes.length - 1) return;
      try {
        const newMixes = [...mixes];
        [newMixes[index], newMixes[index + 1]] = [
          newMixes[index + 1],
          newMixes[index],
        ];
        setMixes(newMixes);
        await updatePositions(newMixes);
        HapticPatterns.success();
      } catch (error) {
        console.error("❌ Error moving mix down:", error);
        showFeedback({
          type: "error",
          title: "Couldn't reorder",
          message: "Failed to reorder this playlist.",
        });
        fetchPlaylistMixes();
      }
    },
    [mixes, updatePositions, fetchPlaylistMixes, showFeedback]
  );

  const handleMixPress = useCallback(
    (mix) => {
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
      globalAudioState.currentTrack,
      globalAudioState.isPlaying,
      onPauseAudio,
      onResumeAudio,
      onPlayAudio,
    ]
  );

  const handlePlayPlaylist = useCallback(() => {
    if (!mixes.length) return;
    handleMixPress(mixes[0]);
  }, [mixes, handleMixPress]);

  const handleMixLongPress = useCallback(
    (mix) => {
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
        showConfirm({
          title: mix.title || "Mix",
          message: isPlaylistOwner
            ? "Add to queue, play next, or remove from this playlist."
            : "Add to queue or play next.",
          primaryButtonText: "Add to queue",
          onConfirm: () => {
            onAddToQueue?.(normalizedMix);
            HapticPatterns.success();
          },
        });
      }
    },
    [
      isPlaylistOwner,
      onAddToQueue,
      onPlayNext,
      handleRemoveFromPlaylist,
      showConfirm,
    ]
  );

  const fetchAvailableMixes = useCallback(
    async (query = "") => {
      if (!user?.id) return;

      try {
        setLoadingMixes(true);
        let queryBuilder = supabase
          .from("mixes")
          .select(
            "*, user_profiles!mixes_user_id_fkey(dj_name, profile_image_url)"
          )
          .eq("is_public", true)
          .limit(50);

        if (query.trim()) {
          queryBuilder = queryBuilder.or(
            `title.ilike.%${query}%,genre.ilike.%${query}%`
          );
        }

        const { data, error } = await queryBuilder.order("created_at", {
          ascending: false,
        });

        if (error) throw error;

        const playlistMixIds = new Set(mixes.map((m) => m.id));
        const available = (data || []).filter(
          (mix) => !playlistMixIds.has(mix.id)
        );

        setAvailableMixes(available);
      } catch (error) {
        console.error("❌ Error fetching available mixes:", error);
        showFeedback({
          type: "error",
          title: "Couldn't load mixes",
          message: "Failed to load mixes. Please try again.",
        });
      } finally {
        setLoadingMixes(false);
      }
    },
    [mixes, user?.id, showFeedback]
  );

  const handleAddMixToPlaylist = async (mix) => {
    if (!playlistId || !mix.id) return;

    try {
      const maxPosition =
        mixes.length > 0 ? Math.max(...mixes.map((m) => m.position ?? 0)) : -1;

      const { error } = await supabase.from("playlist_mixes").insert({
        playlist_id: playlistId,
        mix_id: mix.id,
        position: maxPosition + 1,
      });

      if (error) {
        if (error.code === "23505") {
          showFeedback({
            type: "info",
            title: "Already added",
            message: "This mix is already in the playlist.",
          });
          return;
        }
        throw error;
      }

      await fetchPlaylistMixes();
      setAvailableMixes((prev) => prev.filter((m) => m.id !== mix.id));
      if (user?.id) invalidateUserPlaylistsCache(user.id);
      HapticPatterns.success();
    } catch (error) {
      console.error("❌ Error adding mix to playlist:", error);
      showFeedback({
        type: "error",
        title: "Couldn't add mix",
        message: "Failed to add this mix. Please try again.",
      });
    }
  };

  const handleOpenAddMixes = useCallback(() => {
    setShowAddMixesModal(true);
    fetchAvailableMixes();
  }, [fetchAvailableMixes]);

  const uploadPlaylistArtwork = async (imageUri) => {
    const fileExt = imageUri.split(".").pop() || "jpg";
    const fileName = `playlist_${playlistId}_${Date.now()}.${fileExt}`;
    const response = await fetch(imageUri);
    const arrayBuffer = await response.arrayBuffer();
    const fileData = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from("mixes")
      .upload(`playlist_images/${fileName}`, fileData, {
        contentType: `image/${fileExt}`,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from("mixes")
      .getPublicUrl(`playlist_images/${fileName}`);

    return urlData.publicUrl;
  };

  const openImagePicker = async (source) => {
    try {
      let result;

      if (source === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          showFeedback({
            type: "warning",
            title: "Permission required",
            message: "Camera access is needed to take a photo.",
          });
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          showFeedback({
            type: "warning",
            title: "Permission required",
            message: "Photo library access is needed to choose artwork.",
          });
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
        setUploadingArtwork(true);
        try {
          const publicUrl = await uploadPlaylistArtwork(localUri);
          const { error: updateError } = await supabase
            .from("playlists")
            .update({ image_url: publicUrl })
            .eq("id", playlistId);

          if (updateError) throw updateError;

          setPlaylistData((prev) => ({ ...prev, image_url: publicUrl }));
          if (user?.id) invalidateUserPlaylistsCache(user.id);
          HapticPatterns.success();
        } catch (uploadError) {
          console.error("❌ Failed to upload artwork:", uploadError);
          showFeedback({
            type: "error",
            title: "Upload failed",
            message: "Couldn't update artwork. Please try again.",
          });
        } finally {
          setUploadingArtwork(false);
        }
      }
    } catch (error) {
      console.error("❌ Image picker error:", error);
      showFeedback({
        type: "error",
        title: "Couldn't pick image",
        message: "Failed to pick an image. Please try again.",
      });
      setUploadingArtwork(false);
    }
  };

  const handleEditArtwork = () => {
    showFeedback({
      type: "info",
      title: "Playlist artwork",
      message: "Choose a photo for this playlist cover.",
      primaryButtonText: "Photo library",
      secondaryButtonText: "Camera",
      onPrimaryPress: () => openImagePicker("library"),
      onSecondaryPress: () => openImagePicker("camera"),
    });
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
      showFeedback({
        type: "warning",
        title: "Name required",
        message: "Please enter a playlist name.",
      });
      return;
    }
    if (nextName.length > PLAYLIST_NAME_MAX_LEN) {
      showFeedback({
        type: "warning",
        title: "Name too long",
        message: `Use at most ${PLAYLIST_NAME_MAX_LEN} characters.`,
      });
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
      showFeedback({
        type: "error",
        title: "Couldn't rename",
        message: "Could not rename this playlist. Try again.",
      });
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
    showFeedback,
  ]);

  const handleDeletePlaylist = useCallback(() => {
    if (!isPlaylistOwner) return;
    showConfirm({
      title: "Delete playlist?",
      message: `“${displayPlaylistName}” will be removed. Mixes stay in Listen.`,
      primaryButtonText: "Delete",
      onConfirm: async () => {
        if (!playlistId || !user?.id) return;
        try {
          setDeletingPlaylist(true);
          await supabase
            .from("playlist_mixes")
            .delete()
            .eq("playlist_id", playlistId);
          const { error } = await supabase
            .from("playlists")
            .delete()
            .eq("id", playlistId)
            .eq("user_id", user.id);
          if (error) throw error;
          invalidateUserPlaylistsCache(user.id);
          HapticPatterns.success();
          onBack?.();
        } catch (e) {
          console.error("❌ Error deleting playlist:", e);
          showFeedback({
            type: "error",
            title: "Couldn't delete",
            message: "Could not delete this playlist. Try again.",
          });
        } finally {
          setDeletingPlaylist(false);
        }
      },
    });
  }, [
    isPlaylistOwner,
    displayPlaylistName,
    playlistId,
    user?.id,
    showConfirm,
    showFeedback,
    onBack,
  ]);

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
          isOwner={isPlaylistOwner}
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
      isPlaylistOwner,
      handleMixPress,
      handleMixLongPress,
      handleRemoveFromPlaylist,
      handleMoveUp,
      handleMoveDown,
    ]
  );

  const listHeader = useMemo(() => {
    const coverUri = playlistData?.image_url;
    const mixCountLabel =
      mixes.length === 1 ? "1 mix" : `${mixes.length} mixes`;

    return (
      <View style={styles.hero}>
        <View style={styles.coverWrap}>
          {coverUri ? (
            <ProgressiveImage
              source={{ uri: coverUri }}
              style={styles.coverImage}
              contentFit="cover"
              placeholder={
                <View style={[styles.coverImage, styles.coverPlaceholder]}>
                  <Ionicons
                    name="albums-outline"
                    size={48}
                    color={COLORS.textMuted}
                  />
                </View>
              }
            />
          ) : (
            <View style={[styles.coverImage, styles.coverPlaceholder]}>
              <Ionicons
                name="albums-outline"
                size={48}
                color={COLORS.primary}
                style={{ opacity: 0.7 }}
              />
            </View>
          )}
          {uploadingArtwork ? (
            <View style={styles.coverBusy}>
              <ActivityIndicator color={COLORS.primary} />
            </View>
          ) : null}
        </View>

        <Text style={styles.heroKicker}>Playlist</Text>
        <Text style={styles.heroTitle} numberOfLines={2}>
          {displayPlaylistName}
        </Text>
        <Text style={styles.heroMeta}>{mixCountLabel}</Text>

        <View style={styles.heroActions}>
          {mixes.length > 0 ? (
            <TouchableOpacity
              style={styles.primaryAction}
              onPress={handlePlayPlaylist}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.primaryActionGradient}
              >
                <Ionicons name="play" size={18} color={COLORS.background} />
                <Text style={styles.primaryActionText}>Play</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : null}
          {isPlaylistOwner ? (
            <TouchableOpacity
              style={[
                styles.secondaryAction,
                mixes.length === 0 && styles.secondaryActionGrow,
              ]}
              onPress={handleOpenAddMixes}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={18} color={COLORS.primary} />
              <Text style={styles.secondaryActionText}>Add mixes</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {isPlaylistOwner ? (
          <View style={styles.ownerTools}>
            <TouchableOpacity style={styles.ownerTool} onPress={openRenameModal}>
              <Ionicons
                name="create-outline"
                size={16}
                color={COLORS.textSecondary}
              />
              <Text style={styles.ownerToolText}>Rename</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ownerTool} onPress={handleEditArtwork}>
              <Ionicons name="image-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.ownerToolText}>Artwork</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ownerTool}
              onPress={handleDeletePlaylist}
              disabled={deletingPlaylist}
            >
              <Ionicons name="trash-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.ownerToolText}>Delete</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  }, [
    playlistData?.image_url,
    mixes.length,
    displayPlaylistName,
    uploadingArtwork,
    isPlaylistOwner,
    deletingPlaylist,
    handlePlayPlaylist,
    handleOpenAddMixes,
    openRenameModal,
    handleEditArtwork,
    handleDeletePlaylist,
  ]);

  const emptyState = (
    <View style={styles.emptyState}>
      <Ionicons name="musical-notes-outline" size={48} color={COLORS.primary} />
      <Text style={styles.emptyTitle}>No mixes yet</Text>
      <Text style={styles.emptySubtitle}>
        {isPlaylistOwner
          ? "Add mixes here to build this playlist."
          : "This playlist is empty."}
      </Text>
      {isPlaylistOwner ? (
        <TouchableOpacity
          style={styles.emptyCta}
          onPress={handleOpenAddMixes}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            style={styles.primaryActionGradient}
          >
            <Ionicons name="add" size={18} color={COLORS.background} />
            <Text style={styles.primaryActionText}>Add mixes</Text>
          </LinearGradient>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {displayPlaylistName}
            </Text>
          </View>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
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
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Playlist
            </Text>
          </View>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="lock-closed-outline" size={48} color={COLORS.textMuted} />
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
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {displayPlaylistName}
          </Text>
        </View>
        <View style={styles.backButton} />
      </View>

      <FlatList
        data={mixes}
        keyExtractor={keyExtractor}
        renderItem={renderMixRow}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={emptyState}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
        initialNumToRender={LIST_PERFORMANCE.INITIAL_NUM_TO_RENDER}
        maxToRenderPerBatch={LIST_PERFORMANCE.MAX_TO_RENDER_PER_BATCH}
        windowSize={LIST_PERFORMANCE.WINDOW_SIZE}
        removeClippedSubviews={LIST_PERFORMANCE.REMOVE_CLIPPED_SUBVIEWS}
      />

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
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add mixes</Text>
            <View style={styles.modalCloseButton} />
          </View>

          <View style={styles.searchContainer}>
            <Ionicons
              name="search"
              size={20}
              color={COLORS.textMuted}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search mixes..."
              placeholderTextColor={COLORS.textMuted}
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
              <ActivityIndicator size="large" color={COLORS.primary} />
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
                    {formatMixGenreLabel(mix.genre) ? (
                      <Text style={styles.availableMixGenre} numberOfLines={1}>
                        {formatMixGenreLabel(mix.genre)}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons name="add-circle" size={24} color={COLORS.primary} />
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
            <Text style={styles.renameModalKicker}>Playlist</Text>
            <Text style={styles.renameModalTitle}>Rename</Text>
            <TextInput
              style={styles.renameModalInput}
              value={renameDraft}
              onChangeText={setRenameDraft}
              placeholder="Playlist name"
              placeholderTextColor={COLORS.textMuted}
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
                  <ActivityIndicator color={COLORS.background} size="small" />
                ) : (
                  <Text style={styles.renameModalButtonPrimaryText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <RhoodModal
        visible={feedback.visible}
        onClose={closeFeedback}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        primaryButtonText={feedback.primaryButtonText}
        onPrimaryPress={handleFeedbackPrimary}
        secondaryButtonText={feedback.secondaryButtonText}
        onSecondaryPress={
          feedback.secondaryButtonText ? handleFeedbackSecondary : undefined
        }
      />
      <RhoodModal
        visible={confirm.visible}
        onClose={closeConfirm}
        type="warning"
        title={confirm.title}
        message={confirm.message}
        primaryButtonText={confirm.primaryButtonText}
        onPrimaryPress={handleConfirmPrimary}
        secondaryButtonText="Cancel"
        onSecondaryPress={closeConfirm}
      />
    </View>
  );
}

export default memo(PlaylistDetailScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backButton: {
    width: 44,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontFamily: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
    textAlign: "center",
    textTransform: "uppercase",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.md,
    fontFamily: TYPOGRAPHY.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  hero: {
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
  },
  coverWrap: {
    width: 196,
    height: 196,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: COLORS.backgroundTertiary,
    marginBottom: SPACING.lg,
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  coverPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.backgroundCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  coverBusy: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroKicker: {
    fontSize: TYPOGRAPHY.xs,
    fontFamily: TYPOGRAPHY.bold,
    color: COLORS.primary,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: TYPOGRAPHY["3xl"],
    fontFamily: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
    textAlign: "center",
    textTransform: "uppercase",
    paddingHorizontal: SPACING.md,
  },
  heroMeta: {
    marginTop: 6,
    fontSize: TYPOGRAPHY.sm,
    fontFamily: TYPOGRAPHY.primary,
    color: COLORS.textSecondary,
  },
  heroActions: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    width: "100%",
  },
  primaryAction: {
    flex: 1,
    borderRadius: RADIUS.full,
    overflow: "hidden",
  },
  primaryActionGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.full,
  },
  primaryActionText: {
    fontSize: TYPOGRAPHY.md,
    fontFamily: TYPOGRAPHY.bold,
    color: COLORS.background,
  },
  secondaryAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.backgroundSecondary,
  },
  secondaryActionGrow: {
    flex: 1,
  },
  secondaryActionText: {
    fontSize: TYPOGRAPHY.md,
    fontFamily: TYPOGRAPHY.semibold,
    color: COLORS.primary,
  },
  ownerTools: {
    flexDirection: "row",
    justifyContent: "center",
    gap: SPACING.xl,
    marginTop: SPACING.lg,
  },
  ownerTool: {
    alignItems: "center",
    gap: 6,
  },
  ownerToolText: {
    fontSize: TYPOGRAPHY.xs,
    fontFamily: TYPOGRAPHY.primary,
    color: COLORS.textSecondary,
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING["2xl"] || 32,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.xl,
    fontFamily: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
    marginBottom: 8,
    textTransform: "uppercase",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.sm,
    fontFamily: TYPOGRAPHY.primary,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyCta: {
    marginTop: SPACING.lg,
    width: "100%",
    maxWidth: 280,
    borderRadius: RADIUS.full,
    overflow: "hidden",
  },
  mixRowWrap: {
    paddingHorizontal: SPACING.lg,
  },
  mixRowWrapFirst: {
    paddingTop: SPACING.sm,
  },
  mixRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  reorderButtons: {
    gap: 2,
  },
  reorderButton: {
    padding: 2,
  },
  mixImageWrap: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: COLORS.backgroundTertiary,
    position: "relative",
  },
  mixImage: {
    width: "100%",
    height: "100%",
  },
  playingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  mixInfo: {
    flex: 1,
    gap: 3,
  },
  mixTitle: {
    fontSize: TYPOGRAPHY.md,
    fontFamily: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
  },
  mixSubtitle: {
    fontSize: TYPOGRAPHY.sm,
    fontFamily: TYPOGRAPHY.primary,
    color: COLORS.textSecondary,
  },
  mixMeta: {
    fontSize: TYPOGRAPHY.xs,
    fontFamily: TYPOGRAPHY.primary,
    color: COLORS.textTertiary,
  },
  removeButton: {
    padding: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    flex: 1,
    fontSize: TYPOGRAPHY.lg,
    fontFamily: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
    textAlign: "center",
    textTransform: "uppercase",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: RADIUS.lg,
    gap: 12,
  },
  searchIcon: {
    marginRight: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.md,
    fontFamily: TYPOGRAPHY.primary,
    color: COLORS.textPrimary,
  },
  modalLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  availableMixRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  availableMixImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: COLORS.backgroundTertiary,
  },
  availableMixInfo: {
    flex: 1,
    gap: 3,
  },
  availableMixTitle: {
    fontSize: TYPOGRAPHY.md,
    fontFamily: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
  },
  availableMixSubtitle: {
    fontSize: TYPOGRAPHY.sm,
    fontFamily: TYPOGRAPHY.primary,
    color: COLORS.textSecondary,
  },
  availableMixGenre: {
    fontSize: TYPOGRAPHY.xs,
    fontFamily: TYPOGRAPHY.primary,
    color: COLORS.textTertiary,
  },
  modalEmpty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  modalEmptyText: {
    fontSize: TYPOGRAPHY.md,
    fontFamily: TYPOGRAPHY.primary,
    color: COLORS.textMuted,
  },
  renameModalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  renameModalCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  renameModalKicker: {
    fontSize: TYPOGRAPHY.xs,
    fontFamily: TYPOGRAPHY.bold,
    color: COLORS.primary,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  renameModalTitle: {
    fontSize: TYPOGRAPHY.xl,
    fontFamily: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
    marginBottom: 14,
    textTransform: "uppercase",
  },
  renameModalInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: TYPOGRAPHY.md,
    fontFamily: TYPOGRAPHY.primary,
    color: COLORS.textPrimary,
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
    fontSize: TYPOGRAPHY.md,
    color: COLORS.textSecondary,
    fontFamily: TYPOGRAPHY.primary,
  },
  renameModalButtonPrimary: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 10,
    minWidth: 88,
    alignItems: "center",
    justifyContent: "center",
  },
  renameModalButtonPrimaryText: {
    fontSize: TYPOGRAPHY.md,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.background,
    fontFamily: TYPOGRAPHY.primary,
  },
  renameModalButtonDisabled: {
    opacity: 0.6,
  },
});
