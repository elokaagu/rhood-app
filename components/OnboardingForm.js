import React, { useState, useEffect } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../lib/supabase";

// Music genres for selection
const MUSIC_GENRES = [
  "House",
  "Techno",
  "Trance",
  "Dubstep",
  "Drum & Bass",
  "Ambient",
  "Progressive",
  "Minimal",
  "Deep House",
  "Tech House",
  "Hardstyle",
  "Trap",
  "Future Bass",
  "Breakbeat",
  "Garage",
  "Jungle",
  "Industrial",
  "Electro",
  "Synthwave",
  "Downtempo",
  "Psytrance",
  "Hardcore",
];

// Major cities for selection
const MAJOR_CITIES = [
  "New York",
  "Los Angeles",
  "Chicago",
  "Miami",
  "San Francisco",
  "London",
  "Berlin",
  "Amsterdam",
  "Paris",
  "Barcelona",
  "Madrid",
  "Rome",
  "Milan",
  "Vienna",
  "Prague",
  "Warsaw",
  "Moscow",
  "Tokyo",
  "Seoul",
  "Shanghai",
  "Hong Kong",
  "Singapore",
  "Sydney",
  "Melbourne",
  "Toronto",
  "Montreal",
  "Vancouver",
  "Mexico City",
  "São Paulo",
  "Buenos Aires",
  "Lima",
  "Bogotá",
];

export default function OnboardingForm({
  onComplete,
  djProfile,
  setDjProfile,
}) {
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [errors, setErrors] = useState({});
  const [profileImage, setProfileImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const totalSteps = 5;

  useEffect(() => {
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
        if (!djProfile.first_name?.trim()) {
          newErrors.first_name = "First name is required";
        }
        if (!djProfile.last_name?.trim()) {
          newErrors.last_name = "Last name is required";
        }
        if (!djProfile.dj_name?.trim()) {
          newErrors.dj_name = "DJ name is required";
        }
        break;
      case 2:
        if (!djProfile.city) {
          newErrors.city = "Please select your city";
        }
        break;
      case 3:
        if (djProfile.genres.length === 0) {
          newErrors.genres = "Please select at least one genre";
        }
        break;
      case 4:
        // Optional social links validation
        if (djProfile.instagram && !isValidInstagram(djProfile.instagram)) {
          newErrors.instagram = "Please enter a valid Instagram handle or URL";
        }
        if (djProfile.soundcloud && !isValidSoundCloud(djProfile.soundcloud)) {
          newErrors.soundcloud = "Please enter a valid SoundCloud URL";
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

  const nextStep = () => {
    console.log(
      "🔄 Next step pressed, current step:",
      currentStep,
      "total steps:",
      totalSteps
    );
    console.log("👤 Current djProfile:", djProfile);

    const isValid = validateStep(currentStep);
    console.log("✅ Validation result:", isValid);
    console.log("❌ Current errors:", errors);

    if (isValid) {
      console.log("✅ Validation passed");

      if (currentStep < totalSteps) {
        console.log("📍 Moving to next step");
        setCurrentStep(currentStep + 1);
      } else {
        console.log("🎉 Completing onboarding...");
        console.log("👤 Final user profile:", djProfile);
        console.log("📞 Calling onComplete...");
        onComplete();
      }
    } else {
      console.log("❌ Validation failed, errors:", errors);
      Alert.alert(
        "Please complete all required fields",
        "Make sure all required information is filled in before continuing."
      );
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

  const selectCity = (city) => {
    setDjProfile((prev) => ({ ...prev, city }));
    setShowCityDropdown(false);
  };

  const toggleCityDropdown = () => {
    setShowCityDropdown(!showCityDropdown);
  };

  const uploadProfileImage = async (imageUri) => {
    try {
      console.log("📤 Uploading profile image during onboarding...");

      // Generate unique filename
      const fileExt = imageUri.split(".").pop() || "jpg";
      const fileName = `profile_${Date.now()}.${fileExt}`;

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

  const handleImagePicker = () => {
    Alert.alert(
      "Select Profile Picture",
      "Choose how you'd like to add your profile picture",
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
        setUploadingImage(true);

        try {
          // Upload image to Supabase storage
          const publicUrl = await uploadProfileImage(localUri);

          // Update profile with public URL
          setProfileImage(publicUrl);
          setDjProfile((prev) => ({
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
          setUploadingImage(false);
        }
      }
    } catch (error) {
      console.error("❌ Image picker error:", error);
      Alert.alert("Error", "Failed to open image picker");
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

  const renderStep1 = () => (
    <Animated.View
      style={[
        styles.stepContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Text style={styles.stepTitle}>Basic Information</Text>
      <Text style={styles.stepSubtitle}>Tell us about yourself</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>First Name *</Text>
        <TextInput
          style={[styles.input, errors.first_name && styles.inputError]}
          placeholder="Enter your first name"
          value={djProfile.first_name}
          onChangeText={(text) => {
            setDjProfile((prev) => ({ ...prev, first_name: text }));
            if (errors.first_name) {
              setErrors((prev) => ({ ...prev, first_name: null }));
            }
          }}
        />
        {errors.first_name && (
          <Text style={styles.errorText}>{errors.first_name}</Text>
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Last Name *</Text>
        <TextInput
          style={[styles.input, errors.last_name && styles.inputError]}
          placeholder="Enter your last name"
          value={djProfile.last_name}
          onChangeText={(text) => {
            setDjProfile((prev) => ({ ...prev, last_name: text }));
            if (errors.last_name) {
              setErrors((prev) => ({ ...prev, last_name: null }));
            }
          }}
        />
        {errors.last_name && (
          <Text style={styles.errorText}>{errors.last_name}</Text>
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>DJ Name *</Text>
        <TextInput
          style={[styles.input, errors.dj_name && styles.inputError]}
          placeholder="Your DJ stage name"
          value={djProfile.dj_name}
          onChangeText={(text) => {
            setDjProfile((prev) => ({ ...prev, dj_name: text }));
            if (errors.dj_name) {
              setErrors((prev) => ({ ...prev, dj_name: null }));
            }
          }}
        />
        {errors.dj_name && (
          <Text style={styles.errorText}>{errors.dj_name}</Text>
        )}
      </View>
    </Animated.View>
  );

  const renderStep2 = () => (
    <Animated.View
      style={[
        styles.stepContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Text style={styles.stepTitle}>Location</Text>
      <Text style={styles.stepSubtitle}>Where are you based?</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>City *</Text>
        <TouchableOpacity
          style={[styles.dropdownButton, errors.city && styles.inputError]}
          onPress={toggleCityDropdown}
        >
          <Text
            style={[
              styles.dropdownText,
              !djProfile.city && styles.placeholderText,
            ]}
          >
            {djProfile.city || "Select your city"}
          </Text>
          <Text style={styles.dropdownArrow}>▼</Text>
        </TouchableOpacity>

        {showCityDropdown && (
          <ScrollView style={styles.dropdown} nestedScrollEnabled={true}>
            {MAJOR_CITIES.map((city, index) => (
              <TouchableOpacity
                key={`${city}-${index}`}
                style={styles.dropdownItem}
                onPress={() => selectCity(city)}
                activeOpacity={0.7}
              >
                <Text style={styles.dropdownItemText}>{city}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
      </View>
    </Animated.View>
  );

  const renderStep3 = () => (
    <Animated.View
      style={[
        styles.stepContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
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
        {errors.genres && <Text style={styles.errorText}>{errors.genres}</Text>}
      </View>
    </Animated.View>
  );

  const renderStep4 = () => (
    <Animated.View
      style={[
        styles.stepContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Text style={styles.stepTitle}>Social Links</Text>
      <Text style={styles.stepSubtitle}>Connect your profiles (optional)</Text>

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
              // Auto-prepend Instagram URL if user just enters handle
              let processedText = text;
              if (text && !text.startsWith("http") && !text.startsWith("@")) {
                processedText = `https://instagram.com/${text}`;
              } else if (text && text.startsWith("@")) {
                processedText = `https://instagram.com/${text.substring(1)}`;
              }
              setDjProfile((prev) => ({ ...prev, instagram: processedText }));
              if (errors.instagram) {
                setErrors((prev) => ({ ...prev, instagram: null }));
              }
            }}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {djProfile.instagram && (
            <Text style={styles.formatHint}>
              {isValidInstagram(djProfile.instagram)
                ? "✓ Valid format"
                : "⚠ Check format"}
            </Text>
          )}
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
              // Auto-prepend SoundCloud URL if user just enters handle
              let processedText = text;
              if (text && !text.startsWith("http")) {
                processedText = `https://soundcloud.com/${text}`;
              }
              setDjProfile((prev) => ({ ...prev, soundcloud: processedText }));
              if (errors.soundcloud) {
                setErrors((prev) => ({ ...prev, soundcloud: null }));
              }
            }}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {djProfile.soundcloud && (
            <Text style={styles.formatHint}>
              {isValidSoundCloud(djProfile.soundcloud)
                ? "✓ Valid format"
                : "⚠ Check format"}
            </Text>
          )}
          {errors.soundcloud && (
            <Text style={styles.errorText}>{errors.soundcloud}</Text>
          )}
        </View>

        <View style={styles.skipContainer}>
          <Text style={styles.skipText}>
            You can always add these later in your profile settings
          </Text>
        </View>
      </View>
    </Animated.View>
  );

  const renderStep5 = () => (
    <Animated.View
      style={[
        styles.stepContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Text style={styles.stepTitle}>Profile Picture</Text>
      <Text style={styles.stepSubtitle}>
        Add a photo to personalize your profile (optional)
      </Text>

      <View style={styles.profileImageCard}>
        <View style={styles.profileImageContainer}>
          {profileImage ? (
            <Image
              source={{ uri: profileImage }}
              style={styles.profileImage}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.profileImagePlaceholder,
                uploadingImage && styles.profileImageUploading,
              ]}
            >
              {uploadingImage ? (
                <Ionicons
                  name="cloud-upload"
                  size={40}
                  color="hsl(75, 100%, 60%)"
                />
              ) : (
                <Ionicons name="person" size={40} color="hsl(0, 0%, 50%)" />
              )}
            </View>
          )}

          <TouchableOpacity
            style={styles.changeImageButton}
            onPress={handleImagePicker}
            disabled={uploadingImage}
          >
            <Ionicons name="camera" size={20} color="hsl(0, 0%, 100%)" />
            <Text style={styles.changeImageText}>
              {profileImage ? "Change" : "Add Photo"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.profileImageHint}>
          <Text style={styles.hintText}>
            {profileImage
              ? "Great! Your profile picture is ready."
              : "You can add a profile picture now or skip this step and add one later."}
          </Text>
        </View>
      </View>
    </Animated.View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      case 5:
        return renderStep5();
      default:
        return renderStep1();
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
    fontFamily: "TS-Block-Bold",
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
  dropdownButton: {
    backgroundColor: "hsl(0, 0%, 10%)", // Dark background
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Subtle border
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 100%)", // Pure white text
    flex: 1,
  },
  placeholderText: {
    color: "hsl(0, 0%, 50%)", // Muted text for placeholder
  },
  dropdownArrow: {
    fontSize: 12,
    color: "hsl(0, 0%, 70%)", // Muted foreground
  },
  dropdown: {
    position: "absolute",
    top: 95, // Increased from 80 to 95 (additional 15px down)
    left: 0,
    right: 0,
    backgroundColor: "hsl(0, 0%, 10%)", // Dark background
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Subtle border
    maxHeight: 200,
    zIndex: 1000,
    elevation: 1000, // Android compatibility
  },
  dropdownItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)", // Subtle border
    backgroundColor: "hsl(0, 0%, 10%)", // Ensure consistent background
    borderTopWidth: 0, // Remove any top border
    borderLeftWidth: 0, // Remove any left border
    borderRightWidth: 0, // Remove any right border
  },
  dropdownItemText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 100%)", // Pure white text
    fontWeight: "500", // Ensure consistent weight
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
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
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
  profileImageUploading: {
    borderColor: "hsl(75, 100%, 60%)",
    backgroundColor: "hsl(0, 0%, 12%)",
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
};
