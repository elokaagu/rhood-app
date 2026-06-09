import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Image,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  uploadOnboardingProfileImage,
  normalizeInstagramOnBlur,
  normalizeSoundCloudOnBlur,
  normalizeTikTokOnBlur,
  normalizeYouTubeOnBlur,
  normalizedSocialProfileForValidation,
} from "../lib/onboardingHelpers";

/** Shared animated wrapper for each onboarding step (fade + slide). */
function StepAnimatedShell({ fadeAnim, slideAnim, style, children }) {
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

// Music genres for selection — ordered by popularity/breadth first
const MUSIC_GENRES = [
  // Core urban / crossover (most requested additions)
  "Hip-Hop",
  "R&B",
  "Soul",
  "Afrobeats",
  "Dancehall",
  "Reggae",
  "Funk",
  "Jazz",
  // Electronic / club
  "House",
  "Tech House",
  "Deep House",
  "Techno",
  "Drum & Bass",
  "Garage",
  "Jungle",
  "Dubstep",
  "Trance",
  "Psytrance",
  "Hardstyle",
  "Hardcore",
  "Breakbeat",
  // Electronic production
  "Electronic",
  "Electro",
  "Synthwave",
  "Ambient",
  "Downtempo",
  "Future Bass",
  "Trap",
  "Progressive",
  "Minimal",
  "Industrial",
];


export default function OnboardingForm({
  onComplete,
  djProfile,
  setDjProfile,
  onSignOut,
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const [errors, setErrors] = useState({});
  const [profileImage, setProfileImage] = useState(null);       // public URL after successful upload
  const [localImageUri, setLocalImageUri] = useState(null);     // local URI for immediate preview
  const [pendingUpload, setPendingUpload] = useState(null);     // { uri, mimeType } waiting to retry
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [customGenreInput, setCustomGenreInput] = useState("");  // typed custom genre

  const totalSteps = 4;

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentStep]);

  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 1:
        // DJ name is always required
        if (!djProfile.dj_name?.trim()) {
          newErrors.dj_name = "DJ name is required";
        }
        // First / last name and city only required when blank (social sign-in users
        // may not have provided them; email sign-up already collected these)
        if (!djProfile.first_name?.trim()) {
          newErrors.first_name = "First name is required";
        }
        if (!djProfile.last_name?.trim()) {
          newErrors.last_name = "Last name is required";
        }
        if (!djProfile.city?.trim()) {
          newErrors.city = "City is required";
        }
        break;
      case 2:
        if (djProfile.genres.length === 0) {
          newErrors.genres = "Please select at least one genre";
        }
        break;
      case 3: {
        const soc = normalizedSocialProfileForValidation(djProfile);
        if (djProfile.instagram?.trim() && !isValidInstagram(soc.instagram)) {
          newErrors.instagram = "Please enter a valid Instagram handle or URL";
        }
        if (djProfile.soundcloud?.trim() && !isValidSoundCloud(soc.soundcloud)) {
          newErrors.soundcloud = "Please enter a valid SoundCloud URL";
        }
        if (djProfile.tiktok?.trim() && !isValidTikTok(soc.tiktok)) {
          newErrors.tiktok = "Please enter a valid TikTok handle or URL";
        }
        if (djProfile.youtube?.trim() && !isValidYouTube(soc.youtube)) {
          newErrors.youtube = "Please enter a valid YouTube URL";
        }
        break;
      }
      case 4:
        // Photo is optional — only block if an upload is actively in-flight or
        // failed (forcing the user to resolve the partial state).
        if (uploadingImage) {
          newErrors.profile_image = "Please wait — your photo is still uploading";
        } else if (uploadError) {
          newErrors.profile_image = "Photo upload failed. Please tap Retry or skip this step.";
        }
        break;
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      console.log("⚠️ Validation errors for step", step, ":", newErrors);
    }

    return Object.keys(newErrors).length === 0;
  };

  const isValidInstagram = (handle) => {
    const instagramRegex =
      /^@?[a-zA-Z0-9._]+$|^https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9._]+\/?$/;
    return instagramRegex.test(handle);
  };

  const isValidSoundCloud = (url) => {
    const soundcloudRegex =
      /^https?:\/\/(www\.)?soundcloud\.com\/[a-zA-Z0-9._-]+\/?$/;
    return soundcloudRegex.test(url);
  };

  const isValidTikTok = (handle) => {
    const tiktokRegex =
      /^@?[a-zA-Z0-9._]+$|^https?:\/\/(www\.)?(vm\.)?tiktok\.com\/@?[a-zA-Z0-9._]+\/?$/;
    return tiktokRegex.test(handle);
  };

  const isValidYouTube = (url) => {
    const youtubeRegex =
      /^https?:\/\/(www\.)?(youtube\.com\/(channel\/|user\/|c\/|@)?|youtu\.be\/)[a-zA-Z0-9._-]+\/?$/;
    return youtubeRegex.test(url);
  };

  const nextStep = () => {
    const isValid = validateStep(currentStep);
    if (!isValid) return;

    if (currentStep === 3) {
      setDjProfile((prev) => ({
        ...prev,
        instagram: normalizeInstagramOnBlur(prev.instagram),
        soundcloud: normalizeSoundCloudOnBlur(prev.soundcloud),
        tiktok: normalizeTikTokOnBlur(prev.tiktok),
        youtube: normalizeYouTubeOnBlur(prev.youtube),
      }));
    }

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const toggleGenre = (genre) => {
    setDjProfile((prev) => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter((g) => g !== genre)
        : [...prev.genres, genre],
    }));
  };

  /** Add a genre typed by the user that isn't in the preset list. */
  const addCustomGenre = () => {
    const trimmed = customGenreInput.trim();
    if (!trimmed) return;
    const lc = trimmed.toLowerCase();
    // If it matches a preset genre, just select it instead of duplicating
    const presetMatch = MUSIC_GENRES.find((g) => g.toLowerCase() === lc);
    if (presetMatch) {
      if (!djProfile.genres.includes(presetMatch)) toggleGenre(presetMatch);
      setCustomGenreInput("");
      return;
    }
    // Don't add duplicates that are already in the list
    if (djProfile.genres.some((g) => g.toLowerCase() === lc)) {
      setCustomGenreInput("");
      return;
    }
    setDjProfile((prev) => ({ ...prev, genres: [...prev.genres, trimmed] }));
    setCustomGenreInput("");
  };

  // Go directly to photo library — no intermediate action sheet
  const handleImagePicker = () => openImagePicker("library");
  const handleCameraPicker = () => openImagePicker("camera");

  /** Upload a local image URI + mimeType. Can be called on first pick or retry. */
  const uploadImage = async (uri, mimeType) => {
    setUploadingImage(true);
    setUploadError(null);
    try {
      const { publicUrl } = await uploadOnboardingProfileImage(uri, mimeType);
      setProfileImage(publicUrl);
      setPendingUpload(null); // upload succeeded, clear retry state
      setDjProfile((prev) => ({ ...prev, profile_image_url: publicUrl }));
    } catch (err) {
      console.error("❌ Failed to upload image:", err);
      // Keep the local preview visible; let the user retry without re-picking
      setUploadError(err.message || "Upload failed. Tap retry to try again.");
      setPendingUpload({ uri, mimeType });
    } finally {
      setUploadingImage(false);
    }
  };

  const openImagePicker = async (source) => {
    try {
      let result;

      if (source === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert("Permission Required", "Camera permission is needed to take photos");
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
          Alert.alert("Permission Required", "Photo library permission is needed to select images");
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        // Show local preview immediately — no waiting for upload
        setLocalImageUri(asset.uri);
        setProfileImage(null);           // clear any previous public URL
        setUploadError(null);
        // Start upload in background
        await uploadImage(asset.uri, asset.mimeType);
      }
    } catch (error) {
      console.error("❌ Image picker error:", error);
      Alert.alert("Error", "Failed to open image picker. Please try again.");
      setUploadingImage(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {Array.from({ length: totalSteps }, (_, index) => (
        <View
          key={index}
          style={[
            styles.stepDot,
            index + 1 <= currentStep && styles.stepDotActive,
          ]}
        />
      ))}
    </View>
  );

  const renderStep1 = () => {
    // Only show name / city fields if they weren't captured during sign-up
    // (e.g. social sign-in users who bypassed the signup form)
    const needsFirstName = !djProfile.first_name?.trim();
    const needsLastName = !djProfile.last_name?.trim();
    const needsCity = !djProfile.city?.trim();

    return (
      <StepAnimatedShell
        fadeAnim={fadeAnim}
        slideAnim={slideAnim}
        style={styles.stepContainer}
      >
        <Text style={styles.stepTitle}>Your DJ Profile</Text>
        <Text style={styles.stepSubtitle}>Confirm your stage name</Text>

        {/* Always shown — DJ name is the primary identity on the platform */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>DJ Name *</Text>
          <TextInput
            style={[styles.input, errors.dj_name && styles.inputError]}
            placeholder="Your DJ stage name"
            value={djProfile.dj_name}
            onChangeText={(text) => {
              setDjProfile((prev) => ({ ...prev, dj_name: text }));
              if (errors.dj_name) setErrors((prev) => ({ ...prev, dj_name: null }));
            }}
          />
          {errors.dj_name && (
            <Text style={styles.errorText}>{errors.dj_name}</Text>
          )}
        </View>

        {/* Only shown when missing — social sign-in users */}
        {needsFirstName && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>First Name *</Text>
            <TextInput
              style={[styles.input, errors.first_name && styles.inputError]}
              placeholder="Enter your first name"
              value={djProfile.first_name}
              onChangeText={(text) => {
                setDjProfile((prev) => ({ ...prev, first_name: text }));
                if (errors.first_name) setErrors((prev) => ({ ...prev, first_name: null }));
              }}
            />
            {errors.first_name && (
              <Text style={styles.errorText}>{errors.first_name}</Text>
            )}
          </View>
        )}

        {needsLastName && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Last Name *</Text>
            <TextInput
              style={[styles.input, errors.last_name && styles.inputError]}
              placeholder="Enter your last name"
              value={djProfile.last_name}
              onChangeText={(text) => {
                setDjProfile((prev) => ({ ...prev, last_name: text }));
                if (errors.last_name) setErrors((prev) => ({ ...prev, last_name: null }));
              }}
            />
            {errors.last_name && (
              <Text style={styles.errorText}>{errors.last_name}</Text>
            )}
          </View>
        )}

        {needsCity && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>City *</Text>
            <TextInput
              style={[styles.input, errors.city && styles.inputError]}
              placeholder="Your city"
              value={djProfile.city}
              onChangeText={(text) => {
                setDjProfile((prev) => ({ ...prev, city: text }));
                if (errors.city) setErrors((prev) => ({ ...prev, city: null }));
              }}
              autoCapitalize="words"
            />
            {errors.city && (
              <Text style={styles.errorText}>{errors.city}</Text>
            )}
          </View>
        )}
      </StepAnimatedShell>
    );
  };

  const renderStep2 = () => (
    <StepAnimatedShell
      fadeAnim={fadeAnim}
      slideAnim={slideAnim}
      style={styles.stepContainer}
    >
      <Text style={styles.stepTitle}>Music Genres</Text>
      <Text style={styles.stepSubtitle}>What genres do you play?</Text>

      <View style={styles.inputGroup}>
        <View style={styles.genreHeader}>
          <Text style={styles.label}>Select Genres *</Text>
          <Text style={styles.genreCount}>
            {djProfile.genres.length} selected
          </Text>
        </View>
        <Text style={styles.genreHint}>Select at least one genre you play</Text>
        <View style={styles.genreGrid}>
          {MUSIC_GENRES.map((genre) => (
            <TouchableOpacity
              key={genre}
              style={[
                styles.genreCard,
                djProfile.genres.includes(genre) && styles.genreCardSelected,
              ]}
              onPress={() => toggleGenre(genre)}
              activeOpacity={0.8}
            >
              <View style={styles.genreCardContent}>
                <Text
                  style={[
                    styles.genreCardText,
                    djProfile.genres.includes(genre) &&
                      styles.genreCardTextSelected,
                  ]}
                >
                  {genre}
                </Text>
                {djProfile.genres.includes(genre) && (
                  <View style={styles.genreCheckmark}>
                    <Text style={styles.genreCheckmarkText}>✓</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
        {/* Custom genre row — lets users add genres not in the preset list */}
        <View style={styles.customGenreRow}>
          <TextInput
            style={styles.customGenreInput}
            placeholder="Add your own genre…"
            placeholderTextColor="hsl(0, 0%, 40%)"
            value={customGenreInput}
            onChangeText={setCustomGenreInput}
            onSubmitEditing={addCustomGenre}
            returnKeyType="done"
            autoCapitalize="words"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={styles.customGenreAddBtn}
            onPress={addCustomGenre}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={22} color="hsl(0, 0%, 0%)" />
          </TouchableOpacity>
        </View>

        {errors.genres && <Text style={styles.errorText}>{errors.genres}</Text>}
      </View>
    </StepAnimatedShell>
  );

  const renderStep3 = () => (
    <StepAnimatedShell
      fadeAnim={fadeAnim}
      slideAnim={slideAnim}
      style={styles.stepContainer}
    >
      <Text style={styles.stepTitle}>Social Links</Text>
      <Text style={styles.stepSubtitle}>
        Connect your profiles — all optional. Skip this step if you prefer.
      </Text>

      <View style={styles.socialLinksCard}>
        <View style={styles.inputGroup}>
          <View style={styles.inputLabelContainer}>
            <Text style={styles.label}>Instagram</Text>
            <Text style={styles.optionalLabel}>Optional</Text>
          </View>
          <TextInput
            style={[styles.socialInput, errors.instagram && styles.inputError]}
            placeholder="yourhandle"
            placeholderTextColor="hsl(0, 0%, 50%)"
            value={djProfile.instagram}
            onChangeText={(text) => {
              setDjProfile((prev) => ({ ...prev, instagram: text }));
              if (errors.instagram) {
                setErrors((prev) => ({ ...prev, instagram: null }));
              }
            }}
            onBlur={() => {
              setDjProfile((prev) => ({
                ...prev,
                instagram: normalizeInstagramOnBlur(prev.instagram),
              }));
            }}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {djProfile.instagram?.trim() ? (
            <Text style={styles.formatHint}>
              {isValidInstagram(
                normalizeInstagramOnBlur(djProfile.instagram)
              )
                ? "✓ Valid format"
                : "⚠ Check format"}
            </Text>
          ) : null}
          {errors.instagram && (
            <Text style={styles.errorText}>{errors.instagram}</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.inputLabelContainer}>
            <Text style={styles.label}>SoundCloud</Text>
            <Text style={styles.optionalLabel}>Optional</Text>
          </View>
          <TextInput
            style={[styles.socialInput, errors.soundcloud && styles.inputError]}
            placeholder="yourusername"
            placeholderTextColor="hsl(0, 0%, 50%)"
            value={djProfile.soundcloud}
            onChangeText={(text) => {
              setDjProfile((prev) => ({ ...prev, soundcloud: text }));
              if (errors.soundcloud) {
                setErrors((prev) => ({ ...prev, soundcloud: null }));
              }
            }}
            onBlur={() => {
              setDjProfile((prev) => ({
                ...prev,
                soundcloud: normalizeSoundCloudOnBlur(prev.soundcloud),
              }));
            }}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {djProfile.soundcloud?.trim() ? (
            <Text style={styles.formatHint}>
              {isValidSoundCloud(
                normalizeSoundCloudOnBlur(djProfile.soundcloud)
              )
                ? "✓ Valid format"
                : "⚠ Check format"}
            </Text>
          ) : null}
          {errors.soundcloud && (
            <Text style={styles.errorText}>{errors.soundcloud}</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.inputLabelContainer}>
            <Text style={styles.label}>TikTok</Text>
            <Text style={styles.optionalLabel}>Optional</Text>
          </View>
          <TextInput
            style={[styles.socialInput, errors.tiktok && styles.inputError]}
            placeholder="yourhandle"
            placeholderTextColor="hsl(0, 0%, 50%)"
            value={djProfile.tiktok}
            onChangeText={(text) => {
              setDjProfile((prev) => ({ ...prev, tiktok: text }));
              if (errors.tiktok) {
                setErrors((prev) => ({ ...prev, tiktok: null }));
              }
            }}
            onBlur={() => {
              setDjProfile((prev) => ({
                ...prev,
                tiktok: normalizeTikTokOnBlur(prev.tiktok),
              }));
            }}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {djProfile.tiktok?.trim() ? (
            <Text style={styles.formatHint}>
              {isValidTikTok(normalizeTikTokOnBlur(djProfile.tiktok))
                ? "✓ Valid format"
                : "⚠ Check format"}
            </Text>
          ) : null}
          {errors.tiktok && (
            <Text style={styles.errorText}>{errors.tiktok}</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.inputLabelContainer}>
            <Text style={styles.label}>YouTube</Text>
            <Text style={styles.optionalLabel}>Optional</Text>
          </View>
          <TextInput
            style={[styles.socialInput, errors.youtube && styles.inputError]}
            placeholder="youtube.com/@yourchannel"
            placeholderTextColor="hsl(0, 0%, 50%)"
            value={djProfile.youtube}
            onChangeText={(text) => {
              setDjProfile((prev) => ({ ...prev, youtube: text }));
              if (errors.youtube) {
                setErrors((prev) => ({ ...prev, youtube: null }));
              }
            }}
            onBlur={() => {
              setDjProfile((prev) => ({
                ...prev,
                youtube: normalizeYouTubeOnBlur(prev.youtube),
              }));
            }}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {djProfile.youtube?.trim() ? (
            <Text style={styles.formatHint}>
              {isValidYouTube(normalizeYouTubeOnBlur(djProfile.youtube))
                ? "✓ Valid format"
                : "⚠ Check format"}
            </Text>
          ) : null}
          {errors.youtube && (
            <Text style={styles.errorText}>{errors.youtube}</Text>
          )}
        </View>

        <View style={styles.skipContainer}>
          <Text style={styles.skipText}>
            You can always add these later in your profile settings
          </Text>
          <TouchableOpacity style={styles.skipNowBtn} onPress={nextStep}>
            <Text style={styles.skipNowText}>Skip for now →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </StepAnimatedShell>
  );

  const renderStep4 = () => (
    <StepAnimatedShell
      fadeAnim={fadeAnim}
      slideAnim={slideAnim}
      style={styles.stepContainer}
    >
      <Text style={styles.stepTitle}>Profile Picture</Text>
      <Text style={styles.stepSubtitle}>
        Add a photo to personalize your profile — you can skip this for now
      </Text>

      <View style={styles.profileImageCard}>
        <View style={styles.profileImageContainer}>
          {/* Show local URI immediately; overlay spinner while uploading */}
          {localImageUri ? (
            <View style={styles.profileImageWrapper}>
              <Image
                source={{ uri: localImageUri }}
                style={styles.profileImage}
                resizeMode="cover"
              />
              {uploadingImage && (
                <View style={styles.profileImageOverlay}>
                  <Ionicons name="cloud-upload" size={28} color="hsl(75, 100%, 60%)" />
                  <Text style={styles.profileImageOverlayText}>Uploading…</Text>
                </View>
              )}
              {!uploadingImage && profileImage && (
                <View style={styles.profileImageOverlaySuccess}>
                  <Ionicons name="checkmark-circle" size={28} color="hsl(75, 100%, 60%)" />
                </View>
              )}
            </View>
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Ionicons name="person" size={40} color="hsl(0, 0%, 50%)" />
            </View>
          )}

          <View style={styles.imageButtonRow}>
            <TouchableOpacity
              style={styles.changeImageButton}
              onPress={handleImagePicker}
              disabled={uploadingImage}
            >
              <Ionicons name="images-outline" size={20} color="hsl(0, 0%, 0%)" />
              <Text style={styles.changeImageText}>
                {localImageUri ? "Change Photo" : "Add Photo"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={handleCameraPicker}
              disabled={uploadingImage}
            >
              <Ionicons name="camera-outline" size={22} color="hsl(0, 0%, 100%)" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.profileImageHint}>
          {uploadingImage ? (
            <Text style={styles.hintText}>Uploading your photo…</Text>
          ) : uploadError ? (
            <>
              <Text style={styles.uploadErrorText}>{uploadError}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => pendingUpload && uploadImage(pendingUpload.uri, pendingUpload.mimeType)}
              >
                <Ionicons name="refresh" size={16} color="hsl(0, 0%, 0%)" />
                <Text style={styles.retryButtonText}>Retry upload</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.hintText}>
              {profileImage
                ? "✓ Photo uploaded successfully."
                : localImageUri
                ? "Processing…"
                : "You can add a photo now or set one later in your profile."}
            </Text>
          )}
          {errors.profile_image && (
            <Text style={styles.errorText}>{errors.profile_image}</Text>
          )}
        </View>

        {/* Skip option — only visible when no photo has been picked yet */}
        {!localImageUri && !uploadingImage && (
          <View style={styles.skipContainer}>
            <Text style={styles.skipText}>
              You can always add a photo later in your profile settings
            </Text>
            <TouchableOpacity style={styles.skipNowBtn} onPress={nextStep}>
              <Text style={styles.skipNowText}>Skip for now →</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </StepAnimatedShell>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      default: return renderStep1();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image
              source={require("../assets/rhood_logo.png")}
              style={styles.logoIcon}
              resizeMode="contain"
            />
            <Image
              source={require("../assets/RHOOD_Lettering_White.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.subtitle}>Join R/HOOD</Text>
          {renderStepIndicator()}
        </View>

        <View style={styles.form}>{renderCurrentStep()}</View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        {currentStep > 1 && (
          <TouchableOpacity style={styles.secondaryButton} onPress={prevStep}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.primaryButton} onPress={nextStep}>
          <Text style={styles.primaryButtonText}>
            {currentStep === totalSteps ? "Complete Setup" : "Next"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 0%)", // Pure black background
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 20, // Reduced padding since buttons are now outside
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontFamily: "TS Block Bold",
    fontWeight: "900",
    color: "hsl(75, 100%, 60%)", // R/HOOD signature lime color
    textAlign: "center",
    marginBottom: 10,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  logoIcon: {
    height: 40,
    width: 40,
    marginRight: 8,
  },
  logoImage: {
    height: 48,
    width: 180,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)", // Muted foreground
    textAlign: "center",
    marginBottom: 20,
  },
  stepIndicator: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "hsl(0, 0%, 20%)", // Muted background
    marginHorizontal: 4,
  },
  stepDotActive: {
    backgroundColor: "hsl(75, 100%, 60%)", // R/HOOD signature lime color
  },
  form: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
    color: "hsl(0, 0%, 100%)", // Pure white text
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)", // Muted foreground
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)", // Pure white text
    marginBottom: 8,
  },
  input: {
    backgroundColor: "hsl(0, 0%, 10%)", // Dark background
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Subtle border
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 100%)", // Pure white text
  },
  inputError: {
    borderColor: "hsl(0, 100%, 60%)", // Error red
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 100%, 60%)", // Error red
    marginTop: 5,
  },
  genreHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  genreCount: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(75, 100%, 60%)", // R/HOOD signature lime color
    fontWeight: "600",
  },
  genreHint: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)", // Muted text
    marginBottom: 16,
  },
  genreGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 0,
    justifyContent: "space-between",
  },
  genreCard: {
    width: "48%", // Two columns with small gap
    backgroundColor: "hsl(0, 0%, 8%)", // Darker background
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 20%)", // Subtle border
    overflow: "hidden",
  },
  genreCardSelected: {
    backgroundColor: "hsl(75, 100%, 60%)", // R/HOOD signature lime color
    borderColor: "hsl(75, 100%, 60%)",
    shadowColor: "hsl(75, 100%, 60%)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  genreCardContent: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 60,
  },
  genreCardText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 100%)", // Pure white text
    fontWeight: "600",
    flex: 1,
  },
  genreCardTextSelected: {
    color: "hsl(0, 0%, 0%)", // Black text on selected
    fontWeight: "700",
  },
  genreCheckmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "hsl(0, 0%, 0%)", // Black background for checkmark
    justifyContent: "center",
    alignItems: "center",
  },
  genreCheckmarkText: {
    fontSize: 14,
    color: "hsl(75, 100%, 60%)", // Lime green checkmark
    fontWeight: "bold",
  },
  socialLinksCard: {
    backgroundColor: "hsl(0, 0%, 8%)", // Dark card background
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Subtle border
    marginTop: 10,
  },
  inputLabelContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  optionalLabel: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    color: "hsl(75, 100%, 60%)", // R/HOOD lime color
    fontWeight: "500",
    backgroundColor: "hsl(75, 100%, 60%, 0.1)", // Subtle background
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  socialInput: {
    backgroundColor: "hsl(0, 0%, 12%)", // Darker input background
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 20%)", // Subtle border
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 100%)", // White text
    marginBottom: 4,
  },
  formatHint: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)", // Muted text
    marginTop: 4,
    marginBottom: 8,
  },
  customGenreRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 4,
    gap: 8,
  },
  customGenreInput: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 10%)",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 20%)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 100%)",
  },
  customGenreAddBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "hsl(75, 100%, 60%)",
    justifyContent: "center",
    alignItems: "center",
  },
  skipContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "hsl(0, 0%, 15%)", // Subtle divider
  },
  skipText: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 60%)", // Muted text
    textAlign: "center",
    fontStyle: "italic",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 20, // Add bottom padding for safe area
    paddingHorizontal: 20, // Match container padding
    paddingTop: 20, // Add top padding for separation
    backgroundColor: "hsl(0, 0%, 0%)", // Match background
  },
  primaryButton: {
    backgroundColor: "hsl(75, 100%, 60%)", // R/HOOD signature lime color
    borderRadius: 8,
    paddingHorizontal: 30,
    paddingVertical: 15,
    flex: 1,
    marginLeft: 10,
  },
  primaryButtonText: {
    color: "hsl(0, 0%, 0%)", // Black text on primary
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
    textAlign: "center",
  },
  secondaryButton: {
    backgroundColor: "hsl(0, 0%, 15%)", // Muted background
    borderRadius: 8,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 25%)",
  },
  secondaryButtonText: {
    color: "hsl(0, 0%, 100%)", // Pure white text
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    textAlign: "center",
  },
  // Step 5 - Profile Image Styles
  profileImageCard: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  profileImageContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  profileImageWrapper: {
    position: "relative",
    marginBottom: 16,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  profileImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 60,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  profileImageOverlayText: {
    color: "hsl(75, 100%, 60%)",
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
  },
  profileImageOverlaySuccess: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "hsl(0, 0%, 0%)",
    justifyContent: "center",
    alignItems: "center",
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "hsl(0, 0%, 15%)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "hsl(0, 0%, 25%)",
  },
  uploadErrorText: {
    color: "hsl(0, 100%, 60%)",
    fontSize: 13,
    fontFamily: "Helvetica Neue",
    textAlign: "center",
    marginBottom: 10,
    lineHeight: 18,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "hsl(75, 100%, 60%)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  retryButtonText: {
    color: "hsl(0, 0%, 0%)",
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
  },
  imageButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  changeImageButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "hsl(75, 100%, 60%)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  changeImageText: {
    color: "hsl(0, 0%, 0%)",
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
  },
  cameraButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "hsl(0, 0%, 15%)",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 25%)",
    justifyContent: "center",
    alignItems: "center",
  },
  profileImageHint: {
    alignItems: "center",
  },
  hintText: {
    color: "hsl(0, 0%, 60%)",
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    textAlign: "center",
    lineHeight: 20,
  },
  betaNotice: {
    backgroundColor: "hsl(75, 100%, 60%, 0.08)",
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%, 0.25)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  betaNoticeText: {
    fontSize: 13,
    fontFamily: "Helvetica Neue",
    color: "hsl(75, 100%, 75%)",
    lineHeight: 18,
  },
  useAnotherAccountBtn: {
    marginTop: 24,
    alignSelf: "center",
  },
  useAnotherAccountText: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 50%)",
    textDecorationLine: "underline",
  },
  skipNowBtn: {
    marginTop: 12,
    alignSelf: "center",
  },
  skipNowText: {
    fontSize: 15,
    fontFamily: "Helvetica Neue",
    color: "hsl(75, 100%, 60%)",
    fontWeight: "600",
  },
  inputGroupDropdownOpen: {
    zIndex: 10,
  },
};
