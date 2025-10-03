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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { supabase } from "../lib/supabase";
import { LinearGradient } from "expo-linear-gradient";

// Conditionally import DocumentPicker
let DocumentPicker;
try {
  DocumentPicker = require("expo-document-picker");
} catch (e) {
  console.log("DocumentPicker not available in Expo Go");
}

export default function UploadMixScreen({ user, onBack, onUploadComplete }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showDevBuildModal, setShowDevBuildModal] = useState(false);
  const [mixData, setMixData] = useState({
    title: "",
    description: "",
    genre: "",
    isPublic: true,
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

        // Check file size (max 500MB)
        if (file.size > 500 * 1024 * 1024) {
          Alert.alert(
            "File Too Large",
            "Please select a file smaller than 500MB"
          );
          return;
        }

        setSelectedFile(file);

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

  const uploadMix = async () => {
    if (!selectedFile) {
      Alert.alert("No File Selected", "Please select an audio file to upload");
      return;
    }

    if (!mixData.title.trim()) {
      Alert.alert("Title Required", "Please enter a title for your mix");
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

      // Create unique filename
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload file directly to Supabase Storage
      // In React Native, we can pass the file URI directly
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("mixes")
        .upload(fileName, selectedFile, {
          contentType: selectedFile.mimeType || "audio/mpeg",
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      setUploadProgress(50);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("mixes")
        .getPublicUrl(fileName);

      setUploadProgress(75);

      // Get user's DJ name for the artist field
      const { data: userProfile } = await supabase
        .from("user_profiles")
        .select("dj_name")
        .eq("id", user.id)
        .single();

      // Save mix metadata to database
      // Using the actual schema from your database
      const { data: mixRecord, error: dbError } = await supabase
        .from("mixes")
        .insert({
          title: mixData.title.trim(),
          artist:
            userProfile?.dj_name ||
            user.email?.split("@")[0] ||
            "Unknown Artist",
          genre: mixData.genre || "Electronic",
          description: mixData.description.trim() || null,
          file_url: urlData.publicUrl,
          file_name: selectedFile.name,
          file_size: selectedFile.size,
          uploaded_by: user.id,
          user_id: user.id,
          is_public: mixData.isPublic,
          status: "active",
          plays: 0,
          rating: 0.0,
        })
        .select()
        .single();

      if (dbError) {
        // If database insert fails, try to delete the uploaded file
        await supabase.storage.from("mixes").remove([fileName]);
        throw dbError;
      }

      setUploadProgress(100);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert("Success!", "Your mix has been uploaded successfully", [
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
      ]);
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
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
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
          <Text style={styles.headerTitle}>UPLOAD MIX</Text>
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
              </View>
            ) : (
              <Text style={styles.filePickerText}>
                Tap to select audio file
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
    paddingBottom: 40,
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
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    letterSpacing: 1,
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
