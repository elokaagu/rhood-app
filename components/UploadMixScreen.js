import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  Linking,
  Image,
  Animated,
  KeyboardAvoidingView,
  InteractionManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { HapticPatterns } from "../lib/haptics";
import { Audio } from "expo-av";
import { supabase, db } from "../lib/supabase";
import { track, AnalyticsEvents } from "../lib/analytics";
import { uploadMixSubmission } from "../lib/mixUploadService";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from "../lib/sharedStyles";
import {
  MIX_GENRES,
  UploadMixLibraryCarousel,
  UploadMixLibraryPlaceholder,
  UploadMixLibraryEmptyState,
  UploadMixGenreStrip,
} from "./upload/UploadMixPerfParts";
import AppScreenTutorialModal from "./AppScreenTutorialModal";
import { useAppTutorialModal } from "../hooks/useAppTutorialModal";
import { APP_TUTORIAL_SCREEN_IDS } from "../lib/appTutorialContent";

// Conditionally import DocumentPicker
let DocumentPicker;
let ImagePicker;
try {
  DocumentPicker = require("expo-document-picker");
} catch (e) {
  console.log("DocumentPicker not available in Expo Go");
}

try {
  ImagePicker = require("expo-image-picker");
} catch (e) {
  console.log("ImagePicker not available in Expo Go");
}

export default function UploadMixScreen({ user, onBack, onUploadComplete, existingMixId = null }) {
  const { tutorialModalProps } = useAppTutorialModal(APP_TUTORIAL_SCREEN_IDS.UPLOAD_MIX);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedArtwork, setSelectedArtwork] = useState(null);
  const [selectedFileDuration, setSelectedFileDuration] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showDevBuildModal, setShowDevBuildModal] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const [existingMixes, setExistingMixes] = useState([]);
  const [editingMix, setEditingMix] = useState(null);
  const [showMixSelector, setShowMixSelector] = useState(false);
  /** True while the first library fetch is in flight — reserve top layout so Step 1 does not jump above Library. */
  const [loadingMixes, setLoadingMixes] = useState(() => Boolean(user?.id));
  
  const [mixData, setMixData] = useState({
    title: "",
    description: "",
    genre: "",
    isPublic: true,
    // Default ON; user can turn off before upload (single setPrimaryMix in service)
    setAsPrimary: true,
    isPinned: false,
  });
  const [pinnedMixesCount, setPinnedMixesCount] = useState(0);

  const fetchPinnedMixesCount = useCallback(async () => {
    if (!user?.id) {
      setPinnedMixesCount(0);
      return;
    }

    try {
      const { count, error } = await supabase
        .from("mixes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_pinned", true);

      if (error) {
        if (error.code === "42703") {
          setPinnedMixesCount(0);
          return;
        }
        throw error;
      }

      setPinnedMixesCount(count || 0);
    } catch (error) {
      console.error("❌ Error fetching pinned mixes count:", error);
      setPinnedMixesCount(0);
    }
  }, [user?.id]);

  const loadExistingMixes = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoadingMixes(true);
      const mixes = await db.getUserMixes(user.id);
      setExistingMixes(mixes || []);

      if (mixes && mixes.length > 0 && !existingMixId) {
        setShowMixSelector(true);
      }
    } catch (error) {
      console.error("Error loading existing mixes:", error);
      setExistingMixes([]);
    } finally {
      setLoadingMixes(false);
    }
  }, [user?.id, existingMixId]);

  /** Signed-in users should show the Library slot as loading when `user` appears after mount. */
  useLayoutEffect(() => {
    if (user?.id) {
      setLoadingMixes(true);
    } else {
      setLoadingMixes(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return undefined;
    void loadExistingMixes();
    void fetchPinnedMixesCount();
  }, [user?.id, loadExistingMixes, fetchPinnedMixesCount]);

  // Animate progress bar when uploadProgress changes
  useEffect(() => {
    if (uploading) {
      Animated.timing(progressAnim, {
        toValue: uploadProgress / 100,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      progressAnim.setValue(0);
    }
  }, [uploadProgress, uploading]);

  // Shimmer animation for progress bar
  useEffect(() => {
    if (uploading) {
      const shimmerAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      shimmerAnimation.start();
      return () => shimmerAnimation.stop();
    } else {
      shimmerAnim.setValue(0);
    }
  }, [uploading]);

  const handleSelectMixToEdit = useCallback(async (mix) => {
    setEditingMix(mix);
    setShowMixSelector(false);
    setMixData({
      title: mix.title || "",
      description: mix.description || "",
      genre: mix.genre || "",
      isPublic: mix.is_public !== false,
      setAsPrimary: false, // Don't change primary mix when editing
      isPinned: mix.is_pinned || false,
    });
    await fetchPinnedMixesCount();
    if (mix.artwork_url || mix.image_url) {
      setSelectedArtwork({ uri: mix.artwork_url || mix.image_url });
    }
  }, [fetchPinnedMixesCount]);

  const handleStartNewMix = useCallback(() => {
    setEditingMix(null);
    setShowMixSelector(false);
    setMixData({
      title: "",
      description: "",
      genre: "",
      isPublic: true,
      setAsPrimary: true,
      isPinned: false,
    });
    setSelectedFile(null);
    setSelectedArtwork(null);
  }, []);

  // If existingMixId is provided, load that mix (after list fetch)
  useEffect(() => {
    if (existingMixId && existingMixes.length > 0) {
      const mix = existingMixes.find((m) => m.id === existingMixId);
      if (mix) {
        handleSelectMixToEdit(mix);
      }
    }
  }, [existingMixId, existingMixes, handleSelectMixToEdit]);

  const onToggleGenre = useCallback((genre) => {
    setMixData((prev) => ({
      ...prev,
      genre: prev.genre === genre ? "" : genre,
    }));
  }, []);

  const pickAudioFile = useCallback(async () => {
    try {
      HapticPatterns.buttonPress();

      if (!DocumentPicker) {
        setShowDevBuildModal(true);
        return;
      }

      const result = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
        copyToCacheDirectory: true,
      });

      if (result.type === "success" || !result.canceled) {
        const file = result.assets ? result.assets[0] : result;
        const fileExt =
          file.name?.split(".").pop()?.toLowerCase().trim() || "";
        const fileUri = file.uri || file.fileCopyUri;

        if (!fileUri) {
          Alert.alert(
            "File Unavailable",
            "We couldn't access this audio file. Please try selecting it again."
          );
          return;
        }

        // Check file size against Supabase Pro limits
        const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
        const maxSizeMB = 5120; // Supabase Pro tier limit (5GB)

        console.log(`📁 Selected file size: ${fileSizeMB}MB`);

        if (file.size > maxSizeMB * 1024 * 1024) {
          Alert.alert(
            "File Too Large",
            `Your file is ${fileSizeMB}MB, but the maximum allowed size is ${maxSizeMB}MB (5GB).\n\nFor files this large, consider:\n1. Splitting into multiple parts\n2. Using higher compression\n3. Contacting support for enterprise limits`,
            [{ text: "OK" }]
          );
          return;
        }

        // Additional check: Warn if file is close to common bucket limits
        // (Some buckets might be configured with lower limits)
        if (file.size > 100 * 1024 * 1024) {
          // Over 100MB
          console.log(
            `⚠️ Large file detected: ${fileSizeMB}MB - ensure bucket allows files this size`
          );
        }

        console.log("✅ File size within limits");

        const maxDurationMillis = 10 * 60 * 1000; // 10 minutes
        let detectedDurationMillis = null;

        // Check audio duration before accepting
        try {
          if (!Audio || !Audio.Sound || !Audio.Sound.createAsync) {
            Alert.alert(
              "Length Check Unavailable",
              "We couldn't verify this mix's length in the current environment. Please ensure it is no longer than 10 minutes before uploading."
            );
          } else {
            const { sound } = await Audio.Sound.createAsync(
              { uri: fileUri },
              { shouldPlay: false }
            );

            const status = await sound.getStatusAsync();
            await sound.unloadAsync();

            if (status.isLoaded && status.durationMillis) {
              detectedDurationMillis = status.durationMillis;
              const durationMinutes = detectedDurationMillis / 1000 / 60;

              console.log(
                `🎵 Audio duration: ${durationMinutes.toFixed(2)} minutes`
              );

              if (detectedDurationMillis > maxDurationMillis) {
                Alert.alert(
                  "Mix Too Long",
                  "Please upload a mix that is 10 minutes or shorter."
                );
                return;
              }
            } else {
              Alert.alert(
                "Unable to Verify Length",
                "We couldn't read the length of this mix. Please double-check that it is 10 minutes or shorter before uploading."
              );
            }
          }
        } catch (durationError) {
          console.warn("⚠️ Could not check duration:", durationError.message);
          Alert.alert(
            "Unable to Verify Length",
            "We couldn't read the length of this mix. Please double-check that it is 10 minutes or shorter before uploading."
          );
        }

        setSelectedFile(file);
        setSelectedFileDuration(detectedDurationMillis);

        if (fileExt && fileExt !== "mp3") {
          Alert.alert(
            "MP3 Recommended",
            "MP3 files upload faster and are more reliable for playback. Consider exporting your mix as an MP3 before uploading.",
            [{ text: "OK" }]
          );
        }

        // Auto-fill title from filename if empty
        if (!mixData.title && file.name) {
          setMixData((prev) => ({
            ...prev,
            title: file.name.replace(/\.(mp3|wav|m4a|aac)$/i, ""),
          }));
        }
      }
    } catch (error) {
      console.error("Error picking file:", error);
      Alert.alert("Error", "Failed to select file. Please try again.");
    }
  }, [mixData.title]);

  /**
   * Empty library is already a "new mix" in state — resetting alone does nothing visible.
   * "Upload new mix" should start the flow by opening the audio picker (same as Step 1).
   */
  const handleUploadNewMix = useCallback(() => {
    if (uploading) return;
    handleStartNewMix();
    InteractionManager.runAfterInteractions(() => {
      void pickAudioFile();
    });
  }, [uploading, handleStartNewMix, pickAudioFile]);

  const pickArtworkImage = useCallback(async () => {
    try {
      HapticPatterns.buttonPress();

      if (!ImagePicker) {
        Alert.alert(
          "Feature Not Available",
          "Artwork is required for mix submissions. Please use the development build to select artwork."
        );
        return;
      }

      // Request permissions
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "We need access to your photo library to select artwork. Please enable media library access in your device settings.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Settings", onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for artwork
        quality: 0.8, // Good quality but smaller file size
        base64: false,
        exif: false, // Don't include EXIF data to reduce file size
        allowsMultipleSelection: false,
        selectionLimit: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];

        // Create a file-like object from the image picker result
        const imageFile = {
          uri: asset.uri,
          name: asset.fileName || `artwork_${Date.now()}.jpg`,
          mimeType: asset.mimeType,
          type:
            asset.mimeType ||
            (typeof asset.type === "string" && asset.type.includes("/")
              ? asset.type
              : undefined),
          size: asset.fileSize || 0,
          width: asset.width,
          height: asset.height,
        };

        // Check file size (max 10MB for images) only if we have size info
        if (imageFile.size > 0 && imageFile.size > 10 * 1024 * 1024) {
          Alert.alert(
            "File Too Large",
            "Please select an image smaller than 10MB.",
            [{ text: "OK" }]
          );
          return;
        }

        setSelectedArtwork(imageFile);
        HapticPatterns.success();
      }
    } catch (error) {
      console.error("Error picking artwork:", error.message);

      // More specific error handling
      let errorMessage = "Failed to select artwork. Please try again.";
      if (error.message?.includes("permission")) {
        errorMessage =
          "Permission denied. Please enable media library access in your device settings.";
      } else if (error.message?.includes("cancel")) {
        errorMessage = "Image selection was cancelled.";
      } else if (error.message?.includes("network")) {
        errorMessage =
          "Network error. Please check your connection and try again.";
      }

      Alert.alert("Error", errorMessage, [{ text: "OK" }]);
    }
  }, []);

  const uploadMix = useCallback(async () => {
    try {
      setUploading(true);
      setUploadProgress(0);
      HapticPatterns.primaryButtonPress();

      // Snapshot form state — never mutate React state inside the upload pipeline
      const mixSnapshot = { ...mixData };

      if (selectedFile) {
        console.log("Selected file:", {
          name: selectedFile.name,
          hasUri: !!selectedFile.uri,
          hasFileCopyUri: !!selectedFile.fileCopyUri,
          size: selectedFile.size,
          type: selectedFile.mimeType,
        });
      }

      const result = await uploadMixSubmission({
        db,
        user,
        editingMix,
        selectedFile,
        selectedArtwork,
        selectedFileDuration,
        mixData: mixSnapshot,
        Audio,
        onProgress: setUploadProgress,
        onDurationResolved: setSelectedFileDuration,
      });

      const {
        mixRecord,
        becamePrimary,
        primaryError,
        artworkUrl,
        fileExt,
        effectiveDurationMillis,
      } = result;

      if (primaryError && mixSnapshot.setAsPrimary && !editingMix && mixRecord) {
        Alert.alert(
          "Upload Successful",
          "Your mix was uploaded, but there was an issue setting it as your Audio ID. You can set it manually from your profile.",
          [{ text: "OK" }]
        );
      }

      await fetchPinnedMixesCount();

      if (editingMix && !mixSnapshot.isPinned && editingMix.is_pinned) {
        setPinnedMixesCount((prev) => Math.max(0, prev - 1));
      } else if (
        mixSnapshot.isPinned &&
        (!editingMix || !editingMix.is_pinned)
      ) {
        setPinnedMixesCount((prev) => Math.min(3, prev + 1));
      }

      HapticPatterns.success();

      await track(AnalyticsEvents.MIX_UPLOADED, {
        mix_id: mixRecord.id,
        mix_title: mixSnapshot.title,
        duration_seconds: effectiveDurationMillis
          ? Math.round(effectiveDurationMillis / 1000)
          : null,
        file_format: fileExt || "unknown",
        file_size_mb: selectedFile
          ? (selectedFile.size / (1024 * 1024)).toFixed(2)
          : null,
        has_artwork: !!artworkUrl,
        set_as_primary: becamePrimary,
        is_update: !!editingMix,
      });

      Alert.alert(
        "Success!",
        editingMix
          ? "Your mix has been updated successfully!"
          : "Your mix has been uploaded successfully" +
              (becamePrimary ? " and set as your primary mix!" : "!"),
        [
          {
            text: "OK",
            onPress: () => {
              if (onUploadComplete) {
                onUploadComplete(mixRecord);
              }
              if (onBack) {
                onBack();
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error uploading mix:", error);
      HapticPatterns.error();
      const title = error.alertTitle || "Upload Failed";
      Alert.alert(
        title,
        error.message || "Failed to upload mix. Please try again."
      );
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setSelectedFileDuration(null);
    }
  }, [
    user,
    editingMix,
    selectedFile,
    selectedArtwork,
    selectedFileDuration,
    mixData,
    onUploadComplete,
    onBack,
    fetchPinnedMixesCount,
  ]);

  const formatFileSize = useCallback((bytes) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  }, []);

  const formatDuration = useCallback((millis) => {
    if (!millis) return "0:00";
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, []);

  const androidSubtitleTextProps =
    Platform.OS === "android" ? { includeFontPadding: false } : {};

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Header */}
        <View style={styles.headerShell}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {editingMix ? "UPDATE MIX" : "UPLOAD MIX"}
          </Text>
        </View>

        {user?.id && loadingMixes ? (
          <UploadMixLibraryPlaceholder
            styles={styles}
            primaryColor={COLORS.primary}
          />
        ) : null}

        {/* Mix Selector — virtualized horizontal list + ProgressiveImage */}
        {showMixSelector && !editingMix && existingMixes.length > 0 ? (
          <UploadMixLibraryCarousel
            mixes={existingMixes}
            styles={styles}
            primaryColor={COLORS.primary}
            backgroundColor={COLORS.background}
            onSelectMix={handleSelectMixToEdit}
            onNewMix={handleUploadNewMix}
          />
        ) : null}

        {!loadingMixes &&
        user?.id &&
        !editingMix &&
        existingMixes.length === 0 &&
        !existingMixId ? (
          <UploadMixLibraryEmptyState
            styles={styles}
            primaryColor={COLORS.primary}
            backgroundColor={COLORS.background}
            onNewMix={handleUploadNewMix}
          />
        ) : null}

        {/* Editing Indicator */}
        {editingMix && (
          <View style={styles.section}>
            <View style={styles.editingBanner}>
              <View style={styles.editingBannerIcon}>
                <Ionicons name="create" size={18} color={COLORS.primary} />
              </View>
              <View style={styles.editingBannerTextWrap}>
                <Text style={styles.editingBannerLabel}>Editing</Text>
                <Text style={styles.editingText} numberOfLines={1}>
                  {editingMix.title}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleStartNewMix}
                style={styles.cancelEditButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.cancelEditText}>New mix</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* File Picker */}
        <View style={styles.section}>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionKicker}>Step 1</Text>
            <Text style={styles.sectionTitle}>
              {editingMix ? "Audio (optional)" : "Audio file"}
            </Text>
            {editingMix ? (
              <Text
                style={styles.sectionSubtitle}
                {...androidSubtitleTextProps}
              >
                Skip to keep your current audio. Replace only if you are
                uploading a new version.
              </Text>
            ) : (
              <Text
                style={styles.sectionSubtitle}
                {...androidSubtitleTextProps}
              >
                MP3 recommended
              </Text>
            )}
            <TouchableOpacity
              style={[
                styles.filePickerButton,
                selectedFile && styles.filePickerButtonFilled,
              ]}
              onPress={pickAudioFile}
              disabled={uploading}
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.filePickerIconWrap,
                  selectedFile && styles.filePickerIconWrapActive,
                ]}
              >
                <Ionicons
                  name={selectedFile ? "musical-notes" : "cloud-upload-outline"}
                  size={28}
                  color={selectedFile ? COLORS.background : COLORS.primary}
                />
              </View>
              {selectedFile ? (
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName}>{selectedFile.name}</Text>
                  <Text style={styles.fileMeta}>
                    {formatFileSize(selectedFile.size)}
                    {selectedFileDuration
                      ? ` · ${formatDuration(selectedFileDuration)}`
                      : ""}
                  </Text>
                </View>
              ) : (
                <View style={styles.filePickerGuidelines}>
                  <Text style={styles.filePickerText}>
                    Tap to choose file · MP3 · max 10 min
                  </Text>
                  <Text style={styles.filePickerSubtext}>
                    We will validate length after you pick.
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Artwork Picker */}
        <View style={styles.section}>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionKicker}>Step 2</Text>
            <Text style={styles.sectionTitle}>
              {editingMix ? "Artwork" : "Artwork *"}
            </Text>
            {editingMix && (
              <Text
                style={styles.sectionSubtitle}
                {...androidSubtitleTextProps}
              >
                {editingMix.artwork_url || editingMix.image_url
                  ? "Replace the cover or keep the current image."
                  : "Add cover art — it helps your mix stand out in feeds."}
              </Text>
            )}
            {!editingMix && (
              <Text
                style={styles.sectionSubtitle}
                {...androidSubtitleTextProps}
              >
                Required for new uploads. Square images look best.
              </Text>
            )}
            {/* Show existing artwork preview when editing */}
            {editingMix &&
              (editingMix.artwork_url || editingMix.image_url) &&
              !selectedArtwork && (
                <View style={styles.existingArtworkPreview}>
                  <Image
                    source={{
                      uri: editingMix.artwork_url || editingMix.image_url,
                    }}
                    style={styles.existingArtworkImage}
                    resizeMode="cover"
                  />
                  <Text style={styles.existingArtworkLabel}>
                    Current artwork
                  </Text>
                </View>
              )}

            {/* Show preview of selected artwork */}
            {selectedArtwork && (
              <View style={styles.artworkPreviewContainer}>
                <Text style={styles.artworkPreviewLabel}>Preview</Text>
                <Text style={styles.artworkPreviewSubtext}>
                  Square cover art only — title and genre are set in the next step.
                </Text>
                <View style={styles.artworkPreviewCard}>
                  <Image
                    source={{ uri: selectedArtwork.uri }}
                    style={styles.artworkPreviewImage}
                    resizeMode="cover"
                  />
                </View>
                <TouchableOpacity
                  style={styles.removeArtworkButton}
                  onPress={() => {
                    setSelectedArtwork(null);
                    HapticPatterns.buttonPress();
                  }}
                  disabled={uploading}
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={COLORS.error}
                  />
                  <Text style={styles.removeArtworkText}>Remove image</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.filePickerButton,
                selectedArtwork && styles.filePickerButtonFilled,
              ]}
              onPress={pickArtworkImage}
              disabled={uploading}
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.filePickerIconWrap,
                  selectedArtwork && styles.filePickerIconWrapActive,
                ]}
              >
                <Ionicons
                  name={selectedArtwork ? "image" : "image-outline"}
                  size={28}
                  color={
                    selectedArtwork ? COLORS.background : COLORS.primary
                  }
                />
              </View>
              {selectedArtwork ? (
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName}>{selectedArtwork.name}</Text>
                  <Text style={styles.fileMeta}>
                    {formatFileSize(selectedArtwork.size)}
                  </Text>
                </View>
              ) : (
                <Text style={styles.filePickerText}>
                  {editingMix && (editingMix.artwork_url || editingMix.image_url)
                    ? "Tap to replace from photos"
                    : "Tap to choose from photos"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Mix Details */}
        <View style={styles.section}>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionKicker}>Step 3</Text>
            <Text style={styles.sectionTitle}>Details & visibility</Text>
            <Text
              style={styles.sectionSubtitle}
              {...androidSubtitleTextProps}
            >
              Add a title (required) and genre so listeners can find your mix.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter mix title"
                placeholderTextColor={COLORS.textMuted}
                value={mixData.title}
                onChangeText={(text) =>
                  setMixData((prev) => ({ ...prev, title: text }))
                }
                editable={!uploading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Tell us about your mix..."
                placeholderTextColor={COLORS.textMuted}
                value={mixData.description}
                onChangeText={(text) =>
                  setMixData((prev) => ({ ...prev, description: text }))
                }
                multiline
                numberOfLines={4}
                editable={!uploading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Genre</Text>
              <UploadMixGenreStrip
                genres={MIX_GENRES}
                selectedGenre={mixData.genre}
                uploading={uploading}
                styles={styles}
                onToggleGenre={onToggleGenre}
              />
            </View>

            <Text style={styles.subsectionLabel}>Profile</Text>

            {/* Set as Primary Mix Toggle */}
            <View style={styles.toggleCard}>
              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => {
                  HapticPatterns.buttonPress();
                  setMixData((prev) => ({
                    ...prev,
                    setAsPrimary: !prev.setAsPrimary,
                  }));
                }}
                disabled={uploading}
                activeOpacity={0.85}
              >
                <View style={styles.toggleLeft}>
                  <View style={styles.toggleIconWrap}>
                    <Ionicons
                      name={mixData.setAsPrimary ? "star" : "star-outline"}
                      size={20}
                      color={
                        mixData.setAsPrimary
                          ? COLORS.primary
                          : COLORS.textSecondary
                      }
                    />
                  </View>
                  <Text style={styles.toggleLabel}>Set as primary mix</Text>
                </View>
                <View
                  style={[
                    styles.toggle,
                    mixData.setAsPrimary && styles.toggleActive,
                  ]}
                >
                  <View
                    style={[
                      styles.toggleThumb,
                      mixData.setAsPrimary && styles.toggleThumbActive,
                    ]}
                  />
                </View>
              </TouchableOpacity>
              <Text style={styles.toggleHintInside}>
                {mixData.setAsPrimary
                  ? "Featured on your profile as your main mix."
                  : "Not featured as your primary mix."}
              </Text>
            </View>

            {/* Pin Mix Toggle */}
            <View style={[styles.toggleCard, styles.toggleCardLast]}>
              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => {
                  HapticPatterns.buttonPress();

                  if (!mixData.isPinned && pinnedMixesCount >= 3) {
                    Alert.alert(
                      "Maximum Pinned Mixes",
                      "You can only pin up to 3 mixes. Please unpin another mix first.",
                      [{ text: "OK" }]
                    );
                    return;
                  }

                  setMixData((prev) => ({
                    ...prev,
                    isPinned: !prev.isPinned,
                  }));
                }}
                disabled={uploading}
                activeOpacity={0.85}
              >
                <View style={styles.toggleLeft}>
                  <View style={styles.toggleIconWrap}>
                    <Ionicons
                      name={mixData.isPinned ? "pin" : "pin-outline"}
                      size={20}
                      color={
                        mixData.isPinned ? COLORS.primary : COLORS.textSecondary
                      }
                    />
                  </View>
                  <View style={styles.toggleLabelContainer}>
                    <Text style={styles.toggleLabel}>Pin as top mix</Text>
                    <Text style={styles.toggleSubLabel}>
                      {pinnedMixesCount}/3 pinned
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.toggle,
                    mixData.isPinned && styles.toggleActive,
                  ]}
                >
                  <View
                    style={[
                      styles.toggleThumb,
                      mixData.isPinned && styles.toggleThumbActive,
                    ]}
                  />
                </View>
              </TouchableOpacity>
              <Text style={styles.toggleHintInside}>
                {mixData.isPinned
                  ? "Shown in your pinned mixes row."
                  : pinnedMixesCount >= 3
                  ? "Max 3 pinned — unpin one to add this."
                  : "Pin up to 3 mixes to highlight range."}
              </Text>
            </View>
          </View>
        </View>

        {/* Upload Button */}
        <TouchableOpacity
          style={[
            styles.uploadButton,
            uploading && styles.uploadButtonDisabled,
          ]}
          onPress={uploadMix}
          disabled={uploading || (!editingMix && !selectedFile)}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={
              uploading || (!editingMix && !selectedFile)
                ? [COLORS.borderLight, COLORS.borderDark]
                : [COLORS.primary, COLORS.primaryDark]
            }
            style={styles.uploadButtonGradient}
          >
            {uploading ? (
              <View style={styles.uploadingContent}>
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarBackground}>
                    <Animated.View
                      style={[
                        styles.progressBarFill,
                        {
                          width: progressAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ["0%", "100%"],
                          }),
                        },
                      ]}
                    >
                      <Animated.View
                        style={[
                          styles.progressBarShimmer,
                          {
                            opacity: shimmerAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.3, 0.7],
                            }),
                            transform: [
                              {
                                translateX: shimmerAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [-100, 100],
                                }),
                              },
                            ],
                          },
                        ]}
                      />
                    </Animated.View>
                  </View>
                </View>
                <Text style={styles.uploadProgressPercentText}>
                  {uploadProgress}%
                </Text>
              </View>
            ) : (
              <>
                <Ionicons name="cloud-upload" size={24} color="black" />
                <Text style={styles.uploadButtonText}>
                  {editingMix ? "Update Mix" : "Upload Mix"}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* Development Build Required Modal - R/HOOD Theme */}
      <Modal
        visible={showDevBuildModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDevBuildModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons
              name="alert-circle-outline"
              size={64}
              color={COLORS.primary}
              style={styles.modalIcon}
            />
            <Text style={styles.modalTitle}>Feature Not Available</Text>
            <Text style={styles.modalDescription}>
              File picker requires a development build. Please use the
              development build to upload mixes.
            </Text>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowDevBuildModal(false)}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.modalButtonGradient}
              >
                <Text style={styles.modalButtonText}>OK</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {tutorialModalProps ? (
        <AppScreenTutorialModal {...tutorialModalProps} />
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: 120,
  },
  headerShell: {
    marginHorizontal: -SPACING.sm,
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontFamily: TYPOGRAPHY.bold,
    fontSize: TYPOGRAPHY["2xl"],
    color: COLORS.textPrimary,
    textAlign: "left",
    textTransform: "uppercase",
    letterSpacing: 1,
    lineHeight: 26,
  },
  libraryPlaceholderStrip: {
    marginHorizontal: -SPACING.md,
    marginTop: SPACING.xs,
    minHeight: 200,
    justifyContent: "center",
    position: "relative",
  },
  libraryPlaceholderCards: {
    flexDirection: "row",
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xs,
    gap: SPACING.md,
    opacity: 0.5,
  },
  libraryPlaceholderCard: {
    width: 144,
    height: 200,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.backgroundTertiary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  libraryPlaceholderSpinner: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  libraryPlaceholderButtonBar: {
    marginTop: SPACING.md,
    height: 52,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.backgroundTertiary,
    borderWidth: 1,
    borderColor: "rgba(204, 255, 0, 0.22)",
    opacity: 0.55,
  },
  libraryEmptyMessageWrap: {
    minHeight: 200,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  libraryEmptyTitle: {
    marginTop: SPACING.sm,
    fontSize: TYPOGRAPHY.base,
    fontFamily: TYPOGRAPHY.primary,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.textPrimary,
  },
  libraryEmptySubtitle: {
    marginTop: SPACING.xs,
    fontSize: TYPOGRAPHY.sm,
    fontFamily: TYPOGRAPHY.primary,
    color: COLORS.textTertiary,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionKicker: {
    fontSize: TYPOGRAPHY.xs,
    fontFamily: TYPOGRAPHY.primary,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.textTertiary,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: SPACING.xs,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontFamily: TYPOGRAPHY.bold,
    color: COLORS.primary,
    marginBottom: SPACING.sm,
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sm,
    marginBottom: SPACING.base,
    fontFamily: TYPOGRAPHY.primary,
    lineHeight: 22,
    paddingVertical: 2,
  },
  subsectionLabel: {
    fontSize: TYPOGRAPHY.xs,
    fontFamily: TYPOGRAPHY.primary,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: SPACING.sm,
    marginTop: SPACING.xs,
  },
  filePickerButton: {
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.md,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    borderStyle: "dashed",
  },
  filePickerButtonFilled: {
    borderStyle: "solid",
    borderColor: "rgba(204, 255, 0, 0.35)",
    backgroundColor: COLORS.backgroundCard,
  },
  filePickerIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.backgroundCard,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filePickerIconWrapActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filePickerText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.base,
    marginTop: SPACING.base,
    textAlign: "center",
    fontFamily: TYPOGRAPHY.primary,
    lineHeight: 20,
  },
  filePickerGuidelines: {
    alignItems: "center",
    marginTop: SPACING.base,
  },
  filePickerSubtext: {
    color: COLORS.textTertiary,
    fontSize: TYPOGRAPHY.sm,
    marginTop: SPACING.xs,
    textAlign: "center",
    fontFamily: TYPOGRAPHY.primary,
  },
  fileInfo: {
    marginTop: SPACING.base,
    alignItems: "center",
    paddingHorizontal: SPACING.sm,
  },
  fileName: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.semibold,
    textAlign: "center",
    fontFamily: TYPOGRAPHY.primary,
  },
  fileMeta: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sm,
    marginTop: SPACING.xs,
    textAlign: "center",
    fontFamily: TYPOGRAPHY.primary,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  label: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.semibold,
    marginBottom: SPACING.sm,
    fontFamily: TYPOGRAPHY.primary,
  },
  input: {
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: RADIUS.base,
    padding: SPACING.base,
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontFamily: TYPOGRAPHY.primary,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  genreScroll: {
    flexGrow: 0,
    marginHorizontal: -SPACING.xs,
  },
  genreScrollContent: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs,
    gap: SPACING.sm,
    flexDirection: "row",
  },
  genreChip: {
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  genreChipSelected: {
    backgroundColor: "rgba(204, 255, 0, 0.12)",
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  genreChipText: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.medium,
    fontFamily: TYPOGRAPHY.primary,
  },
  genreChipTextSelected: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.weightBold,
  },
  toggleCard: {
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
    overflow: "hidden",
  },
  toggleCardLast: {
    marginBottom: 0,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.base,
  },
  toggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: SPACING.sm,
    minWidth: 0,
  },
  toggleIconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.base,
    backgroundColor: COLORS.backgroundCard,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toggleLabel: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.base,
    fontFamily: TYPOGRAPHY.primary,
    fontWeight: TYPOGRAPHY.semibold,
    flexShrink: 1,
  },
  toggleLabelContainer: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  toggleSubLabel: {
    fontSize: TYPOGRAPHY.xs,
    fontFamily: TYPOGRAPHY.primary,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  toggleHintInside: {
    color: COLORS.textTertiary,
    fontSize: TYPOGRAPHY.xs,
    fontFamily: TYPOGRAPHY.primary,
    lineHeight: 16,
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.sm,
    marginTop: -SPACING.xs,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.borderLight,
    padding: 2,
    justifyContent: "center",
  },
  toggleActive: {
    backgroundColor: COLORS.primary,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.textPrimary,
  },
  toggleThumbActive: {
    alignSelf: "flex-end",
  },
  uploadButton: {
    borderRadius: RADIUS.md,
    overflow: "hidden",
    marginTop: SPACING.sm,
    minHeight: 56,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 6,
  },
  uploadButtonDisabled: {
    opacity: 0.55,
    shadowOpacity: 0,
    elevation: 0,
  },
  uploadButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.base,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    minHeight: 56,
  },
  uploadButtonText: {
    color: COLORS.background,
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.weightBold,
    fontFamily: TYPOGRAPHY.primary,
  },
  /** Uploading state uses a dark track; black (background) would disappear. */
  uploadProgressPercentText: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.weightBold,
    fontFamily: TYPOGRAPHY.primary,
    minWidth: 44,
    textAlign: "right",
  },
  existingArtworkPreview: {
    marginBottom: SPACING.md,
    alignItems: "center",
  },
  existingArtworkImage: {
    width: 128,
    height: 128,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.backgroundTertiary,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  existingArtworkLabel: {
    color: COLORS.textTertiary,
    fontSize: TYPOGRAPHY.sm,
    fontFamily: TYPOGRAPHY.primary,
  },
  artworkPreviewContainer: {
    marginBottom: SPACING.md,
    alignItems: "center",
  },
  artworkPreviewLabel: {
    fontSize: TYPOGRAPHY.sm,
    fontFamily: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  artworkPreviewSubtext: {
    fontSize: TYPOGRAPHY.sm,
    fontFamily: TYPOGRAPHY.primary,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    textAlign: "center",
  },
  artworkPreviewCard: {
    width: 200,
    height: 200,
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    backgroundColor: COLORS.backgroundCard,
    borderWidth: 2,
    borderColor: "rgba(204, 255, 0, 0.28)",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    position: "relative",
  },
  artworkPreviewImage: {
    width: "100%",
    height: "100%",
  },
  removeArtworkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginTop: SPACING.base,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.base,
    backgroundColor: COLORS.backgroundCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  removeArtworkText: {
    fontSize: TYPOGRAPHY.sm,
    fontFamily: TYPOGRAPHY.primary,
    color: COLORS.error,
    fontWeight: TYPOGRAPHY.semibold,
  },
  mixSelectorScroll: {
    marginHorizontal: -SPACING.md,
    marginTop: SPACING.xs,
  },
  mixSelectorScrollContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  mixSelectorCard: {
    width: 144,
    height: 200,
    marginRight: SPACING.md,
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: RADIUS.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  mixSelectorFullBleed: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.backgroundCard,
  },
  mixSelectorImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.backgroundCard,
  },
  mixSelectorCardGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 72,
    justifyContent: "flex-end",
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.sm,
    paddingTop: SPACING.lg,
  },
  mixSelectorTitleOverlay: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.semibold,
    fontFamily: TYPOGRAPHY.primary,
  },
  mixSelectorGenreOverlay: {
    color: "rgba(255,255,255,0.72)",
    fontSize: TYPOGRAPHY.xs,
    marginTop: 2,
    fontFamily: TYPOGRAPHY.primary,
  },
  mixSelectorPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  mixSelectorNoArtworkLabel: {
    color: COLORS.textTertiary,
    fontSize: TYPOGRAPHY.xs,
    marginTop: SPACING.xs,
    fontFamily: TYPOGRAPHY.primary,
  },
  newMixButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.base,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: "rgba(204, 255, 0, 0.28)",
    gap: SPACING.sm,
  },
  newMixButtonIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  newMixButtonText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.weightBold,
    fontFamily: TYPOGRAPHY.primary,
    letterSpacing: 0.3,
  },
  editingBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: "rgba(204, 255, 0, 0.25)",
    gap: SPACING.sm,
  },
  editingBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: "rgba(204, 255, 0, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  editingBannerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  editingBannerLabel: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
    fontFamily: TYPOGRAPHY.primary,
    fontWeight: TYPOGRAPHY.semibold,
  },
  editingText: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.base,
    fontFamily: TYPOGRAPHY.primary,
    fontWeight: TYPOGRAPHY.semibold,
  },
  cancelEditButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  cancelEditText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.sm,
    fontFamily: TYPOGRAPHY.primary,
    fontWeight: TYPOGRAPHY.weightBold,
  },
  uploadingContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    width: "100%",
  },
  progressBarContainer: {
    flex: 1,
    height: 6,
    justifyContent: "center",
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 3,
    overflow: "hidden",
    position: "relative",
  },
  progressBarShimmer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    width: 50,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlayDark,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: RADIUS.xl,
    padding: SPACING["2xl"],
    width: "85%",
    maxWidth: 400,
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  modalIcon: {
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY["3xl"],
    fontFamily: TYPOGRAPHY.primary,
    fontWeight: TYPOGRAPHY.weightBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.base,
    textAlign: "center",
    fontFamily: TYPOGRAPHY.primary,
  },
  modalDescription: {
    fontSize: TYPOGRAPHY.lg,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: SPACING.xl,
    lineHeight: 22,
    fontFamily: TYPOGRAPHY.primary,
  },
  modalButton: {
    width: "100%",
    borderRadius: RADIUS.md,
    overflow: "hidden",
  },
  modalButtonGradient: {
    padding: SPACING.base,
    alignItems: "center",
  },
  modalButtonText: {
    color: COLORS.background,
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.weightBold,
    fontFamily: TYPOGRAPHY.primary,
  },
});
