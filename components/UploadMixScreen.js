import React, { useState } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import { supabase } from "../lib/supabase";
import { LinearGradient } from "expo-linear-gradient";

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

export default function UploadMixScreen({ user, onBack, onUploadComplete }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedArtwork, setSelectedArtwork] = useState(null);
  const [selectedFileDuration, setSelectedFileDuration] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showDevBuildModal, setShowDevBuildModal] = useState(false);
  const slugify = (value) => {
    if (!value) return "untitled-mix";
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "untitled-mix";
  };
  const [mixData, setMixData] = useState({
    title: "",
    description: "",
    genre: "",
    isPublic: true,
    setAsPrimary: true, // Default to true for first-time uploaders
  });

  const genres = [
    "House",
    "Techno",
    "R&B",
    "Soul",
    "Hip-Hop",
    "Electronic",
    "Drum & Bass",
    "Dubstep",
    "Trance",
    "Deep House",
    "Tech House",
    "Disco",
    "Funk",
    "Other",
  ];

  const pickAudioFile = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

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
  };

  const pickArtworkImage = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

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
          type: asset.type || "image/jpeg",
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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
  };

  const uploadMix = async () => {
    if (!selectedFile) {
      Alert.alert("No File Selected", "Please select an audio file to upload");
      return;
    }

    if (!mixData.title.trim()) {
      Alert.alert("Title Required", "Please enter a title for your mix");
      return;
    }

    if (!selectedArtwork) {
      Alert.alert(
        "Artwork Required",
        "Please select artwork for your mix before uploading."
      );
      return;
    }

    if (!user?.id) {
      Alert.alert("Error", "You must be logged in to upload mixes");
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Debug: Log file structure
      console.log("Selected file:", {
        name: selectedFile.name,
        hasUri: !!selectedFile.uri,
        hasFileCopyUri: !!selectedFile.fileCopyUri,
        size: selectedFile.size,
        type: selectedFile.mimeType,
      });

      // Validate audio file format - Only MP3 or WAV allowed
      const fileExt = selectedFile.name.split(".").pop().toLowerCase();
      const validFormats = ["mp3", "wav"];
      if (!validFormats.includes(fileExt)) {
        Alert.alert(
          "Invalid Format",
          "Please select an MP3 or WAV audio file only."
        );
        setUploading(false);
        return;
      }

      const maxDurationMillis = 10 * 60 * 1000; // 10 minutes
      let effectiveDurationMillis = selectedFileDuration;

      if (
        (!effectiveDurationMillis || effectiveDurationMillis === 0) &&
        Audio?.Sound?.createAsync
      ) {
        try {
          const { sound } = await Audio.Sound.createAsync(
            { uri: selectedFile.uri || selectedFile.fileCopyUri },
            { shouldPlay: false }
          );
          const status = await sound.getStatusAsync();
          await sound.unloadAsync();
          if (status.isLoaded && status.durationMillis) {
            effectiveDurationMillis = status.durationMillis;
            setSelectedFileDuration(status.durationMillis);
          }
        } catch (durationError) {
          console.warn("⚠️ Unable to confirm mix duration:", durationError);
        }
      }

      if (effectiveDurationMillis && effectiveDurationMillis > maxDurationMillis) {
        Alert.alert(
          "Mix Too Long",
          "This mix is longer than 10 minutes. Please upload a shorter mix."
        );
        setUploading(false);
        return;
      }

      // Create unique filename with random string to prevent conflicts
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(6);
      const mixSlug = slugify(mixData.title || selectedFile.name);
      const fileName = `${user.id}/audio/${timestamp}_${mixSlug}_${randomStr}.${fileExt}`;

      setUploadProgress(10);

      // Get file URI - DocumentPicker provides this
      const fileUri = selectedFile.uri || selectedFile.fileCopyUri;
      if (!fileUri) {
        throw new Error(
          "File URI not found. Please try selecting the file again."
        );
      }

      console.log("📁 File URI:", fileUri);
      console.log("📁 File size:", selectedFile.size);
      console.log("📁 MIME type:", selectedFile.mimeType);

      setUploadProgress(20);

      // For React Native, we need to create a FormData-compatible file object
      // Supabase client can handle the ArrayBuffer directly
      let fileData;
      try {
        const response = await fetch(fileUri);
        const arrayBuffer = await response.arrayBuffer();
        fileData = new Uint8Array(arrayBuffer);

        console.log(
          "✅ Converted to Uint8Array, size:",
          fileData.length,
          "bytes"
        );

        if (fileData.length === 0) {
          throw new Error("File appears to be empty");
        }

        if (fileData.length !== selectedFile.size) {
          console.warn(
            `⚠️ Size mismatch: expected ${selectedFile.size}, got ${fileData.length}`
          );
        }
      } catch (conversionError) {
        console.error("❌ File conversion error:", conversionError);
        throw new Error("Failed to read audio file. Please try again.");
      }

      setUploadProgress(30);

      // Upload audio file to Supabase Storage with the Uint8Array
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("mixes")
        .upload(fileName, fileData, {
          contentType: selectedFile.mimeType || "audio/mpeg",
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("❌ Upload error:", uploadError);

        // Provide user-friendly error messages
        if (
          uploadError.message.includes("exceeded maximum size") ||
          uploadError.message.includes("too large") ||
          uploadError.message.includes("file size limit") ||
          uploadError.message.includes("Object exceeded maximum size")
        ) {
          const fileSizeMB = (selectedFile.size / 1024 / 1024).toFixed(2);
          throw new Error(
            `File too large: ${fileSizeMB}MB.\n\n` +
              `The storage bucket may have a lower limit configured.\n\n` +
              `To fix this:\n` +
              `1. Go to Supabase Dashboard > Storage > mixes bucket\n` +
              `2. Click Settings and update "File size limit" to 5120 MB (5GB)\n` +
              `3. Try uploading again\n\n` +
              `Or check: database/check-and-fix-mixes-bucket-limit.sql`
          );
        } else if (uploadError.message.includes("quota")) {
          throw new Error(
            "Storage quota exceeded. Please delete some old mixes or contact support."
          );
        } else {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }
      }

      setUploadProgress(40);

      // Upload artwork if selected
      let artworkUrl = null;
      if (selectedArtwork) {
        try {
          const artworkSourceName =
            selectedArtwork.name ||
            selectedArtwork.fileName ||
            selectedArtwork.uri ||
            "artwork";
          const rawArtworkExt = artworkSourceName.includes(".")
            ? artworkSourceName.split(".").pop()
            : "jpg";
          const safeArtworkExt =
            rawArtworkExt
              ?.toLowerCase()
              .replace(/[^a-z0-9]/g, "") || "jpg";
          const mixSlug = slugify(mixData.title || selectedFile.name);
          const artworkFileName = `${user.id}/artwork/${timestamp}_${mixSlug}_${randomStr}.${safeArtworkExt}`;

          console.log("🖼️ Uploading artwork:", selectedArtwork.name);

          // Convert artwork to Uint8Array (same as audio fix)
          let artworkData;
          let contentType = selectedArtwork.type || "image/jpeg";

          if (selectedArtwork.uri) {
            // Image picker format - convert URI to Uint8Array
            const response = await fetch(selectedArtwork.uri);
            const arrayBuffer = await response.arrayBuffer();
            artworkData = new Uint8Array(arrayBuffer);
            contentType = selectedArtwork.type || "image/jpeg";

            console.log(
              "✅ Artwork converted to Uint8Array, size:",
              artworkData.length,
              "bytes"
            );
          } else {
            // Document picker format - convert to Uint8Array
            const response = await fetch(
              selectedArtwork.uri || selectedArtwork.fileCopyUri
            );
            const arrayBuffer = await response.arrayBuffer();
            artworkData = new Uint8Array(arrayBuffer);
            contentType = selectedArtwork.mimeType || "image/jpeg";
          }

          const { data: artworkUploadData, error: artworkUploadError } =
            await supabase.storage
              .from("mixes")
              .upload(artworkFileName, artworkData, {
                contentType: contentType,
                cacheControl: "3600",
                upsert: false,
              });

          if (artworkUploadError) {
            console.error(
              "❌ Artwork upload error:",
              artworkUploadError.message
            );
            // Continue without artwork rather than failing the entire upload
          } else {
            const { data: artworkUrlData } = supabase.storage
              .from("mixes")
              .getPublicUrl(artworkFileName);
            artworkUrl = artworkUrlData.publicUrl;
            console.log("✅ Artwork uploaded successfully:", artworkUrl);
          }
        } catch (artworkError) {
          console.error("❌ Error processing artwork:", artworkError.message);
          // Continue without artwork rather than failing the entire upload
        }
      }

      setUploadProgress(60);

      // Get public URL for audio file
      const { data: urlData } = supabase.storage
        .from("mixes")
        .getPublicUrl(fileName);

      setUploadProgress(70);

      // Get user profile to get DJ name for artist field
      const { data: userProfile, error: profileError } = await supabase
        .from("user_profiles")
        .select("id, dj_name, first_name, last_name")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Error fetching user profile:", profileError);
        throw new Error(
          "User profile not found. Please complete your profile first."
        );
      }

      // Determine artist name from profile
      const artistName =
        userProfile.dj_name ||
        `${userProfile.first_name || ""} ${
          userProfile.last_name || ""
        }`.trim() ||
        "Unknown Artist";

      setUploadProgress(80);

      // Save mix metadata to database - matching actual schema
      const { data: mixRecord, error: dbError } = await supabase
        .from("mixes")
        .insert({
          user_id: userProfile.id,
          artist: artistName,
          title: mixData.title.trim(),
          description: mixData.description.trim() || null,
          genre: mixData.genre || "Electronic",
          file_name: selectedFile.name, // Original filename
          file_url: urlData.publicUrl,
          file_size: selectedFile.size,
          artwork_url: artworkUrl,
          is_public: mixData.isPublic,
          play_count: 0,
          likes_count: 0,
          duration: null, // Will be calculated on first play
        })
        .select()
        .single();

      if (dbError) {
        console.error("Database insert error:", dbError);
        // If database insert fails, try to delete uploaded files
        try {
          await supabase.storage.from("mixes").remove([fileName]);
          if (artworkUrl) {
            const artworkPath = artworkUrl.split("/mixes/")[1];
            if (artworkPath) {
              await supabase.storage.from("mixes").remove([artworkPath]);
            }
          }
        } catch (cleanupError) {
          console.error("Cleanup error:", cleanupError);
        }
        throw dbError;
      }

      // Keep Studio and mobile clients in sync by updating shared image_url column
      if (artworkUrl && mixRecord?.id) {
        const { error: imageSyncError } = await supabase
          .from("mixes")
          .update({ image_url: artworkUrl })
          .eq("id", mixRecord.id);

        if (imageSyncError) {
          console.error(
            "❌ Failed to sync artwork to image_url column:",
            imageSyncError
          );
        } else {
          console.log("✅ Synced artwork URL to image_url column");
        }
      }

      setUploadProgress(100);

      // Set as primary mix if requested
      if (mixData.setAsPrimary && mixRecord) {
        try {
          const { db } = await import("../lib/supabase");
          await db.setPrimaryMix(user.id, mixRecord.id);
          console.log("✅ Set as primary mix:", mixRecord.id);
        } catch (primaryError) {
          console.error("❌ Error setting primary mix:", primaryError);
          // Don't fail the upload if setting primary fails
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(
        "Success!",
        "Your mix has been uploaded successfully" +
          (mixData.setAsPrimary ? " and set as your primary mix!" : "!"),
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Upload Failed",
        error.message || "Failed to upload mix. Please try again."
      );
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setSelectedFileDuration(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

const formatDuration = (millis) => {
  if (!millis) return "0:00";
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onBack}
            style={styles.backButton}
            disabled={uploading}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.tsBlockBoldHeading}>UPLOAD MIX</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* File Picker */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Audio File</Text>
          <TouchableOpacity
            style={styles.filePickerButton}
            onPress={pickAudioFile}
            disabled={uploading}
          >
            <Ionicons
              name={selectedFile ? "musical-note" : "cloud-upload-outline"}
              size={32}
              color="hsl(75, 100%, 60%)"
            />
            {selectedFile ? (
              <View style={styles.fileInfo}>
                <Text style={styles.fileName}>{selectedFile.name}</Text>
                <Text style={styles.fileSize}>
                  {formatFileSize(selectedFile.size)}
                </Text>
                {selectedFileDuration ? (
                  <Text style={styles.fileSize}>
                    Duration: {formatDuration(selectedFileDuration)}
                  </Text>
                ) : null}
              </View>
            ) : (
              <View style={styles.filePickerGuidelines}>
                <Text style={styles.filePickerText}>
                  Tap to select your mix (MP3, max 10 minutes)
                </Text>
                <Text style={styles.filePickerSubtext}>
                  MP3 uploads finish faster and are more reliable than WAV.
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Artwork Picker */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Artwork (Optional)</Text>
          <TouchableOpacity
            style={styles.filePickerButton}
            onPress={pickArtworkImage}
            disabled={uploading}
          >
            <Ionicons
              name={selectedArtwork ? "image" : "image-outline"}
              size={32}
              color="hsl(75, 100%, 60%)"
            />
            {selectedArtwork ? (
              <View style={styles.fileInfo}>
                <Text style={styles.fileName}>{selectedArtwork.name}</Text>
                <Text style={styles.fileSize}>
                  {formatFileSize(selectedArtwork.size)}
                </Text>
              </View>
            ) : (
              <Text style={styles.filePickerText}>
                Tap to select artwork from photos
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Mix Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mix Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter mix title"
              placeholderTextColor="hsl(0, 0%, 40%)"
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
              placeholderTextColor="hsl(0, 0%, 40%)"
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
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.genreScroll}
            >
              {genres.map((genre) => (
                <TouchableOpacity
                  key={genre}
                  style={[
                    styles.genreChip,
                    mixData.genre === genre && styles.genreChipSelected,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setMixData((prev) => ({
                      ...prev,
                      genre: prev.genre === genre ? "" : genre,
                    }));
                  }}
                  disabled={uploading}
                >
                  <Text
                    style={[
                      styles.genreChipText,
                      mixData.genre === genre && styles.genreChipTextSelected,
                    ]}
                  >
                    {genre}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setMixData((prev) => ({ ...prev, isPublic: !prev.isPublic }));
              }}
              disabled={uploading}
            >
              <View style={styles.toggleLeft}>
                <Ionicons
                  name={
                    mixData.isPublic ? "globe-outline" : "lock-closed-outline"
                  }
                  size={20}
                  color="white"
                />
                <Text style={styles.toggleLabel}>
                  {mixData.isPublic ? "Public" : "Private"}
                </Text>
              </View>
              <View
                style={[styles.toggle, mixData.isPublic && styles.toggleActive]}
              >
                <View
                  style={[
                    styles.toggleThumb,
                    mixData.isPublic && styles.toggleThumbActive,
                  ]}
                />
              </View>
            </TouchableOpacity>
            <Text style={styles.toggleHint}>
              {mixData.isPublic
                ? "Everyone can see and play this mix"
                : "Only you can see this mix"}
            </Text>
          </View>

          {/* Set as Primary Mix Toggle */}
          <View style={styles.inputGroup}>
            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setMixData((prev) => ({
                  ...prev,
                  setAsPrimary: !prev.setAsPrimary,
                }));
              }}
              disabled={uploading}
            >
              <View style={styles.toggleLeft}>
                <Ionicons
                  name={mixData.setAsPrimary ? "star" : "star-outline"}
                  size={20}
                  color={mixData.setAsPrimary ? "hsl(75, 100%, 60%)" : "white"}
                />
                <Text style={styles.toggleLabel}>Set as Primary Mix</Text>
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
            <Text style={styles.toggleHint}>
              {mixData.setAsPrimary
                ? "This mix will be featured on your profile"
                : "This mix won't be your primary mix"}
            </Text>
          </View>
        </View>

        {/* Upload Button */}
        <TouchableOpacity
          style={[
            styles.uploadButton,
            uploading && styles.uploadButtonDisabled,
          ]}
          onPress={uploadMix}
          disabled={uploading || !selectedFile}
        >
          <LinearGradient
            colors={
              uploading || !selectedFile
                ? ["hsl(0, 0%, 20%)", "hsl(0, 0%, 15%)"]
                : ["hsl(75, 100%, 60%)", "hsl(75, 100%, 50%)"]
            }
            style={styles.uploadButtonGradient}
          >
            {uploading ? (
              <View style={styles.uploadingContent}>
                <ActivityIndicator color="white" />
                <Text style={styles.uploadButtonText}>
                  Uploading... {uploadProgress}%
                </Text>
              </View>
            ) : (
              <>
                <Ionicons name="cloud-upload" size={24} color="black" />
                <Text style={styles.uploadButtonText}>Upload Mix</Text>
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
              color="hsl(75, 100%, 60%)"
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
                colors={["hsl(75, 100%, 60%)", "hsl(75, 100%, 50%)"]}
                style={styles.modalButtonGradient}
              >
                <Text style={styles.modalButtonText}>OK</Text>
              </LinearGradient>
            </TouchableOpacity>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  tsBlockBoldHeading: {
    fontFamily: "TS-Block-Bold",
    fontSize: 22,
    color: "#FFFFFF", // Brand white
    textAlign: "left", // Left aligned as per guidelines
    textTransform: "uppercase", // Always uppercase
    lineHeight: 26, // Tight line height for stacked effect
    letterSpacing: 1, // Slight spacing for impact
    marginBottom: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "hsl(75, 100%, 60%)",
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  filePickerButton: {
    backgroundColor: "hsl(0, 0%, 10%)",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "hsl(0, 0%, 20%)",
    borderStyle: "dashed",
  },
  filePickerText: {
    color: "hsl(0, 0%, 60%)",
    fontSize: 16,
    marginTop: 12,
  },
  filePickerGuidelines: {
    alignItems: "center",
    marginTop: 12,
  },
  filePickerSubtext: {
    color: "hsl(0, 0%, 45%)",
    fontSize: 12,
    marginTop: 6,
    textAlign: "center",
  },
  fileInfo: {
    marginTop: 12,
    alignItems: "center",
  },
  fileName: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  fileSize: {
    color: "hsl(0, 0%, 60%)",
    fontSize: 14,
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "hsl(0, 0%, 10%)",
    borderRadius: 8,
    padding: 12,
    color: "white",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 20%)",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  genreScroll: {
    flexGrow: 0,
  },
  genreChip: {
    backgroundColor: "hsl(0, 0%, 10%)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 20%)",
  },
  genreChipSelected: {
    backgroundColor: "hsl(75, 100%, 60%)",
    borderColor: "hsl(75, 100%, 60%)",
  },
  genreChipText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
  },
  genreChipTextSelected: {
    color: "black",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "hsl(0, 0%, 10%)",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 20%)",
  },
  toggleLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  toggleLabel: {
    color: "white",
    fontSize: 16,
    marginLeft: 8,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: "hsl(0, 0%, 20%)",
    padding: 2,
  },
  toggleActive: {
    backgroundColor: "hsl(75, 100%, 60%)",
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "white",
  },
  toggleThumbActive: {
    alignSelf: "flex-end",
  },
  toggleHint: {
    color: "hsl(0, 0%, 60%)",
    fontSize: 12,
    marginTop: 8,
  },
  uploadButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 12,
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  uploadButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 8,
  },
  uploadButtonText: {
    color: "black",
    fontSize: 18,
    fontWeight: "bold",
  },
  uploadingContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
  modalButton: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
  },
  modalButtonGradient: {
    padding: 14,
    alignItems: "center",
  },
  modalButtonText: {
    color: "black",
    fontSize: 16,
    fontWeight: "bold",
  },
});
