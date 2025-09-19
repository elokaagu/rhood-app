import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Animated,
  AppState,
  Image,
  Share,
  Linking,
  Alert,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { useFonts } from "expo-font";
import SplashScreen from "./components/SplashScreen";
import OnboardingForm from "./components/OnboardingForm";
import OpportunitiesList from "./components/OpportunitiesList";
import OpportunitiesSwipe from "./components/OpportunitiesSwipe";
import ConnectionsScreen from "./components/ConnectionsScreen";
import ListenScreen from "./components/ListenScreen";
import MessagesScreen from "./components/MessagesScreen";
import RhoodModal from "./components/RhoodModal";
import { db, auth, supabase } from "./lib/supabase";
import LoginScreen from "./components/LoginScreen";
import SignupScreen from "./components/SignupScreen";
import EditProfileScreen from "./components/EditProfileScreen";

export default function App() {
  // Load custom fonts
  const [fontsLoaded] = useFonts({
    "TS-Block-Bold": require("./assets/TS Block Bold.ttf"),
  });

  const [showSplash, setShowSplash] = useState(true);
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState("opportunities");
  const [screenParams, setScreenParams] = useState({});
  const [opportunities, setOpportunities] = useState([]);
  const [loadingOpportunities, setLoadingOpportunities] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showFadeOverlay, setShowFadeOverlay] = useState(false);
  const fadeOverlayAnim = useRef(new Animated.Value(0)).current;

  // Authentication state
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("login"); // 'login' or 'signup'

  // Global audio state for persistent playback
  const [globalAudioState, setGlobalAudioState] = useState({
    isPlaying: false,
    currentTrack: null,
    progress: 0,
    isLoading: false,
    sound: null,
    isShuffled: false,
    repeatMode: "none", // 'none', 'one', 'all'
    positionMillis: 0,
    durationMillis: 0,
  });

  // Full-screen player state
  const [showFullScreenPlayer, setShowFullScreenPlayer] = useState(false);

  // Application sent modal state
  const [showApplicationSentModal, setShowApplicationSentModal] =
    useState(false);
  const [appliedOpportunity, setAppliedOpportunity] = useState(null);

  // Edit profile modal state
  const [showEditProfile, setShowEditProfile] = useState(false);

  // Global audio instance reference for cleanup
  const globalAudioRef = useRef(null);

  const [djProfile, setDjProfile] = useState({
    djName: "",
    fullName: "",
    instagram: "",
    soundcloud: "",
    city: "",
    genres: [],
  });

  useEffect(() => {
    // Check if New Architecture is enabled
    console.log("🏗️ New Architecture Check:");
    console.log("RCT_NEW_ARCH_ENABLED:", global.RCT_NEW_ARCH_ENABLED);
    console.log("Fabric enabled:", global.nativeFabricUIManager !== undefined);
    console.log("TurboModules enabled:", global.RN$Bridgeless !== undefined);
    console.log(
      "React Native version:",
      require("react-native").Platform.constants.reactNativeVersion
    );
    console.log("Expo SDK version:", require("expo/package.json").version);
    console.log(
      "New Architecture status:",
      global.RCT_NEW_ARCH_ENABLED === "1" ? "✅ ENABLED" : "❌ DISABLED"
    );

    initializeAuth();
    checkFirstTime();
    setupGlobalAudio();

    // Handle app state changes for background audio
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === "background" && globalAudioState.isPlaying) {
        console.log("App went to background, audio should continue playing");
      } else if (nextAppState === "active" && globalAudioState.isPlaying) {
        console.log("App became active, audio is still playing");
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    // Cleanup audio on unmount
    return () => {
      subscription?.remove();
      if (globalAudioRef.current) {
        globalAudioRef.current.remove();
        globalAudioRef.current = null;
      }
    };
  }, []);

  // Initialize authentication
  const initializeAuth = async () => {
    try {
      // Get initial session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.log("Session error:", sessionError.message);
        // Clear invalid session
        await supabase.auth.signOut();
        setUser(null);
      } else {
      setUser(session?.user ?? null);
      }

      // Listen for auth changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        setUser(session?.user ?? null);
        setAuthLoading(false);

        if (event === "SIGNED_IN" && session?.user) {
          // User signed in, check if profile exists
          try {
            const profile = await db.getUserProfile(session.user.id);
            if (profile) {
              setDjProfile(profile);
              setIsFirstTime(false);
            }
          } catch (error) {
            console.log("No profile found, user needs to complete onboarding");
          }
        } else if (event === "SIGNED_OUT") {
          // User signed out, reset state
          setDjProfile({
            djName: "",
            fullName: "",
            instagram: "",
            soundcloud: "",
            city: "",
            genres: [],
          });
          setIsFirstTime(true);
        }
      });

      return () => subscription.unsubscribe();
    } catch (error) {
      console.error("Auth initialization error:", error);
      setAuthLoading(false);
    }
  };

  // Setup global audio configuration for background playback
  const setupGlobalAudio = async () => {
    try {
      // expo-audio handles background playback automatically
      console.log("✅ Global audio configured for background playback");
    } catch (error) {
      console.log("❌ Error setting up global audio:", error);
    }
  };

  const handleSplashFinish = () => {
    // Show black overlay and fade it in
    setShowFadeOverlay(true);
    Animated.timing(fadeOverlayAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start(() => {
      // Hide splash screen after black overlay is complete
    setShowSplash(false);
      // Fade out the black overlay to reveal main app
      Animated.timing(fadeOverlayAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }).start(() => {
        // Hide overlay after fade out completes
        setShowFadeOverlay(false);
      });
    });
  };

  // Authentication handlers
  const handleLoginSuccess = async (user) => {
    setUser(user);
    setShowAuth(false);
    try {
      const profile = await db.getUserProfile(user.id);
      if (profile) {
        setDjProfile(profile);
        setIsFirstTime(false);
      }
    } catch (error) {
      console.log("No profile found, user needs to complete onboarding");
    }
  };

  const handleSignupSuccess = async (user) => {
    setUser(user);
    setShowAuth(false);
    // User will go through onboarding after signup
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setUser(null);
      setShowAuth(true);
      setAuthMode("login");
    } catch (error) {
      console.error("Logout error:", error);
      Alert.alert("Error", "Failed to sign out");
    }
  };

  const handleEditProfile = () => {
    setShowEditProfile(true);
  };

  const handleProfileSaved = (updatedProfile) => {
    setShowEditProfile(false);
    // Update the local djProfile state with the updated profile
    setDjProfile({
      djName: updatedProfile.dj_name,
      fullName: updatedProfile.full_name,
      instagram: updatedProfile.instagram || "",
      soundcloud: updatedProfile.soundcloud || "",
      city: updatedProfile.city,
      genres: updatedProfile.genres,
    });
    // Also save to AsyncStorage for offline access
    AsyncStorage.setItem(
      "djProfile",
      JSON.stringify({
      djName: updatedProfile.dj_name,
      fullName: updatedProfile.full_name,
        instagram: updatedProfile.instagram || "",
        soundcloud: updatedProfile.soundcloud || "",
      city: updatedProfile.city,
      genres: updatedProfile.genres,
      })
    );
  };

  const handleProfileCancel = () => {
    setShowEditProfile(false);
  };

  const showLogin = () => {
    setAuthMode("login");
    setShowAuth(true);
  };

  const showSignup = () => {
    setAuthMode("signup");
    setShowAuth(true);
  };

  // Format time helper function
  const formatTime = (millis) => {
    if (!millis) return "0:00";
    const minutes = Math.floor(millis / 60000);
    const seconds = Math.floor((millis % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Global audio control functions
  const playGlobalAudio = async (track) => {
    try {
      console.log("🎵 Starting to play track:", track.title);
      console.log("🎵 Audio URL:", track.audioUrl);

      // Stop current audio if playing
      if (globalAudioRef.current) {
        console.log("🛑 Stopping current audio before playing new track");
        globalAudioRef.current.remove();
        globalAudioRef.current = null;
      }

      setGlobalAudioState((prev) => ({ ...prev, isLoading: true }));

      // Configure audio mode for playback
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'mixWithOthers'
      });

      // Create and load new sound using expo-audio
      console.log("🔄 Creating new sound instance...");
      console.log("🔄 Audio file path:", track.audioUrl);
      console.log("🔄 Audio file type:", typeof track.audioUrl);

      const player = createAudioPlayer(track.audioUrl, {
        updateInterval: 1000,
        downloadFirst: true,
      });

      console.log("🔄 Player created:", player);

      // Set up event listeners
      player.addListener("statusChange", (status) => {
        console.log("📊 Audio status change:", status);
        if (status.isLoaded) {
          console.log("✅ Audio loaded successfully");
          setGlobalAudioState((prev) => ({
            ...prev,
            isPlaying: status.isPlaying,
            isLoading: false,
            progress: status.positionMillis / status.durationMillis || 0,
            positionMillis: status.positionMillis,
            durationMillis: status.durationMillis,
          }));
        } else {
          console.log("⏳ Audio still loading...");
        }
      });

      // Store reference for cleanup
      globalAudioRef.current = player;

      // Start playing
      console.log("▶️ Starting playback...");
      await player.play();

      setGlobalAudioState((prev) => ({
        ...prev,
        sound: player,
        isPlaying: true,
        currentTrack: track,
        isLoading: false,
      }));

      console.log("🎉 Global audio started successfully:", track.title);
    } catch (error) {
      console.log("❌ Error playing global audio:", error);
      setGlobalAudioState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const pauseGlobalAudio = async () => {
    if (globalAudioState.sound) {
      try {
        await globalAudioState.sound.pause();
        setGlobalAudioState((prev) => ({ ...prev, isPlaying: false }));
      } catch (error) {
        console.log("❌ Error pausing audio:", error);
      }
    }
  };

  const resumeGlobalAudio = async () => {
    if (globalAudioState.sound) {
      try {
        await globalAudioState.sound.play();
        setGlobalAudioState((prev) => ({ ...prev, isPlaying: true }));
      } catch (error) {
        console.log("❌ Error resuming audio:", error);
      }
    }
  };

  const stopGlobalAudio = async () => {
    if (globalAudioRef.current) {
      try {
        await globalAudioRef.current.pause();
        globalAudioRef.current.remove();
        globalAudioRef.current = null;
      } catch (error) {
        console.log("❌ Error stopping audio:", error);
      }
    }
    setGlobalAudioState({
      isPlaying: false,
      currentTrack: null,
      progress: 0,
      isLoading: false,
      sound: null,
      isShuffled: false,
      repeatMode: "none",
      positionMillis: 0,
      durationMillis: 0,
    });
  };

  // Shuffle functionality
  const toggleShuffle = () => {
    setGlobalAudioState((prev) => ({
      ...prev,
      isShuffled: !prev.isShuffled,
    }));
  };

  // Skip forward functionality
  const skipForward = async () => {
    if (globalAudioState.sound) {
      try {
        const currentPosition = globalAudioState.positionMillis || 0;
        const duration = globalAudioState.durationMillis || 0;
          const newPosition = Math.min(
          currentPosition + 10000, // Skip 10 seconds
          duration
          );
        await globalAudioState.sound.seekTo(newPosition);
      } catch (error) {
        console.log("Error skipping forward:", error);
      }
    }
  };

  // Skip backward functionality
  const skipBackward = async () => {
    if (globalAudioState.sound) {
      try {
        const currentPosition = globalAudioState.positionMillis || 0;
          const newPosition = Math.max(
          currentPosition - 10000, // Skip back 10 seconds
            0
          );
        await globalAudioState.sound.seekTo(newPosition);
      } catch (error) {
        console.log("Error skipping backward:", error);
      }
    }
  };

  // Repeat functionality
  const toggleRepeat = () => {
    setGlobalAudioState((prev) => {
      const modes = ["none", "one", "all"];
      const currentIndex = modes.indexOf(prev.repeatMode);
      const nextIndex = (currentIndex + 1) % modes.length;
      return {
        ...prev,
        repeatMode: modes[nextIndex],
      };
    });
  };

  // Share functionality
  const shareTrack = async () => {
    if (globalAudioState.currentTrack) {
      try {
        const shareMessage = `Check out this track: "${globalAudioState.currentTrack.title}" by ${globalAudioState.currentTrack.artist} on Rhood!`;
        await Share.share({
          message: shareMessage,
          title: "Share Track",
        });
      } catch (error) {
        console.log("Error sharing track:", error);
        Alert.alert("Error", "Failed to share track");
      }
    }
  };

  const loadOpportunities = async () => {
    try {
      setLoadingOpportunities(true);
      const data = await db.getOpportunities();
      setOpportunities(data);
    } catch (error) {
      console.error("Error loading opportunities:", error);
      Alert.alert(
        "Error",
        "Failed to load opportunities. Please check your internet connection."
      );
    } finally {
      setLoadingOpportunities(false);
    }
  };

  const applyToOpportunity = async (opportunityId) => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) {
        Alert.alert("Error", "Please complete your profile first.");
        return;
      }

      await db.applyToOpportunity(opportunityId, userId);
      Alert.alert("Success", "Application submitted successfully!");
    } catch (error) {
      console.error("Error applying to opportunity:", error);
      Alert.alert("Error", "Failed to submit application. Please try again.");
    }
  };

  // Load opportunities when opportunities screen is accessed
  useEffect(() => {
    if (currentScreen === "opportunities") {
      loadOpportunities();
    }
  }, [currentScreen]);

  const checkFirstTime = async () => {
    try {
      // Only check AsyncStorage if user is not authenticated
      if (!user) {
        const hasOnboarded = await AsyncStorage.getItem("hasOnboarded");
        const profile = await AsyncStorage.getItem("djProfile");

        setIsFirstTime(!hasOnboarded);
        if (profile) {
          setDjProfile(JSON.parse(profile));
        }
      }
    } catch (error) {
      console.error("Error checking onboarding status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMenuNavigation = (screen, params = {}) => {
    setCurrentScreen(screen);
    setScreenParams(params);
    setShowMenu(false);
  };

  const completeOnboarding = async () => {
    if (
      !djProfile.djName ||
      !djProfile.fullName ||
      !djProfile.city ||
      djProfile.genres.length === 0
    ) {
      Alert.alert(
        "Error",
        "Please fill in all required fields: DJ name, full name, city, and at least one genre"
      );
      return;
    }

    try {
      // Save to Supabase with user ID
      const profileData = {
        id: user.id, // Use authenticated user's ID
        dj_name: djProfile.djName,
        full_name: djProfile.fullName,
        instagram: djProfile.instagram || null,
        soundcloud: djProfile.soundcloud || null,
        city: djProfile.city,
        genres: djProfile.genres,
        bio: `DJ from ${djProfile.city} specializing in ${djProfile.genres.join(
          ", "
        )}`,
        email: user.email,
      };

      const savedProfile = await db.createUserProfile(profileData);

      // Also save to AsyncStorage for offline access
      await AsyncStorage.setItem("hasOnboarded", "true");
      await AsyncStorage.setItem("djProfile", JSON.stringify(djProfile));
      await AsyncStorage.setItem("userId", user.id);

      setIsFirstTime(false);
      Alert.alert(
        "Success",
        "Welcome to R/HOOD! Your profile has been saved to the cloud."
      );
    } catch (error) {
      console.error("Error saving profile:", error);
      Alert.alert(
        "Error",
        "Failed to save profile. Please check your internet connection and try again."
      );
    }
  };

  // Wait for fonts to load
  if (!fontsLoaded) {
    return null; // or a loading screen
  }

  // Show splash screen first
  if (showSplash) {
    return (
      <SafeAreaProvider>
        <SplashScreen onFinish={handleSplashFinish} />
      </SafeAreaProvider>
    );
  }

  // Show loading screen while checking authentication
  if (authLoading || isLoading) {
    return (
      <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.title}>R/HOOD</Text>
          <Text style={styles.subtitle}>Underground Music Platform</Text>
        </View>
      </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // Show authentication screens if not logged in
  if (!user) {
    return (
      <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        {authMode === "login" ? (
          <LoginScreen
            onLoginSuccess={handleLoginSuccess}
            onSwitchToSignup={showSignup}
          />
        ) : (
          <SignupScreen
            onSignupSuccess={handleSignupSuccess}
            onSwitchToLogin={showLogin}
          />
        )}
      </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // Show onboarding if first time user
  if (isFirstTime) {
    return (
      <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <OnboardingForm
          onComplete={completeOnboarding}
          djProfile={djProfile}
          setDjProfile={setDjProfile}
        />
      </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  const renderScreen = () => {
    return (
      <View style={styles.screenContainer}>
        {renderScreenContent(currentScreen)}
      </View>
    );
  };

  const renderScreenContent = (screen) => {
    switch (screen) {
      case "opportunities":
        return (
          <OpportunitiesSwipe
            onApply={(opportunity) => {
              console.log("Applied to:", opportunity.name);
              setAppliedOpportunity(opportunity);
              setShowApplicationSentModal(true);
            }}
            onPass={(opportunity) => {
              console.log("Passed on:", opportunity.name);
            }}
          />
        );

      case "connections":
        return (
          <ConnectionsScreen
            onNavigate={(screen, params = {}) => {
              setCurrentScreen(screen);
              setScreenParams(params);
            }}
          />
        );

      case "listen":
        return (
          <ListenScreen
            globalAudioState={globalAudioState}
            onPlayAudio={playGlobalAudio}
            onPauseAudio={pauseGlobalAudio}
            onResumeAudio={resumeGlobalAudio}
            onStopAudio={stopGlobalAudio}
          />
        );

      case "messages":
        return (
          <MessagesScreen
            navigation={{ goBack: () => setCurrentScreen("home") }}
            route={{ params: screenParams }}
          />
        );

      case "notifications":
        return (
          <ScrollView style={styles.screen}>
            <Text style={styles.tsBlockBoldHeading}>NOTIFICATIONS</Text>
            <View style={styles.notificationCard}>
              <Text style={styles.notificationTitle}>New Opportunity</Text>
              <Text style={styles.notificationText}>
                Underground Warehouse Rave is looking for DJs
              </Text>
              <Text style={styles.notificationTime}>2 hours ago</Text>
            </View>
            <View style={styles.notificationCard}>
              <Text style={styles.notificationTitle}>Application Accepted</Text>
              <Text style={styles.notificationText}>
                Your application for Club Neon has been accepted
              </Text>
              <Text style={styles.notificationTime}>1 day ago</Text>
            </View>
            <View style={styles.notificationCard}>
              <Text style={styles.notificationTitle}>New Message</Text>
              <Text style={styles.notificationText}>
                You have a new message from Darkside Collective
              </Text>
              <Text style={styles.notificationTime}>3 days ago</Text>
            </View>
          </ScrollView>
        );

      case "community":
        return (
          <ScrollView style={styles.screen}>
            <Text style={styles.tsBlockBoldHeading}>COMMUNITY</Text>
            <View style={styles.communityCard}>
              <Text style={styles.communityTitle}>Underground DJs</Text>
              <Text style={styles.communityMembers}>1,234 members</Text>
              <Text style={styles.communityDescription}>
                Connect with underground DJs worldwide
              </Text>
            </View>
            <View style={styles.communityCard}>
              <Text style={styles.communityTitle}>Techno Collective</Text>
              <Text style={styles.communityMembers}>856 members</Text>
              <Text style={styles.communityDescription}>
                Share techno tracks and collaborate
              </Text>
            </View>
            <View style={styles.communityCard}>
              <Text style={styles.communityTitle}>Miami Music Scene</Text>
              <Text style={styles.communityMembers}>432 members</Text>
              <Text style={styles.communityDescription}>
                Local Miami DJs and producers
              </Text>
            </View>
          </ScrollView>
        );

      case "profile":
        return (
          <ScrollView style={styles.profileScreen}>
            {/* Profile Header Card */}
            <View style={styles.profileHeaderCard}>
              <TouchableOpacity style={styles.editProfileButton}>
                <Ionicons
                  name="create-outline"
                  size={20}
                  color="hsl(0, 0%, 100%)"
                />
              </TouchableOpacity>

              <View style={styles.profileImageContainer}>
                <Image
                  source={{
                    uri: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
                  }}
                  style={styles.profileImage}
                />
              </View>

              <Text style={styles.profileDisplayName}>Eloka Agu</Text>
              <Text style={styles.profileUsername}>@elokaagu</Text>

              <View style={styles.profileRating}>
                <Ionicons name="star" size={16} color="hsl(75, 100%, 60%)" />
                <Text style={styles.ratingText}>4.8 • 12 gigs</Text>
              </View>

              <Text style={styles.profileBio}>
                Underground techno enthusiast with 5 years of experience.
                Specializing in dark, industrial beats that make crowds move.
                Always looking for new opportunities to showcase my sound.
              </Text>

              <View style={styles.profileLocation}>
                <Ionicons
                  name="location-outline"
                  size={16}
                  color="hsl(0, 0%, 70%)"
                />
                <Text style={styles.locationText}>London</Text>
                </View>
            </View>

            {/* Stats Cards */}
            <View style={styles.statsCardsContainer}>
              <View style={styles.statCard}>
                <Ionicons name="flash" size={24} color="hsl(75, 100%, 60%)" />
                  <Text style={styles.statNumber}>156</Text>
                <Text style={styles.statLabel}>Credits</Text>
                </View>
              <View style={styles.statCard}>
                <Ionicons name="people" size={24} color="hsl(75, 100%, 60%)" />
                <Text style={styles.statNumber}>12</Text>
                <Text style={styles.statLabel}>Gigs Done</Text>
                </View>
              </View>

            {/* Genres Card */}
            <View style={styles.genresCard}>
              <Text style={styles.cardTitle}>♫ Genres</Text>
              <View style={styles.genresContainer}>
                {["Techno", "House", "Industrial", "Drum & Bass"].map(
                  (genre, index) => (
                    <View key={index} style={styles.genreTag}>
                      <Text style={styles.genreTagText}>{genre}</Text>
                    </View>
                  )
                )}
              </View>
            </View>

            {/* Audio ID Card */}
            <View style={styles.audioIdCard}>
              <Text style={styles.cardTitle}>🔊 Audio ID</Text>
              <View style={styles.audioPlayer}>
                <View style={styles.audioInfo}>
                  <Text style={styles.trackTitle}>Dark Industrial Mix #1</Text>
                  <Text style={styles.trackDetails}>5:23 • Deep Techno</Text>
                </View>
                <TouchableOpacity style={styles.playButton}>
                  <Ionicons name="play" size={20} color="hsl(0, 0%, 0%)" />
              </TouchableOpacity>
            </View>
              <View style={styles.waveformContainer}>
                {[3, 5, 2, 7, 4, 6, 3, 8, 5, 4, 6, 3, 5, 7, 4, 2].map(
                  (height, index) => (
                    <View
                      key={index}
                      style={[styles.waveformBar, { height: height * 2 }]}
                    />
                  )
                )}
              </View>
              <View style={styles.progressContainer}>
                <Text style={styles.timeText}>1:23</Text>
                <View style={styles.progressBar}>
                  <View style={styles.progressFill} />
                </View>
                <Text style={styles.timeText}>5:23</Text>
              </View>
            </View>

            {/* Social Links Card */}
            <View style={styles.socialLinksCard}>
              <Text style={styles.cardTitle}>Social Links</Text>
              <TouchableOpacity style={styles.socialLink}>
                <View style={styles.instagramIcon}>
                  <Ionicons
                    name="logo-instagram"
                    size={20}
                    color="hsl(0, 0%, 100%)"
                  />
                </View>
                <Text style={styles.socialLinkText}>@alexbeats_official</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialLink}>
                <View style={styles.soundcloudIcon}>
                  <Ionicons
                    name="musical-notes"
                    size={20}
                    color="hsl(0, 0%, 100%)"
                  />
                </View>
                <Text style={styles.socialLinkText}>
                  soundcloud.com/alexbeats
                </Text>
              </TouchableOpacity>
            </View>

            {/* Recent Gigs Card */}
            <View style={styles.recentGigsCard}>
              <Text style={styles.cardTitle}>📅 Recent Gigs</Text>
              <View style={styles.gigItem}>
                <View style={styles.gigInfo}>
                  <Text style={styles.gigTitle}>Warehouse Sessions #12</Text>
                  <Text style={styles.gigLocation}>East London Warehouse</Text>
                  <Text style={styles.gigDate}>2024-07-20</Text>
                </View>
                <View style={styles.gigStats}>
                  <Text style={styles.gigFee}>£300</Text>
                  <Text style={styles.gigRating}>☆ 5</Text>
                </View>
              </View>
              <View style={styles.gigSeparator} />
              <View style={styles.gigItem}>
                <View style={styles.gigInfo}>
                  <Text style={styles.gigTitle}>Underground Collective</Text>
                  <Text style={styles.gigLocation}>Secret Location</Text>
                  <Text style={styles.gigDate}>2024-07-08</Text>
                </View>
                <View style={styles.gigStats}>
                  <Text style={styles.gigFee}>£250</Text>
                  <Text style={styles.gigRating}>☆ 4.5</Text>
                </View>
              </View>
              <View style={styles.gigSeparator} />
              <View style={styles.gigItem}>
                <View style={styles.gigInfo}>
                  <Text style={styles.gigTitle}>Basement Rave</Text>
                  <Text style={styles.gigLocation}>Camden Club</Text>
                  <Text style={styles.gigDate}>2024-06-25</Text>
                </View>
                <View style={styles.gigStats}>
                  <Text style={styles.gigFee}>£400</Text>
                  <Text style={styles.gigRating}>☆ 5</Text>
                </View>
              </View>
            </View>

            {/* Footer */}
            <Text style={styles.memberSince}>Member since March 2024</Text>
          </ScrollView>
        );

      case "settings":
        return (
          <ScrollView style={styles.screen}>
            <Text style={styles.tsBlockBoldHeading}>SETTINGS</Text>
            <View style={styles.settingsCard}>
              <Text style={styles.settingsTitle}>Account</Text>
              <TouchableOpacity
                style={styles.settingsItem}
                onPress={handleEditProfile}
              >
                <Text style={styles.settingsItemText}>Edit Profile</Text>
                <Text style={styles.settingsArrow}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.settingsItem}>
                <Text style={styles.settingsItemText}>Privacy Settings</Text>
                <Text style={styles.settingsArrow}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.settingsItem}>
                <Text style={styles.settingsItemText}>
                  Notification Preferences
                </Text>
                <Text style={styles.settingsArrow}>›</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.settingsCard}>
              <Text style={styles.settingsTitle}>App</Text>
              <TouchableOpacity style={styles.settingsItem}>
                <Text style={styles.settingsItemText}>Theme</Text>
                <Text style={styles.settingsArrow}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.settingsItem}>
                <Text style={styles.settingsItemText}>Language</Text>
                <Text style={styles.settingsArrow}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.settingsItem}>
                <Text style={styles.settingsItemText}>About R/HOOD</Text>
                <Text style={styles.settingsArrow}>›</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.settingsCard}>
              <Text style={styles.settingsTitle}>Account</Text>
              <TouchableOpacity
                style={styles.settingsItem}
                onPress={handleLogout}
              >
                <Text
                  style={[
                    styles.settingsItemText,
                    { color: "hsl(0, 100%, 50%)" },
                  ]}
                >
                  Sign Out
                </Text>
                <Text style={styles.settingsArrow}>›</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        );

      default:
        return (
          <OpportunitiesSwipe
            onApply={(opportunity) => {
              console.log("Applied to:", opportunity.name);
              Alert.alert(
                "Application Sent",
                `You've applied to ${opportunity.name}!`
              );
            }}
            onPass={(opportunity) => {
              console.log("Passed on:", opportunity.name);
            }}
          />
        );
    }
  };

  return (
    <SafeAreaProvider>
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
            <Image
              source={require("./assets/RHOOD_Lettering_Logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setShowMenu(true)}
          >
            <Ionicons name="menu" size={24} color="hsl(0, 0%, 100%)" />
          </TouchableOpacity>
        </View>
      </View>

      {renderScreen()}

        {/* Hide tab bar on messages screen */}
        {currentScreen !== "messages" && (
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[
            styles.tab,
            currentScreen === "opportunities" && styles.activeTab,
          ]}
          onPress={() => handleMenuNavigation("opportunities")}
        >
          <Ionicons
            name="briefcase-outline"
            size={20}
            color={
              currentScreen === "opportunities"
                    ? "#C2CC06"
                : "hsl(0, 0%, 70%)"
            }
          />
          <Text
            style={[
              styles.tabText,
              currentScreen === "opportunities" && styles.activeTabText,
            ]}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
          >
            Opportunities
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            currentScreen === "connections" && styles.activeTab,
          ]}
          onPress={() => handleMenuNavigation("connections")}
        >
          <Ionicons
            name="people-outline"
            size={20}
            color={
              currentScreen === "connections"
                    ? "#C2CC06"
                : "hsl(0, 0%, 70%)"
            }
          />
          <Text
            style={[
              styles.tabText,
              currentScreen === "connections" && styles.activeTabText,
            ]}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
          >
            Connections
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
              style={[
                styles.tab,
                currentScreen === "listen" && styles.activeTab,
              ]}
          onPress={() => handleMenuNavigation("listen")}
        >
          <Ionicons
            name="musical-notes-outline"
            size={20}
            color={
                  currentScreen === "listen" ? "#C2CC06" : "hsl(0, 0%, 70%)"
            }
          />
          <Text
            style={[
              styles.tabText,
              currentScreen === "listen" && styles.activeTabText,
            ]}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
          >
            Listen
          </Text>
        </TouchableOpacity>
      </View>
        )}

      {/* Hamburger Menu Modal */}
      <Modal
        visible={showMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContainer}>
            <View style={styles.menuContent}>
              <View style={styles.menuHeader}>
                  <Text style={styles.tsBlockBoldHeading}>MENU</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowMenu(false)}
                >
                  <Ionicons name="close" size={24} color="hsl(0, 0%, 100%)" />
                </TouchableOpacity>
              </View>

              <View style={styles.menuItems}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleMenuNavigation("messages")}
                >
                  <Ionicons
                    name="chatbubbles-outline"
                    size={20}
                      color="#C2CC06"
                  />
                  <Text style={styles.menuItemText}>Messages</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleMenuNavigation("notifications")}
                >
                  <Ionicons
                    name="notifications-outline"
                    size={20}
                      color="#C2CC06"
                  />
                  <Text style={styles.menuItemText}>Notifications</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleMenuNavigation("community")}
                >
                    <Ionicons name="people-outline" size={20} color="#C2CC06" />
                  <Text style={styles.menuItemText}>Community</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleMenuNavigation("profile")}
                >
                    <Ionicons name="person-outline" size={20} color="#C2CC06" />
                  <Text style={styles.menuItemText}>Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleMenuNavigation("settings")}
                >
                  <Ionicons
                    name="settings-outline"
                    size={20}
                      color="#C2CC06"
                  />
                  <Text style={styles.menuItemText}>Settings</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Global Audio Player - shows on all screens when audio is playing */}
      {globalAudioState.isPlaying && globalAudioState.currentTrack && (
        <TouchableOpacity
          style={styles.globalAudioPlayer}
          onPress={() => setShowFullScreenPlayer(true)}
          activeOpacity={0.8}
        >
          <View style={styles.audioPlayerContent}>
            <View style={styles.audioTrackInfo}>
              <Text style={styles.audioTrackTitle} numberOfLines={1}>
                {globalAudioState.currentTrack.title}
              </Text>
              <Text style={styles.audioTrackArtist} numberOfLines={1}>
                {globalAudioState.currentTrack.artist}
              </Text>
            </View>

            <View style={styles.audioControls}>
              <TouchableOpacity
                style={styles.audioControlButton}
                onPress={(e) => {
                  e.stopPropagation();
                  globalAudioState.isPlaying
                    ? pauseGlobalAudio()
                    : resumeGlobalAudio();
                }}
              >
                <Ionicons
                  name={globalAudioState.isPlaying ? "pause" : "play"}
                  size={20}
                  color="hsl(0, 0%, 100%)"
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.audioControlButton}
                onPress={(e) => {
                  e.stopPropagation();
                  stopGlobalAudio();
                }}
              >
                <Ionicons name="stop" size={20} color="hsl(0, 0%, 100%)" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.audioProgressContainer}>
            <View
              style={[
                styles.audioProgressBar,
                { width: `${globalAudioState.progress}%` },
              ]}
            />
          </View>
        </TouchableOpacity>
      )}

      {/* Full-Screen Audio Player Modal */}
      {showFullScreenPlayer && globalAudioState.currentTrack && (
        <Modal
          visible={showFullScreenPlayer}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowFullScreenPlayer(false)}
        >
          <View style={styles.fullScreenPlayerOverlay}>
            <View style={styles.fullScreenPlayer}>
              {/* Header with close button */}
              <View style={styles.fullScreenHeader}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowFullScreenPlayer(false)}
                >
                  <Ionicons
                    name="chevron-down"
                    size={24}
                    color="hsl(0, 0%, 100%)"
                  />
                </TouchableOpacity>
              </View>

              {/* Album Artwork */}
              <View style={styles.albumArtContainer}>
                <Image
                  source={{ uri: globalAudioState.currentTrack.image }}
                  style={styles.albumArt}
                  resizeMode="cover"
                />
              </View>

              {/* Track Info */}
              <View style={styles.fullScreenTrackInfo}>
                <Text style={styles.fullScreenTrackTitle}>
                  {globalAudioState.currentTrack.title}
                </Text>
                <Text style={styles.fullScreenTrackArtist}>
                  {globalAudioState.currentTrack.artist}
                </Text>
                <Text style={styles.fullScreenTrackGenre}>
                  {globalAudioState.currentTrack.genre}
                </Text>
              </View>

              {/* Progress Section */}
              <View style={styles.fullScreenProgressSection}>
                <View style={styles.fullScreenProgressContainer}>
                  <View
                    style={[
                      styles.fullScreenProgressBar,
                      { width: `${globalAudioState.progress}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {formatTime(globalAudioState.positionMillis)} /{" "}
                  {formatTime(globalAudioState.durationMillis)}
                </Text>
              </View>

              {/* Control Buttons */}
              <View style={styles.fullScreenControls}>
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={toggleShuffle}
                >
                  <Ionicons
                    name="shuffle"
                    size={24}
                    color={
                      globalAudioState.isShuffled
                          ? "#C2CC06"
                        : "hsl(0, 0%, 70%)"
                    }
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={skipBackward}
                >
                  <Ionicons
                    name="play-skip-back"
                    size={28}
                    color="hsl(0, 0%, 100%)"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.playPauseButton}
                  onPress={
                    globalAudioState.isPlaying
                      ? pauseGlobalAudio
                      : resumeGlobalAudio
                  }
                >
                  <Ionicons
                    name={globalAudioState.isPlaying ? "pause" : "play"}
                    size={40}
                    color="hsl(0, 0%, 0%)"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={skipForward}
                >
                  <Ionicons
                    name="play-skip-forward"
                    size={28}
                    color="hsl(0, 0%, 100%)"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={toggleRepeat}
                >
                  <Ionicons
                    name={
                      globalAudioState.repeatMode === "none"
                        ? "repeat"
                        : globalAudioState.repeatMode === "one"
                        ? "repeat"
                        : "repeat"
                    }
                    size={24}
                    color={
                      globalAudioState.repeatMode === "none"
                        ? "hsl(0, 0%, 70%)"
                        : "hsl(75, 100%, 60%)"
                    }
                  />
                </TouchableOpacity>
              </View>

              {/* Additional Actions */}
              <View style={styles.fullScreenActions}>
                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons
                    name="heart-outline"
                    size={20}
                    color="hsl(0, 0%, 70%)"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={shareTrack}
                >
                  <Ionicons
                    name="share-outline"
                    size={20}
                    color="hsl(0, 0%, 70%)"
                  />
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={20}
                    color="hsl(0, 0%, 70%)"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Application Sent Modal */}
      <RhoodModal
        visible={showApplicationSentModal}
        onClose={() => setShowApplicationSentModal(false)}
        title="Application Sent!"
        message={
          appliedOpportunity
            ? `You've applied to ${appliedOpportunity.name}!`
            : "Application sent successfully!"
        }
        type="success"
        primaryButtonText="OK"
      />

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditProfile}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleProfileCancel}
      >
        <EditProfileScreen
          user={user}
          onSave={handleProfileSaved}
          onCancel={handleProfileCancel}
        />
      </Modal>

        {/* Black fade overlay for splash screen transition */}
        {showFadeOverlay && (
          <Animated.View
            style={[
              styles.fadeOverlay,
              {
                opacity: fadeOverlayAnim,
              },
            ]}
          />
        )}
    </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000", // Pure black background to match tab bar
  },
  screenContainer: {
    flex: 1,
    position: "relative",
    paddingBottom: 20, // Minimal bottom padding for floating tab bar
    backgroundColor: "#000000", // Pure black background
  },
  onboarding: {
    backgroundColor: "#000000", // Pure black background
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20, // Minimal bottom padding for floating tab bar
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  header: {
    backgroundColor: "#000000", // Pure black background
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)", // Subtle border
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "flex-start",
    paddingLeft: 0, // Remove any left padding
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 30%)",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start", // Ensure left alignment
  },
  logoText: {
    color: "#C2CC06", // Brand lime green
    fontSize: 18,
    fontFamily: "Arial Black",
    fontWeight: "900",
    letterSpacing: 1,
  },
  logoTextGreen: {
    color: "#C2CC06", // Brand lime green - matches the green logo
    fontSize: 20,
    fontFamily: "Arial Black",
    fontWeight: "900",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  logoTextWhite: {
    color: "#FFFFFF", // White - matches the white logo
    fontSize: 20,
    fontFamily: "Arial Black",
    fontWeight: "900",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  logoTextBlack: {
    color: "#000000", // Black - matches the black logo
    fontSize: 20,
    fontFamily: "Arial Black",
    fontWeight: "900",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  logoImage: {
    height: 36,
    width: 140, // Reduced size for better proportion
    alignSelf: "flex-start", // Ensure left alignment
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "transparent", // Transparent background
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 30%)", // Subtle border
  },
  headerIconText: {
    fontSize: 16,
    color: "#FFFFFF", // Brand white
    fontWeight: "300",
  },
  screen: {
    flex: 1,
    padding: 20,
    paddingBottom: 20, // Minimal bottom padding for floating tab bar
    backgroundColor: "#000000", // Pure black background
  },
  screenTitle: {
    fontSize: 24,
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
    color: "#FFFFFF", // Brand white text
    marginBottom: 20,
    textAlign: "center",
    lineHeight: 28.8, // 120% of 24pt
    letterSpacing: 0, // Tracking set to 0
  },
  title: {
    fontSize: 32,
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
    color: "#C2CC06", // Brand lime green
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: 0, // Tracking set to 0
    lineHeight: 38.4, // 120% of 32pt
  },
  // TS Block Bold for impactful headings
  tsBlockBoldHeading: {
    fontFamily: "TS-Block-Bold",
    fontSize: 28,
    color: "#FFFFFF", // Brand white
    textAlign: "left", // Left aligned as per guidelines
    textTransform: "uppercase", // Always uppercase
    lineHeight: 32, // Tight line height for stacked effect
    letterSpacing: 1, // Slight spacing for impact
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "300", // Light weight
    color: "hsl(0, 0%, 70%)", // Muted foreground
    textAlign: "center",
    marginBottom: 30,
    letterSpacing: 0, // Tracking set to 0
    lineHeight: 19.2, // 120% of 16pt
  },
  form: {
    width: "100%",
    marginBottom: 30,
    backgroundColor: "#1D1D1B", // Brand black background
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Subtle border
  },
  formTitle: {
    fontSize: 20,
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
    color: "#FFFFFF", // Brand white text
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 24, // 120% of 20pt
    letterSpacing: 0, // Tracking set to 0
  },
  label: {
    color: "#FFFFFF", // Brand white text
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
    marginBottom: 5,
    marginTop: 15,
    lineHeight: 19.2, // 120% of 16pt
    letterSpacing: 0, // Tracking set to 0
  },
  input: {
    backgroundColor: "hsl(0, 0%, 10%)", // Input background
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "300", // Light weight
    color: "#FFFFFF", // Brand white text
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Subtle border
    lineHeight: 19.2, // 120% of 16pt
    letterSpacing: 0, // Tracking set to 0
  },
  dropdownButton: {
    backgroundColor: "hsl(0, 0%, 10%)", // Input background
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Subtle border
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "300", // Light weight
    color: "#FFFFFF", // Brand white text
    flex: 1,
    lineHeight: 19.2, // 120% of 16pt
    letterSpacing: 0, // Tracking set to 0
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
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: "hsl(0, 0%, 10%)", // Dark background
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Subtle border
    maxHeight: 200,
    zIndex: 1000,
  },
  dropdownItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)", // Subtle border
  },
  dropdownItemText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "300", // Light weight
    color: "#FFFFFF", // Brand white text
    lineHeight: 19.2, // 120% of 16pt
    letterSpacing: 0, // Tracking set to 0
  },
  genreContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },
  genreTag: {
    backgroundColor: "hsl(0, 0%, 15%)", // Muted background
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 20%)",
  },
  genreTagSelected: {
    backgroundColor: "#C2CC06", // Brand lime green
    borderColor: "#C2CC06",
  },
  genreTagText: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    fontWeight: "300", // Light weight
    color: "#FFFFFF", // Brand white text
    lineHeight: 14.4, // 120% of 12pt
    letterSpacing: 0, // Tracking set to 0
  },
  genreTagTextSelected: {
    color: "hsl(0, 0%, 0%)", // Black text on selected
  },
  button: {
    backgroundColor: "#C2CC06", // Brand lime green
    borderRadius: 8,
    paddingHorizontal: 40,
    paddingVertical: 15,
    // Removed glow effects
  },
  buttonText: {
    color: "hsl(0, 0%, 0%)", // Black text on primary
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
    textAlign: "center",
    lineHeight: 19.2, // 120% of 16pt
    letterSpacing: 0, // Tracking set to 0
  },
  welcomeText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "300", // Light weight
    color: "hsl(0, 0%, 70%)", // Muted foreground
    textAlign: "center",
    lineHeight: 19.2, // 120% of 16pt
    marginBottom: 20,
    letterSpacing: 0, // Tracking set to 0
  },
  featuresCard: {
    backgroundColor: "#1D1D1B", // Brand black background
    borderRadius: 8,
    padding: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Subtle border
  },
  featuresTitle: {
    fontSize: 18,
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
    color: "#FFFFFF", // Brand white text
    marginBottom: 15,
    lineHeight: 21.6, // 120% of 18pt
    letterSpacing: 0, // Tracking set to 0
  },
  featureItem: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    fontWeight: "300", // Light weight
    color: "hsl(0, 0%, 70%)", // Muted foreground
    marginBottom: 8,
    lineHeight: 16.8, // 120% of 14pt
    letterSpacing: 0, // Tracking set to 0
  },
  eventCard: {
    backgroundColor: "#1D1D1B", // Brand black background
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Subtle border
    // Removed glow effects
  },
  eventDJ: {
    fontSize: 16,
    fontFamily: "Arial",
    fontWeight: "bold",
    color: "#C2CC06", // Brand lime green
    marginBottom: 5,
  },
  eventTitle: {
    fontSize: 18,
    fontFamily: "Arial",
    fontWeight: "bold",
    color: "#FFFFFF", // Brand white text
    marginBottom: 8,
  },
  eventInfo: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)", // Muted foreground
    marginBottom: 4,
  },
  eventActions: {
    flexDirection: "row",
    marginTop: 10,
    gap: 10,
  },
  actionButton: {
    backgroundColor: "hsl(0, 0%, 15%)", // Muted background
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 20%)",
  },
  actionText: {
    fontSize: 12,
    fontFamily: "Arial",
    color: "#FFFFFF", // Brand white text
  },
  messageCard: {
    backgroundColor: "#1D1D1B", // Brand black background
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Subtle border
  },
  messageName: {
    fontSize: 16,
    fontFamily: "Arial",
    fontWeight: "bold",
    color: "#FFFFFF", // Brand white text
    marginBottom: 5,
  },
  messagePreview: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)", // Muted foreground
    marginBottom: 5,
  },
  messageTime: {
    fontSize: 12,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 50%)", // More muted text
  },
  profileCard: {
    backgroundColor: "#1D1D1B", // Brand black background
    borderRadius: 8,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Subtle border
  },
  profileDJ: {
    fontSize: 24,
    fontFamily: "Arial Black",
    fontWeight: "900",
    color: "#C2CC06", // Brand lime green
    marginBottom: 5,
    // Removed glow effects
  },
  profileName: {
    fontSize: 16,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)", // Muted foreground
    marginBottom: 5,
  },
  profileCity: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)", // Muted foreground
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 20,
  },
  stat: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    fontFamily: "Arial",
    fontWeight: "bold",
    color: "#C2CC06", // Brand lime green
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)", // Muted foreground
  },
  editButton: {
    backgroundColor: "#C2CC06", // Brand lime green
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    // Removed glow effects
  },
  editButtonText: {
    color: "hsl(0, 0%, 0%)", // Black text on primary
    fontSize: 14,
    fontFamily: "Arial",
    fontWeight: "bold",
  },
  tabBar: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: "row",
    backgroundColor: "#1E1E1E", // Solid dark grey background with no transparency
    borderRadius: 25,
    paddingVertical: 8,
    paddingHorizontal: 16,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8, // Android shadow
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    flexDirection: "column",
    gap: 4,
    marginHorizontal: 2,
    backgroundColor: "transparent", // Ensure 0 opacity for all tabs
  },
  activeTab: {
    backgroundColor: "transparent", // Remove background for active tab
  },
  tabText: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 70%)", // Muted foreground
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  activeTabText: {
    color: "#C2CC06", // Brand lime green for active text
    fontWeight: "600",
  },
  // Opportunities Screen Styles
  featuredOpportunityCard: {
    backgroundColor: "#1D1D1B", // Brand black background
    borderRadius: 12,
    marginBottom: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Subtle border
  },
  opportunityImageContainer: {
    position: "relative",
    height: 200,
    backgroundColor: "hsl(0, 0%, 10%)", // Dark background for image placeholder
    justifyContent: "center",
    alignItems: "center",
  },
  opportunityImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "hsl(0, 0%, 20%)",
    justifyContent: "center",
    alignItems: "center",
  },
  opportunityImageText: {
    fontSize: 40,
    color: "#C2CC06", // Brand lime green
  },
  genreTag: {
    position: "absolute",
    top: 15,
    right: 15,
    backgroundColor: "hsl(0, 0%, 0%)", // Black background
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  genreTagText: {
    fontSize: 12,
    fontFamily: "Arial",
    color: "#FFFFFF", // Brand white text
    fontWeight: "bold",
  },
  opportunityContent: {
    padding: 20,
  },
  opportunityTitle: {
    fontSize: 20,
    fontFamily: "Arial",
    fontWeight: "bold",
    color: "#FFFFFF", // Brand white text
    marginBottom: 10,
  },
  opportunityDescription: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)", // Muted foreground
    lineHeight: 20,
    marginBottom: 15,
  },
  opportunityDetails: {
    marginBottom: 15,
  },
  opportunityDetail: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "#FFFFFF", // Brand white text
    marginBottom: 5,
  },
  opportunityFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  skillLevelTag: {
    backgroundColor: "hsl(0, 0%, 15%)", // Muted background
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  skillLevelText: {
    fontSize: 12,
    fontFamily: "Arial",
    color: "#FFFFFF", // Brand white text
    fontWeight: "bold",
  },
  organizerName: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)", // Muted foreground
    fontWeight: "bold",
  },
  opportunityActions: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    gap: 40,
  },
  passButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "hsl(0, 0%, 15%)", // Muted background
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "hsl(0, 0%, 25%)",
  },
  passButtonText: {
    fontSize: 24,
    color: "#FFFFFF", // Brand white text
    fontWeight: "bold",
  },
  applyButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#C2CC06", // Brand lime green
    justifyContent: "center",
    alignItems: "center",
  },
  applyButtonText: {
    fontSize: 24,
    color: "hsl(0, 0%, 0%)", // Black text on primary
    fontWeight: "bold",
  },
  actionHint: {
    fontSize: 12,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 50%)", // Muted text
    textAlign: "center",
    marginBottom: 30,
  },
  opportunityCard: {
    backgroundColor: "#1D1D1B", // Brand black background
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Subtle border
  },
  opportunityDJ: {
    fontSize: 16,
    fontFamily: "Arial",
    fontWeight: "bold",
    color: "#C2CC06", // Brand lime green
    marginBottom: 5,
  },
  opportunityInfo: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)", // Muted foreground
    marginBottom: 4,
  },
  // Notifications Screen Styles
  notificationCard: {
    backgroundColor: "#1D1D1B", // Brand black background
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Subtle border
  },
  notificationTitle: {
    fontSize: 16,
    fontFamily: "Arial",
    fontWeight: "bold",
    color: "#FFFFFF", // Brand white text
    marginBottom: 5,
  },
  notificationText: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)", // Muted foreground
    marginBottom: 8,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 50%)", // More muted text
  },
  // Community Screen Styles
  communityCard: {
    backgroundColor: "#1D1D1B", // Brand black background
    borderRadius: 8,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Subtle border
  },
  communityTitle: {
    fontSize: 18,
    fontFamily: "Arial",
    fontWeight: "bold",
    color: "#C2CC06", // Brand lime green
    marginBottom: 5,
  },
  communityMembers: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)", // Muted foreground
    marginBottom: 8,
  },
  communityDescription: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "#FFFFFF", // Brand white text
    lineHeight: 20,
  },
  // Settings Screen Styles
  settingsCard: {
    backgroundColor: "#1D1D1B", // Brand black background
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Subtle border
  },
  settingsTitle: {
    fontSize: 16,
    fontFamily: "Arial",
    fontWeight: "bold",
    color: "#C2CC06", // Brand lime green
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)", // Subtle border
  },
  settingsItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 10%)", // Very subtle border
  },
  settingsItemText: {
    fontSize: 16,
    fontFamily: "Arial",
    color: "#FFFFFF", // Brand white text
  },
  settingsArrow: {
    fontSize: 18,
    color: "hsl(0, 0%, 50%)", // Muted text
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "hsl(0, 0%, 70%)",
    fontFamily: "Arial",
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 8,
    fontFamily: "Arial",
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "hsl(0, 0%, 70%)",
    fontFamily: "Arial",
  },
  // Hamburger Menu Styles
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-end",
  },
  menuContainer: {
    backgroundColor: "hsl(0, 0%, 5%)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
    borderBottomWidth: 0,
  },
  menuContent: {
    padding: 20,
  },
  menuHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  menuTitle: {
    fontSize: 20,
    fontFamily: "Arial Black",
    fontWeight: "900",
    color: "hsl(0, 0%, 100%)",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "hsl(0, 0%, 15%)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuItems: {
    gap: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "hsl(0, 0%, 10%)",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  menuItemText: {
    fontSize: 16,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 100%)",
    marginLeft: 12,
    fontWeight: "500",
  },

  // Global Audio Player Styles
  globalAudioPlayer: {
    position: "absolute",
    bottom: 100, // Above tab bar
    left: 0,
    right: 0,
    backgroundColor: "#1D1D1B",
    borderTopWidth: 1,
    borderTopColor: "hsl(0, 0%, 15%)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    zIndex: 1000,
  },
  audioPlayerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  audioTrackInfo: {
    flex: 1,
    marginRight: 16,
  },
  audioTrackTitle: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 100%)",
    fontWeight: "600",
    marginBottom: 2,
  },
  audioTrackArtist: {
    fontSize: 12,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)",
  },
  audioControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  audioControlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#C2CC06",
    justifyContent: "center",
    alignItems: "center",
  },
  audioProgressContainer: {
    height: 3,
    backgroundColor: "hsl(0, 0%, 15%)",
    borderRadius: 1.5,
    marginTop: 8,
    overflow: "hidden",
  },
  audioProgressBar: {
    height: "100%",
    backgroundColor: "#C2CC06",
    borderRadius: 1.5,
  },

  // Full-Screen Player Styles
  fullScreenPlayerOverlay: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 0%)",
  },
  fullScreenPlayer: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  fullScreenHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 30,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "hsl(0, 0%, 15%)",
    justifyContent: "center",
    alignItems: "center",
  },
  albumArtContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  albumArt: {
    width: 300,
    height: 300,
    borderRadius: 20,
    shadowColor: "#C2CC06",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  fullScreenTrackInfo: {
    alignItems: "center",
    marginBottom: 40,
  },
  fullScreenTrackTitle: {
    fontSize: 24,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 100%)",
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  fullScreenTrackArtist: {
    fontSize: 18,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)",
    textAlign: "center",
    marginBottom: 4,
  },
  fullScreenTrackGenre: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "#C2CC06",
    textAlign: "center",
  },
  fullScreenProgressSection: {
    marginBottom: 40,
  },
  fullScreenProgressContainer: {
    height: 4,
    backgroundColor: "hsl(0, 0%, 20%)",
    borderRadius: 2,
    marginBottom: 12,
  },
  fullScreenProgressBar: {
    height: "100%",
    backgroundColor: "#C2CC06",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 50%)",
    textAlign: "center",
  },
  fullScreenControls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
    gap: 20,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  playPauseButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#C2CC06",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#C2CC06",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  fullScreenActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 30,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "hsl(0, 0%, 15%)",
    justifyContent: "center",
    alignItems: "center",
  },
  fadeOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000000",
    zIndex: 10000,
  },

  // New Profile Page Styles
  profileScreen: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 0%)",
    padding: 16,
  },
  profileHeaderCard: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%)",
    position: "relative",
  },
  editProfileButton: {
    position: "absolute",
    top: 16,
    right: 16,
    padding: 8,
  },
  profileImageContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "hsl(75, 100%, 60%)",
    justifyContent: "center",
    alignItems: "center",
  },
  profileImageText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "hsl(0, 0%, 0%)",
  },
  profileDisplayName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "hsl(0, 0%, 100%)",
    textAlign: "center",
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 16,
    color: "hsl(0, 0%, 70%)",
    textAlign: "center",
    marginBottom: 8,
  },
  profileRating: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  ratingText: {
    fontSize: 14,
    color: "hsl(0, 0%, 100%)",
    marginLeft: 4,
  },
  profileBio: {
    fontSize: 14,
    color: "hsl(0, 0%, 100%)",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  profileLocation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  locationText: {
    fontSize: 14,
    color: "hsl(0, 0%, 70%)",
    marginLeft: 4,
  },
  statsCardsContainer: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "bold",
    color: "hsl(0, 0%, 100%)",
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: "hsl(0, 0%, 70%)",
  },
  genresCard: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 16,
  },
  genresContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  genreTag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%)",
  },
  genreTagText: {
    fontSize: 14,
    color: "hsl(0, 0%, 100%)",
  },
  audioIdCard: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  audioPlayer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  audioInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 4,
  },
  trackDetails: {
    fontSize: 14,
    color: "hsl(0, 0%, 70%)",
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "hsl(75, 100%, 60%)",
    justifyContent: "center",
    alignItems: "center",
  },
  waveformContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    height: 40,
    marginBottom: 16,
    gap: 2,
  },
  waveformBar: {
    width: 3,
    backgroundColor: "hsl(0, 0%, 100%)",
    borderRadius: 1.5,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  timeText: {
    fontSize: 12,
    color: "hsl(0, 0%, 70%)",
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: "hsl(0, 0%, 20%)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    width: "25%",
    backgroundColor: "hsl(75, 100%, 60%)",
  },
  socialLinksCard: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  socialLink: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  instagramIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#E4405F",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  soundcloudIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#ff8800",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  socialLinkText: {
    fontSize: 14,
    color: "hsl(0, 0%, 100%)",
  },
  recentGigsCard: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  gigItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  gigInfo: {
    flex: 1,
  },
  gigTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 4,
  },
  gigLocation: {
    fontSize: 14,
    color: "hsl(0, 0%, 70%)",
    marginBottom: 2,
  },
  gigDate: {
    fontSize: 12,
    color: "hsl(0, 0%, 50%)",
  },
  gigStats: {
    alignItems: "flex-end",
  },
  gigFee: {
    fontSize: 16,
    fontWeight: "bold",
    color: "hsl(75, 100%, 60%)",
    marginBottom: 4,
  },
  gigRating: {
    fontSize: 14,
    color: "hsl(0, 0%, 70%)",
  },
  gigSeparator: {
    height: 1,
    backgroundColor: "hsl(0, 0%, 15%)",
    marginVertical: 8,
  },
  memberSince: {
    fontSize: 12,
    color: "hsl(0, 0%, 50%)",
    textAlign: "center",
    marginBottom: 20,
  },
});
