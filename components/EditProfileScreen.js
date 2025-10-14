import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { db, supabase } from "../lib/supabase";
import RhoodModal from "./RhoodModal";

export default function EditProfileScreen({ user, onSave, onCancel }) {
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
    city: "",
    bio: "",
    genres: [],
    profile_image_url: null,
  });
  const [errors, setErrors] = useState({});
  const [showGenreModal, setShowGenreModal] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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
          city: userProfile.city || "",
          bio: userProfile.bio || "",
          genres: userProfile.genres || [],
          profile_image_url: userProfile.profile_image_url || null,
        });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      Alert.alert("Error", "Failed to load profile data");
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

    if (profile.instagram && !isValidUrl(profile.instagram)) {
      newErrors.instagram = "Please enter a valid Instagram URL";
    }

    if (profile.soundcloud && !isValidUrl(profile.soundcloud)) {
      newErrors.soundcloud = "Please enter a valid SoundCloud URL";
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
      Alert.alert("Validation Error", "Please fix the errors before saving");
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

      if (profile.bio && profile.bio.trim()) {
        updatedProfile.bio = profile.bio.trim();
      } else if (profile.city && profile.genres.length > 0) {
        updatedProfile.bio = `DJ from ${
          profile.city
        } specializing in ${profile.genres.join(", ")}`;
      }

      if (profile.profile_image_url) {
        updatedProfile.profile_image_url = profile.profile_image_url;
      }

      console.log("📝 Updating profile with:", updatedProfile);
      await db.updateUserProfile(user.id, updatedProfile);

      // Show success modal
      setShowSuccessModal(true);
    } catch (error) {
      console.error("❌ Error updating profile:", error);
      Alert.alert(
        "Error",
        `Failed to update profile: ${error.message || "Please try again."}`
      );
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

  const handleGenreToggle = (genre) => {
    setProfile((prev) => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter((g) => g !== genre)
        : [...prev.genres, genre],
    }));
  };

  const handleImagePicker = () => {
    Alert.alert(
      "Select Profile Image",
      "Choose how you want to add a profile image",
      [
        { text: "Camera", onPress: () => openImagePicker("camera") },
        { text: "Photo Library", onPress: () => openImagePicker("library") },
        {
          text: "Remove Image",
          onPress: () =>
            setProfile((prev) => ({ ...prev, profile_image_url: null })),
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
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
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
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
          Alert.alert(
            "Upload Error",
            "Failed to upload image. Please try again."
          );
        } finally {
          setLoading(false);
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to select image");
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
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
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
              {loading ? "Uploading..." : "Tap to change photo"}
            </Text>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
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
  },
  placeholderImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "hsl(0, 0%, 10%)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "hsl(0, 0%, 20%)",
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
});
