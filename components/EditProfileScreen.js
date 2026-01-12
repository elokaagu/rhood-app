import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { db, supabase } from "../lib/supabase";
import RhoodModal from "./RhoodModal";

// Duration extraction utilities (same as ListenScreen)
const parseDurationString = (value) => {
  if (value == null || value === undefined) return null;
  
  if (typeof value === "number") {
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
    return null;
  }
  
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
    if (typeof source === "number" && Number.isFinite(source) && source > 0) {
      return Math.round(source);
    }
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

export default function EditProfileScreen({ user, onSave, onCancel }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    dj_name: "",
    first_name: "",
    last_name: "",
    username: "",
    phone: "",
    instagram: "",
    soundcloud: "",
    tiktok: "",
    youtube: "",
    city: "",
    bio: "",
    status_message: "",
    genres: [],
    profile_image_url: null,
  });
  const [errors, setErrors] = useState({});
  const [showGenreModal, setShowGenreModal] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorModal, setErrorModal] = useState({ visible: false, title: "", message: "" });
  const [userMixes, setUserMixes] = useState([]);
  const [showMixSelection, setShowMixSelection] = useState(false);
  const [selectingMix, setSelectingMix] = useState(false);
  const [currentPrimaryMix, setCurrentPrimaryMix] = useState(null);

  // Available genres for selection
  const availableGenres = [
    "House",
    "Techno",
    "Deep House",
    "Progressive House",
    "Tech House",
    "Trance",
    "Drum & Bass",
    "Dubstep",
    "Trap",
    "Future Bass",
    "Ambient",
    "Downtempo",
    "Breakbeat",
    "Jungle",
    "Garage",
    "Disco",
    "Funk",
    "Soul",
    "Hip Hop",
    "R&B",
    "Pop",
    "Rock",
    "Electronic",
    "Experimental",
    "Minimal",
    "Acid",
    "Hardcore",
    "Hardstyle",
    "Psytrance",
    "Goa",
    "Chillout",
    "Lounge",
  ];

  useEffect(() => {
    loadUserProfile();
  }, [user]);

  const loadUserProfile = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const userProfile = await db.getUserProfile(user.id);

      if (userProfile) {
        setProfile({
          dj_name: userProfile.dj_name || "",
          first_name: userProfile.first_name || "",
          last_name: userProfile.last_name || "",
          username: userProfile.username || "",
          phone: userProfile.phone || "",
          instagram: userProfile.instagram || "",
          soundcloud: userProfile.soundcloud || "",
          tiktok: userProfile.tiktok || "",
          youtube: userProfile.youtube || "",
          city: userProfile.city || "",
          bio: userProfile.bio || "",
          status_message: userProfile.status_message || "",
          genres: userProfile.genres || [],
          profile_image_url: userProfile.profile_image_url || null,
        });

        // Load user's mixes for Audio ID selection
        try {
          const mixes = await db.getUserMixes(user.id);
          
          // Extract and normalize duration for each mix
          const mixesWithDuration = mixes.map((mix) => {
            const durationSeconds = extractDurationSeconds(mix);
            return {
              ...mix,
              duration: durationSeconds,
              durationFormatted: formatDurationLabel(durationSeconds),
            };
          });
          
          setUserMixes(mixesWithDuration);

          // Set current primary mix if exists
          if (userProfile.primary_mix_id) {
            const primaryMix = mixesWithDuration.find(
              (mix) => mix.id === userProfile.primary_mix_id
            );
            setCurrentPrimaryMix(primaryMix || null);
          }
        } catch (mixesError) {
          console.error("❌ Error loading user mixes:", mixesError);
          setUserMixes([]);
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      setErrorModal({ visible: true, title: "Error", message: "Failed to load profile data" });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!profile.dj_name.trim()) {
      newErrors.dj_name = "DJ name is required";
    } else if (profile.dj_name.length < 2) {
      newErrors.dj_name = "DJ name must be at least 2 characters";
    }

    if (!profile.first_name.trim()) {
      newErrors.first_name = "First name is required";
    } else if (profile.first_name.length < 2) {
      newErrors.first_name = "First name must be at least 2 characters";
    }

    if (!profile.last_name.trim()) {
      newErrors.last_name = "Last name is required";
    } else if (profile.last_name.length < 2) {
      newErrors.last_name = "Last name must be at least 2 characters";
    }

    if (!profile.city.trim()) {
      newErrors.city = "City is required";
    }

    if (profile.genres.length === 0) {
      newErrors.genres = "Please select at least one genre";
    }

    // Profile picture is required
    if (!profile.profile_image_url) {
      newErrors.profile_image_url = "Profile picture is required";
    }

    if (profile.status_message && profile.status_message.length > 80) {
      newErrors.status_message = "Status must be 80 characters or fewer";
    }

    if (profile.instagram && !isValidUrl(profile.instagram)) {
      newErrors.instagram = "Please enter a valid Instagram URL";
    }

    if (profile.soundcloud && !isValidUrl(profile.soundcloud)) {
      newErrors.soundcloud = "Please enter a valid SoundCloud URL";
    }
    if (profile.tiktok && !isValidUrl(profile.tiktok)) {
      newErrors.tiktok = "Please enter a valid TikTok handle or URL";
    }
    if (profile.youtube && !isValidUrl(profile.youtube)) {
      newErrors.youtube = "Please enter a valid YouTube URL";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      // Check specifically for profile picture error
      if (errors.profile_image_url) {
        setErrorModal({ 
          visible: true, 
          title: "Profile Picture Required", 
          message: "Please upload a profile picture before saving your profile." 
        });
      } else {
        setErrorModal({ visible: true, title: "Validation Error", message: "Please fix the errors before saving" });
      }
      return;
    }

    try {
      setSaving(true);

      // Build update object with only fields that have values
      const updatedProfile = {
        dj_name: profile.dj_name.trim(),
        city: profile.city.trim(),
        genres: profile.genres,
        updated_at: new Date().toISOString(),
      };

      // Add optional fields only if they have values
      if (profile.first_name && profile.first_name.trim()) {
        updatedProfile.first_name = profile.first_name.trim();
      }
      if (profile.last_name && profile.last_name.trim()) {
        updatedProfile.last_name = profile.last_name.trim();
      }

      if (profile.username && profile.username.trim()) {
        // Remove @ if user included it
        updatedProfile.username = profile.username.trim().replace(/^@/, "");
      }

      if (profile.phone && profile.phone.trim()) {
        updatedProfile.phone = profile.phone.trim();
      }

      if (profile.instagram && profile.instagram.trim()) {
        updatedProfile.instagram = profile.instagram.trim();
      }

      if (profile.soundcloud && profile.soundcloud.trim()) {
        updatedProfile.soundcloud = profile.soundcloud.trim();
      }

      if (profile.tiktok && profile.tiktok.trim()) {
        updatedProfile.tiktok = profile.tiktok.trim();
      }

      // YouTube column - temporarily commented out until column is added
      // Run database/add-youtube-column.sql in Supabase SQL Editor to add the column
      // Then uncomment the code below:
      // if (profile.youtube && profile.youtube.trim()) {
      //   updatedProfile.youtube = profile.youtube.trim();
      // }

      if (profile.bio && profile.bio.trim()) {
        updatedProfile.bio = profile.bio.trim();
      } else if (profile.city && profile.genres.length > 0) {
        updatedProfile.bio = `DJ from ${
          profile.city
        } specializing in ${profile.genres.join(", ")}`;
      }

      if (profile.status_message && profile.status_message.trim()) {
        updatedProfile.status_message = profile.status_message.trim();
      } else {
        updatedProfile.status_message = null;
      }

      if (profile.profile_image_url) {
        updatedProfile.profile_image_url = profile.profile_image_url;
      }

      // Explicitly remove youtube if it somehow got added (column doesn't exist yet)
      // Remove this safeguard after running database/add-youtube-column.sql
      if (updatedProfile.youtube !== undefined) {
        delete updatedProfile.youtube;
      }

      console.log("📝 Updating profile with:", updatedProfile);
      await db.updateUserProfile(user.id, updatedProfile);

      setProfile((prev) => ({
        ...prev,
        status_message: profile.status_message
          ? profile.status_message.trim()
          : "",
      }));

      // Show success modal
      setShowSuccessModal(true);
    } catch (error) {
      console.error("❌ Error updating profile:", error);
      setErrorModal({ 
        visible: true, 
        title: "Error", 
        message: `Failed to update profile: ${error.message || "Please try again."}` 
      });
      setSaving(false);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    setSaving(false);
    // Wait a bit for modal animation to complete before calling onSave
    setTimeout(() => {
      onSave && onSave(profile);
    }, 100);
  };

  const handleChangeAudioId = () => {
    if (userMixes.length === 0) {
      setErrorModal({ 
        visible: true, 
        title: "No Mixes Available", 
        message: "You need to upload some mixes first before you can set an Audio ID. Go to the Listen screen to upload your first mix!" 
      });
      return;
    }
    
    // If there's only one mix, show options to delete or upload another
    if (userMixes.length === 1 && currentPrimaryMix) {
      // Use RhoodModal for this case - we'll need to handle the actions differently
      // For now, just show the mix selection modal
      setShowMixSelection(true);
      return;
    }
    
    setShowMixSelection(true);
  };

  const handleSelectMix = async (mix) => {
    try {
      setSelectingMix(true);

      // Set as primary mix
      await db.setPrimaryMix(user.id, mix.id);

      // Update local state
      setCurrentPrimaryMix(mix);

      setShowMixSelection(false);
      setShowSuccessModal(true);
    } catch (error) {
      console.error("❌ Error setting primary mix:", error);
      setErrorModal({ visible: true, title: "Error", message: "Failed to update Audio ID. Please try again." });
    } finally {
      setSelectingMix(false);
    }
  };

  const handleDeleteAudioId = async () => {
    try {
      setSelectingMix(true);

      // Remove primary mix by setting it to null
      await db.setPrimaryMix(user.id, null);

      // Update local state
      setCurrentPrimaryMix(null);

      setShowSuccessModal(true);
    } catch (error) {
      console.error("❌ Error removing primary mix:", error);
      setErrorModal({ visible: true, title: "Error", message: "Failed to remove Audio ID. Please try again." });
    } finally {
      setSelectingMix(false);
    }
  };

  const handleGenreToggle = (genre) => {
    setProfile((prev) => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter((g) => g !== genre)
        : [...prev.genres, genre],
    }));
  };

  const handleImagePicker = () => {
    setShowImagePicker(true);
  };


  const uploadProfileImage = async (imageUri) => {
    try {
      console.log("📤 Uploading profile image...");

      // Generate unique filename
      const fileExt = imageUri.split(".").pop() || "jpg";
      const fileName = `profile_${user.id}_${Date.now()}.${fileExt}`;

      // Convert image to Uint8Array
      const response = await fetch(imageUri);
      const arrayBuffer = await response.arrayBuffer();
      const fileData = new Uint8Array(arrayBuffer);

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("mixes") // Using existing mixes bucket for now
        .upload(`profile_images/${fileName}`, fileData, {
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
        .getPublicUrl(`profile_images/${fileName}`);

      console.log("✅ Profile image uploaded:", urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      console.error("❌ Error uploading profile image:", error);
      throw error;
    }
  };

  const openImagePicker = async (source) => {
    try {
      let result;

      if (source === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setErrorModal({ visible: true, title: "Permission Required", message: "Camera permission is needed to take photos" });
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
          setErrorModal({ visible: true, title: "Permission Required", message: "Photo library permission is needed to select images" });
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
        setLoading(true);

        try {
          // Upload image to Supabase storage
          const publicUrl = await uploadProfileImage(localUri);

          // Update profile with public URL
          setProfile((prev) => ({
            ...prev,
            profile_image_url: publicUrl,
          }));

          console.log("✅ Profile image updated with URL:", publicUrl);
        } catch (uploadError) {
          console.error("❌ Failed to upload image:", uploadError);
          setErrorModal({ visible: true, title: "Upload Error", message: "Failed to upload image. Please try again." });
        } finally {
          setLoading(false);
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      setErrorModal({ visible: true, title: "Error", message: "Failed to select image" });
      setLoading(false);
    }
  };

  const renderGenreModal = () => (
    <Modal
      visible={showGenreModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowGenreModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Genres</Text>
            <TouchableOpacity onPress={() => setShowGenreModal(false)}>
              <Ionicons name="close" size={24} color="hsl(0, 0%, 100%)" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.genreList}>
            {availableGenres.map((genre) => (
              <TouchableOpacity
                key={genre}
                style={[
                  styles.genreItem,
                  profile.genres.includes(genre) && styles.genreItemSelected,
                ]}
                onPress={() => handleGenreToggle(genre)}
              >
                <Text
                  style={[
                    styles.genreText,
                    profile.genres.includes(genre) && styles.genreTextSelected,
                  ]}
                >
                  {genre}
                </Text>
                {profile.genres.includes(genre) && (
                  <Ionicons name="checkmark" size={20} color="hsl(0, 0%, 0%)" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setShowGenreModal(false)}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="hsl(75, 100%, 60%)" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Sticky Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Ionicons name="close" size={24} color="hsl(0, 0%, 100%)" />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Profile</Text>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="hsl(0, 0%, 0%)" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}
      >
        <View style={styles.content}>
          {/* Profile Image */}
          <View style={styles.imageSection}>
            <TouchableOpacity
              style={styles.imageContainer}
              onPress={handleImagePicker}
              disabled={loading}
            >
              {profile.profile_image_url ? (
                <Image
                  source={{ uri: profile.profile_image_url }}
                  style={styles.profileImage}
                />
              ) : (
                <View
                  style={[
                    styles.profileImage,
                    {
                      backgroundColor: "hsl(0, 0%, 15%)",
                      justifyContent: "center",
                      alignItems: "center",
                    },
                  ]}
                >
                  <Ionicons name="person" size={40} color="hsl(0, 0%, 50%)" />
                </View>
              )}
              <View style={styles.imageOverlay}>
                {loading ? (
                  <ActivityIndicator size="small" color="hsl(0, 0%, 100%)" />
                ) : (
                  <Ionicons name="camera" size={20} color="hsl(0, 0%, 100%)" />
                )}
              </View>
            </TouchableOpacity>
            <Text style={styles.imageLabel}>
              {loading ? "Uploading..." : "Profile Picture *"}
            </Text>
            {errors.profile_image_url && (
              <Text style={styles.errorText}>{errors.profile_image_url}</Text>
            )}
          </View>

          {/* Form Fields */}
          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>DJ Name *</Text>
              <TextInput
                style={[styles.input, errors.dj_name && styles.inputError]}
                value={profile.dj_name}
                onChangeText={(text) =>
                  setProfile((prev) => ({ ...prev, dj_name: text }))
                }
                placeholder="Your DJ name"
                placeholderTextColor="hsl(0, 0%, 50%)"
                maxLength={50}
              />
              {errors.dj_name && (
                <Text style={styles.errorText}>{errors.dj_name}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput
                style={[styles.input, errors.first_name && styles.inputError]}
                value={profile.first_name}
                onChangeText={(text) =>
                  setProfile((prev) => ({ ...prev, first_name: text }))
                }
                placeholder="Enter your first name"
                placeholderTextColor="hsl(0, 0%, 50%)"
                maxLength={50}
              />
              {errors.first_name && (
                <Text style={styles.errorText}>{errors.first_name}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Last Name *</Text>
              <TextInput
                style={[styles.input, errors.last_name && styles.inputError]}
                value={profile.last_name}
                onChangeText={(text) =>
                  setProfile((prev) => ({ ...prev, last_name: text }))
                }
                placeholder="Enter your last name"
                placeholderTextColor="hsl(0, 0%, 50%)"
                maxLength={50}
              />
              {errors.last_name && (
                <Text style={styles.errorText}>{errors.last_name}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={[styles.input, errors.phone && styles.inputError]}
                value={profile.phone}
                onChangeText={(text) =>
                  setProfile((prev) => ({ ...prev, phone: text }))
                }
                placeholder="Enter your phone number"
                placeholderTextColor="hsl(0, 0%, 50%)"
                keyboardType="phone-pad"
                maxLength={20}
              />
              {errors.phone && (
                <Text style={styles.errorText}>{errors.phone}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>City *</Text>
              <TextInput
                style={[styles.input, errors.city && styles.inputError]}
                value={profile.city}
                onChangeText={(text) =>
                  setProfile((prev) => ({ ...prev, city: text }))
                }
                placeholder="Your city"
                placeholderTextColor="hsl(0, 0%, 50%)"
                maxLength={50}
              />
              {errors.city && (
                <Text style={styles.errorText}>{errors.city}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Genres *</Text>
              <TouchableOpacity
                style={[
                  styles.genreSelector,
                  errors.genres && styles.inputError,
                ]}
                onPress={() => setShowGenreModal(true)}
              >
                <Text
                  style={[
                    styles.genreSelectorText,
                    profile.genres.length === 0 &&
                      styles.genreSelectorPlaceholder,
                  ]}
                >
                  {profile.genres.length === 0
                    ? "Select genres"
                    : `${profile.genres.length} genre${
                        profile.genres.length === 1 ? "" : "s"
                      } selected`}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color="hsl(0, 0%, 70%)"
                />
              </TouchableOpacity>
              {errors.genres && (
                <Text style={styles.errorText}>{errors.genres}</Text>
              )}

              {profile.genres.length > 0 && (
                <View style={styles.selectedGenres}>
                  {profile.genres.map((genre) => (
                    <View key={genre} style={styles.genreTag}>
                      <Text style={styles.genreTagText}>{genre}</Text>
                      <TouchableOpacity
                        onPress={() => handleGenreToggle(genre)}
                        style={styles.genreTagRemove}
                      >
                        <Ionicons
                          name="close"
                          size={16}
                          color="hsl(0, 0%, 100%)"
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Status / Tagline</Text>
            <TextInput
              style={[
                styles.input,
                errors.status_message && styles.inputError,
              ]}
              value={profile.status_message}
              onChangeText={(text) =>
                setProfile((prev) => ({ ...prev, status_message: text }))
              }
              placeholder="Add a short vibe or status (e.g. 'Spinning soulful house tonight')"
              placeholderTextColor="hsl(0, 0%, 50%)"
              maxLength={80}
            />
            <View style={styles.statusHelperRow}>
              <Text style={styles.statusCharCount}>
                {profile.status_message.length}/80
              </Text>
              <Text style={styles.statusHint}>Shown in lists & discovery</Text>
            </View>
            {errors.status_message && (
              <Text style={styles.errorText}>{errors.status_message}</Text>
            )}
          </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={profile.bio}
                onChangeText={(text) =>
                  setProfile((prev) => ({ ...prev, bio: text }))
                }
                placeholder="Tell us about yourself..."
                placeholderTextColor="hsl(0, 0%, 50%)"
                multiline
                numberOfLines={4}
                maxLength={500}
              />
              <Text style={styles.charCount}>{profile.bio.length}/500</Text>
            </View>

            {/* Audio ID Section */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Audio ID</Text>
              {currentPrimaryMix ? (
                <View style={styles.audioIdContainer}>
                  <View style={styles.audioIdInfo}>
                    <Text style={styles.audioIdTitle}>
                      {currentPrimaryMix.title}
                    </Text>
                    <Text style={styles.audioIdDetails}>
                      {currentPrimaryMix.genre || "Electronic"} •{" "}
                      {currentPrimaryMix.durationFormatted || 
                       (currentPrimaryMix.duration && Number.isFinite(currentPrimaryMix.duration) && currentPrimaryMix.duration > 0
                        ? formatDurationLabel(currentPrimaryMix.duration)
                        : "0:00")}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.audioIdButton}
                    onPress={handleChangeAudioId}
                  >
                    <Text style={styles.audioIdButtonText}>Change</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.audioIdEmptyContainer}>
                  <Ionicons
                    name="musical-notes-outline"
                    size={24}
                    color="hsl(0, 0%, 30%)"
                  />
                  <Text style={styles.audioIdEmptyText}>No Audio ID set</Text>
                  <TouchableOpacity
                    style={styles.audioIdButton}
                    onPress={handleChangeAudioId}
                  >
                    <Text style={styles.audioIdButtonText}>Select Mix</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Instagram</Text>
              <TextInput
                style={[styles.input, errors.instagram && styles.inputError]}
                value={profile.instagram}
                onChangeText={(text) => {
                  // Auto-prepend Instagram URL if user just enters handle
                  let processedText = text;
                  if (
                    text &&
                    !text.startsWith("http") &&
                    !text.startsWith("@")
                  ) {
                    processedText = `https://instagram.com/${text}`;
                  } else if (text && text.startsWith("@")) {
                    processedText = `https://instagram.com/${text.substring(
                      1
                    )}`;
                  }
                  setProfile((prev) => ({ ...prev, instagram: processedText }));
                }}
                placeholder="yourhandle"
                placeholderTextColor="hsl(0, 0%, 50%)"
                keyboardType="url"
                autoCapitalize="none"
              />
              {errors.instagram && (
                <Text style={styles.errorText}>{errors.instagram}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>SoundCloud</Text>
              <TextInput
                style={[styles.input, errors.soundcloud && styles.inputError]}
                value={profile.soundcloud}
                onChangeText={(text) => {
                  // Auto-prepend SoundCloud URL if user just enters handle
                  let processedText = text;
                  if (text && !text.startsWith("http")) {
                    processedText = `https://soundcloud.com/${text}`;
                  }
                  setProfile((prev) => ({
                    ...prev,
                    soundcloud: processedText,
                  }));
                }}
                placeholder="yourusername"
                placeholderTextColor="hsl(0, 0%, 50%)"
                keyboardType="url"
                autoCapitalize="none"
              />
              {errors.soundcloud && (
                <Text style={styles.errorText}>{errors.soundcloud}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>TikTok</Text>
              <TextInput
                style={[styles.input, errors.tiktok && styles.inputError]}
                value={profile.tiktok}
                onChangeText={(text) => {
                  // Auto-prepend TikTok URL if user just enters handle
                  let processedText = text;
                  if (text && !text.startsWith("http") && !text.startsWith("@")) {
                    processedText = `https://www.tiktok.com/@${text}`;
                  } else if (text && text.startsWith("@")) {
                    processedText = `https://www.tiktok.com/${text}`;
                  }
                  setProfile((prev) => ({
                    ...prev,
                    tiktok: processedText,
                  }));
                }}
                placeholder="yourhandle"
                placeholderTextColor="hsl(0, 0%, 50%)"
                keyboardType="url"
                autoCapitalize="none"
              />
              {errors.tiktok && (
                <Text style={styles.errorText}>{errors.tiktok}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>YouTube</Text>
              <TextInput
                style={[styles.input, errors.youtube && styles.inputError]}
                value={profile.youtube}
                onChangeText={(text) => {
                  // Auto-prepend YouTube URL if user just enters handle
                  let processedText = text;
                  if (text && !text.startsWith("http") && !text.startsWith("@") && !text.startsWith("youtube.com") && !text.startsWith("youtu.be")) {
                    processedText = `https://www.youtube.com/@${text}`;
                  } else if (text && text.startsWith("@")) {
                    processedText = `https://www.youtube.com/${text}`;
                  } else if (text && !text.startsWith("http") && (text.startsWith("youtube.com") || text.startsWith("youtu.be"))) {
                    processedText = `https://${text}`;
                  }
                  setProfile((prev) => ({
                    ...prev,
                    youtube: processedText,
                  }));
                }}
                placeholder="youtube.com/@yourchannel"
                placeholderTextColor="hsl(0, 0%, 50%)"
                keyboardType="url"
                autoCapitalize="none"
              />
              {errors.youtube && (
                <Text style={styles.errorText}>{errors.youtube}</Text>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {renderGenreModal()}

      {/* Success Modal */}
      <RhoodModal
        visible={showSuccessModal}
        onClose={handleSuccessModalClose}
        type="success"
        title="Profile Updated!"
        message="Your profile has been successfully updated and is now live."
        primaryButtonText="Done"
        onPrimaryPress={handleSuccessModalClose}
      />

      {/* Mix Selection Modal */}
      <Modal
        visible={showMixSelection}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMixSelection(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Audio ID</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowMixSelection(false)}
              >
                <Ionicons name="close" size={24} color="hsl(0, 0%, 100%)" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.mixList}>
              {userMixes.map((mix) => (
                <TouchableOpacity
                  key={mix.id}
                  style={styles.mixItem}
                  onPress={() => handleSelectMix(mix)}
                  disabled={selectingMix}
                >
                  <View style={styles.mixInfo}>
                    <Text style={styles.mixTitle}>{mix.title}</Text>
                    <Text style={styles.mixDetails}>
                      {mix.genre || "Electronic"} •{" "}
                      {mix.durationFormatted || 
                       (mix.duration && Number.isFinite(mix.duration) && mix.duration > 0
                        ? formatDurationLabel(mix.duration)
                        : "0:00")}
                    </Text>
                  </View>
                  {selectingMix ? (
                    <ActivityIndicator
                      size="small"
                      color="hsl(75, 100%, 60%)"
                    />
                  ) : (
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="hsl(0, 0%, 50%)"
                    />
                  )}
                </TouchableOpacity>
              ))}
              {userMixes.length === 1 && currentPrimaryMix && (
                <TouchableOpacity
                  style={[styles.mixItem, styles.deleteMixItem]}
                  onPress={() => {
                    setShowMixSelection(false);
                    handleDeleteAudioId();
                  }}
                  disabled={selectingMix}
                >
                  <View style={styles.mixInfo}>
                    <Text style={styles.deleteMixText}>Remove Audio ID</Text>
                    <Text style={styles.deleteMixSubtext}>
                      Delete your current Audio ID
                    </Text>
                  </View>
                  {selectingMix ? (
                    <ActivityIndicator
                      size="small"
                      color="hsl(0, 100%, 50%)"
                    />
                  ) : (
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color="hsl(0, 100%, 50%)"
                    />
                  )}
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Error Modal */}
      <RhoodModal
        visible={errorModal.visible}
        onClose={() => setErrorModal({ visible: false, title: "", message: "" })}
        title={errorModal.title}
        message={errorModal.message}
        type="error"
        primaryButtonText="OK"
        onPrimaryPress={() => setErrorModal({ visible: false, title: "", message: "" })}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 0%)",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "hsl(0, 0%, 0%)",
  },
  loadingText: {
    color: "hsl(0, 0%, 70%)",
    fontSize: 16,
    marginTop: 16,
    fontFamily: "Helvetica Neue",
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 200, // Extra padding to prevent content from being hidden behind bottom navigation and audio player
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
    backgroundColor: "hsl(0, 0%, 0%)",
    zIndex: 1000,
  },
  cancelButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
    color: "hsl(0, 0%, 100%)",
  },
  saveButton: {
    backgroundColor: "hsl(75, 100%, 60%)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "hsl(0, 0%, 0%)",
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
  },
  content: {
    padding: 20,
  },
  imageSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  imageContainer: {
    position: "relative",
    marginBottom: 8,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "hsl(75, 100%, 60%)", // R/HOOD green border
  },
  placeholderImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "hsl(0, 0%, 10%)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "hsl(75, 100%, 60%)", // R/HOOD green border
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "hsl(75, 100%, 60%)",
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  imageLabel: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
  },
  formSection: {
    gap: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "hsl(0, 0%, 10%)",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 100%)",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  inputError: {
    borderColor: "hsl(0, 100%, 50%)",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  errorText: {
    color: "hsl(0, 100%, 50%)",
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    marginTop: 4,
  },
  charCount: {
    color: "hsl(0, 0%, 50%)",
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    textAlign: "right",
    marginTop: 4,
  },
  statusHelperRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    gap: 12,
  },
  statusHint: {
    color: "hsl(0, 0%, 45%)",
    fontSize: 12,
    fontFamily: "Helvetica Neue",
  },
  statusCharCount: {
    color: "hsl(0, 0%, 50%)",
    fontSize: 12,
    fontFamily: "Helvetica Neue",
  },
  genreSelector: {
    backgroundColor: "hsl(0, 0%, 10%)",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  genreSelectorText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 100%)",
  },
  genreSelectorPlaceholder: {
    color: "hsl(0, 0%, 50%)",
  },
  selectedGenres: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    gap: 8,
  },
  genreTag: {
    backgroundColor: "hsl(75, 100%, 60%)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  genreTagText: {
    color: "hsl(0, 0%, 0%)",
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    fontWeight: "500",
  },
  genreTagRemove: {
    backgroundColor: "hsl(0, 0%, 0%)",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "hsl(0, 0%, 5%)",
    borderRadius: 12,
    width: "90%",
    maxHeight: "80%",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
    color: "hsl(0, 0%, 100%)",
  },
  genreList: {
    maxHeight: 400,
    padding: 20,
  },
  genreItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "hsl(0, 0%, 10%)",
  },
  genreItemSelected: {
    backgroundColor: "hsl(75, 100%, 60%)",
  },
  genreText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 100%)",
  },
  genreTextSelected: {
    color: "hsl(0, 0%, 0%)",
    fontWeight: "600",
  },
  modalActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "hsl(0, 0%, 15%)",
  },
  doneButton: {
    backgroundColor: "hsl(75, 100%, 60%)",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  doneButtonText: {
    color: "hsl(0, 0%, 0%)",
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
  },
  // Audio ID Styles
  audioIdContainer: {
    backgroundColor: "hsl(0, 0%, 10%)",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  audioIdInfo: {
    flex: 1,
  },
  audioIdTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 4,
  },
  audioIdDetails: {
    fontSize: 14,
    color: "hsl(0, 0%, 60%)",
  },
  audioIdButton: {
    backgroundColor: "hsl(75, 100%, 60%)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  audioIdButtonText: {
    color: "hsl(0, 0%, 0%)",
    fontSize: 14,
    fontWeight: "600",
  },
  audioIdEmptyContainer: {
    backgroundColor: "hsl(0, 0%, 10%)",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
    minHeight: 60,
  },
  audioIdEmptyText: {
    fontSize: 14,
    color: "hsl(0, 0%, 60%)",
    marginTop: 8,
    marginBottom: 12,
  },
  // Mix Selection Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "hsl(0, 0%, 100%)",
    fontFamily: "TS Block Bold",
  },
  modalCloseButton: {
    padding: 4,
  },
  mixList: {
    maxHeight: 400,
  },
  mixItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 12%)",
  },
  mixInfo: {
    flex: 1,
  },
  mixTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 4,
  },
  mixDetails: {
    fontSize: 14,
    color: "hsl(0, 0%, 60%)",
  },
  deleteMixItem: {
    borderTopWidth: 1,
    borderTopColor: "hsl(0, 0%, 15%)",
    marginTop: 8,
  },
  deleteMixText: {
    fontSize: 16,
    fontWeight: "600",
    color: "hsl(0, 100%, 50%)",
    marginBottom: 4,
  },
  deleteMixSubtext: {
    fontSize: 14,
    color: "hsl(0, 0%, 60%)",
  },
});
