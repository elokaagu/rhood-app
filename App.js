import React, { useState, useEffect, useRef, useMemo } from "react";
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
  RefreshControl,
  PanResponder,
  Dimensions,
  AccessibilityInfo,
  Vibration,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import { useFonts } from "expo-font";
import * as Haptics from "expo-haptics";
import SplashScreen from "./components/SplashScreen";
import OnboardingForm from "./components/OnboardingForm";
import { setupAudioNotificationCategories, setupNotificationListeners, requestNotificationPermissions } from "./lib/notificationSetup";
import ConnectionsScreen from "./components/ConnectionsScreen";
import ConnectionsDiscoveryScreen from "./components/ConnectionsDiscoveryScreen";
import ListenScreen from "./components/ListenScreen";
import MessagesScreen from "./components/MessagesScreen";
import NotificationsScreen from "./components/NotificationsScreen";
import CommunityScreen from "./components/CommunityScreen";
import ProfileScreen from "./components/ProfileScreen";
import SettingsScreen from "./components/SettingsScreen";
import RhoodModal from "./components/RhoodModal";
import SwipeableOpportunityCard from "./components/SwipeableOpportunityCard";
// import BriefForm from "./components/BriefForm"; // REMOVED - no longer needed for simplified swipe-to-apply
import { db, auth, supabase } from "./lib/supabase";
import {
  ANIMATION_DURATION,
  NATIVE_ANIMATION_CONFIG,
  SPRING_CONFIG,
  PERFORMANCE_THRESHOLDS,
} from "./lib/performanceConstants";
import LoginScreen from "./components/LoginScreen";
import SignupScreen from "./components/SignupScreen";
import EditProfileScreen from "./components/EditProfileScreen";
import UserProfileView from "./components/UserProfileView";
import UploadMixScreen from "./components/UploadMixScreen";
import AboutScreen from "./components/AboutScreen";
import TermsOfServiceScreen from "./components/TermsOfServiceScreen";
import PrivacyPolicyScreen from "./components/PrivacyPolicyScreen";
import HelpCenterScreen from "./components/HelpCenterScreen";
// Push notifications temporarily disabled for Expo Go
// import {
//   registerForPushNotifications,
//   setupNotificationListeners,
// } from "./lib/pushNotifications";

// Static Album Art Component
const AnimatedAlbumArt = ({ image, isPlaying, style }) => {
  return (
    <View style={style}>
      {image ? (
        <Image
          source={{ uri: image }}
          style={styles.albumArtImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.albumArtPlaceholder}>
          <Ionicons name="musical-notes" size={48} color="hsl(75, 100%, 60%)" />
        </View>
      )}
    </View>
  );
};

// Enhanced Progress Bar Component
const EnhancedProgressBar = ({
  progress,
  duration,
  position,
  onSeek,
  isPlaying,
}) => {
  const progressAnim = useRef(new Animated.Value(progress)).current;
  const [isScrubbing, setIsScrubbing] = useState(false);

  // Format time helper function
  const formatTime = (milliseconds) => {
    if (!milliseconds || milliseconds < 0) return "0:00";
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    if (!isScrubbing) {
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 100,
        useNativeDriver: false,
      }).start();
    }
  }, [progress, isScrubbing]);

  const handleSeek = (event) => {
    const { locationX } = event.nativeEvent;
    const progressBarWidth = 300; // Approximate width
    const newProgress = Math.max(0, Math.min(1, locationX / progressBarWidth));

    setIsScrubbing(true);
    onSeek(newProgress);

    // Haptic feedback
    Vibration.vibrate(50);

    setTimeout(() => setIsScrubbing(false), 200);
  };

  return (
    <View style={styles.enhancedProgressContainer}>
      <TouchableOpacity
        style={styles.enhancedProgressBar}
        onPress={handleSeek}
        activeOpacity={0.8}
      >
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />
          <Animated.View
            style={[
              styles.progressThumb,
              {
                left: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 280], // Adjust based on bar width
                }),
              },
            ]}
          />
        </View>
      </TouchableOpacity>

      <View style={styles.timeContainer}>
        <Text style={styles.timeText}>{formatTime(position)}</Text>
        <Text style={styles.timeText}>{formatTime(duration)}</Text>
      </View>
    </View>
  );
};

// Auto-scrolling text component for long titles
const AutoScrollText = ({ text, style, containerWidth = 200 }) => {
  const scrollViewRef = useRef(null);
  const scrollAnim = useRef(new Animated.Value(0)).current;
  const [textWidth, setTextWidth] = useState(0);
  const [shouldScroll, setShouldScroll] = useState(false);

  useEffect(() => {
    if (textWidth > containerWidth && shouldScroll) {
      const scrollDistance = textWidth - containerWidth + 40; // Add padding for smooth loop
      const scrollDuration = Math.max(8000, scrollDistance * 30); // Much slower scroll

      const scrollAnimation = Animated.loop(
        Animated.timing(scrollAnim, {
          toValue: scrollDistance,
          duration: scrollDuration,
          useNativeDriver: true,
        })
      );

      scrollAnimation.start();

      return () => scrollAnimation.stop();
    }
  }, [textWidth, containerWidth, shouldScroll]);

  const handleTextLayout = (event) => {
    const { width } = event.nativeEvent.layout;
    setTextWidth(width);
    setShouldScroll(width > containerWidth);
  };

  return (
    <View style={{ width: containerWidth, overflow: "hidden" }}>
      <Animated.ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={{ width: containerWidth }}
        contentContainerStyle={{ alignItems: "center" }}
      >
        <Animated.View
          style={{
            transform: [{ translateX: scrollAnim }],
          }}
        >
          <Text style={style} onLayout={handleTextLayout} numberOfLines={1}>
            {text}
          </Text>
        </Animated.View>
      </Animated.ScrollView>
    </View>
  );
};

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
  const [showMenu, setShowMenu] = useState(false);
  const [showFadeOverlay, setShowFadeOverlay] = useState(false);
  const fadeOverlayAnim = useRef(new Animated.Value(0)).current;
  const menuSlideAnim = useRef(new Animated.Value(0)).current;
  const menuOpacityAnim = useRef(new Animated.Value(0)).current;

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
    queue: [], // Array of tracks in queue
    currentQueueIndex: -1, // Index of current track in queue
  });

  // Initialize notification setup for lock screen audio controls
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        // Request notification permissions
        await requestNotificationPermissions();
        
        // Set up notification categories for iOS
        await setupAudioNotificationCategories();
        
        // Set up notification listeners
        const removeListeners = setupNotificationListeners();
        
        console.log('✅ Lock screen audio controls initialized');
        
        return removeListeners;
      } catch (error) {
        console.error('❌ Error initializing notifications:', error);
      }
    };

    initializeNotifications();
  }, []);

  // Full-screen player state
  const [showFullScreenPlayer, setShowFullScreenPlayer] = useState(false);

  // Gesture handlers for full-screen player
  const createGestureHandlers = () => {
    const panResponder = PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 20 || Math.abs(gestureState.dy) > 20;
      },
      onPanResponderMove: (evt, gestureState) => {
        // Handle horizontal swipes for track navigation
        if (Math.abs(gestureState.dx) > Math.abs(gestureState.dy)) {
          if (gestureState.dx > 50) {
            // Swipe right - previous track
            skipBackward();
            Vibration.vibrate(100);
          } else if (gestureState.dx < -50) {
            // Swipe left - next track
            skipForward();
            Vibration.vibrate(100);
          }
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        // Handle vertical swipes
        if (Math.abs(gestureState.dy) > Math.abs(gestureState.dx)) {
          if (gestureState.dy > 100) {
            // Swipe down - close player
            setShowFullScreenPlayer(false);
            Vibration.vibrate(50);
          }
        }
      },
    });
    return panResponder.panHandlers;
  };

  // Opportunities state - now using live data from Supabase
  const [opportunities, setOpportunities] = useState([]);
  const [currentOpportunityIndex, setCurrentOpportunityIndex] = useState(0);
  const [swipedOpportunities, setSwipedOpportunities] = useState([]);
  const [isLoadingOpportunities, setIsLoadingOpportunities] = useState(true);

  // Brief form state - REMOVED (no longer needed for simplified swipe-to-apply)
  // But we still need selectedOpportunity for the details modal
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);

  // Daily application limit state
  const [dailyApplicationStats, setDailyApplicationStats] = useState({
    daily_count: 0,
    remaining_applications: 5,
    can_apply: true,
  });

  // Audio player animation values
  const [audioPlayerOpacity] = useState(new Animated.Value(0));
  const [audioPlayerTranslateY] = useState(new Animated.Value(50));

  // Audio player swipe state
  const [audioPlayerSwipeTranslateY] = useState(new Animated.Value(0));
  const [audioPlayerSwipeOpacity] = useState(new Animated.Value(1));
  const [isAudioPlayerSwiping, setIsAudioPlayerSwiping] = useState(false);

  // Format time helper function
  const formatTime = (milliseconds) => {
    if (!milliseconds || isNaN(milliseconds)) return "0:00";
    const seconds = Math.floor(milliseconds / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Audio player animation effects
  useEffect(() => {
    if (globalAudioState.currentTrack) {
      // Animate in when track is loaded - smooth ease-in
      Animated.parallel([
        Animated.timing(audioPlayerOpacity, {
          toValue: 1,
          duration: ANIMATION_DURATION.SLOW,
          useNativeDriver: true,
        }),
        Animated.spring(audioPlayerTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          ...SPRING_CONFIG,
        }),
      ]).start();
    } else {
      // Animate out when no track - smooth ease-out
      Animated.parallel([
        Animated.timing(audioPlayerOpacity, {
          toValue: 0,
          duration: ANIMATION_DURATION.NORMAL,
          useNativeDriver: true,
        }),
        Animated.spring(audioPlayerTranslateY, {
          toValue: 50,
          useNativeDriver: true,
          tension: 120,
          friction: 9,
        }),
      ]).start();
    }
  }, [globalAudioState.currentTrack]);

  // Application sent modal state

  // Edit profile modal state
  const [showEditProfile, setShowEditProfile] = useState(false);

  // Custom modal state
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    type: "info",
    title: "",
    message: "",
    primaryButtonText: "OK",
    secondaryButtonText: null,
    onPrimaryPress: null,
    onSecondaryPress: null,
  });

  // Global audio instance reference for cleanup
  const globalAudioRef = useRef(null);

  // All opportunities data comes from database

  // Helper function to show custom modal
  const showCustomModal = (config) => {
    setModalConfig({
      type: config.type || "info",
      title: config.title || "",
      message: config.message || "",
      primaryButtonText: config.primaryButtonText || "OK",
      secondaryButtonText: config.secondaryButtonText || null,
      onPrimaryPress: config.onPrimaryPress || null,
      onSecondaryPress: config.onSecondaryPress || null,
    });
    setShowModal(true);
  };

  const [djProfile, setDjProfile] = useState({
    djName: "",
    firstName: "",
    lastName: "",
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
    setupGlobalAudio();
    fetchOpportunities();

    // Setup push notifications (disabled until development build is created)
    // Note: Push notifications require a custom development build, not Expo Go
    // To enable: Run `eas build --profile development --platform ios`
    // setupPushNotifications();

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
        globalAudioRef.current.unloadAsync();
        globalAudioRef.current = null;
      }
    };
  }, []);

  // Setup push notifications
  const setupPushNotifications = async () => {
    try {
      // Register for push notifications
      const token = await registerForPushNotifications();
      if (token) {
        console.log("Push notification token obtained:", token);
      }

      // Setup notification listeners
      const cleanup = setupNotificationListeners();

      // Store cleanup function for later use
      return cleanup;
    } catch (error) {
      console.error("Error setting up push notifications:", error);
    }
  };

  // Initialize authentication
  const initializeAuth = async () => {
    try {
      // Configure Google Sign-In
      try {
        const googleSignIn = require("./lib/googleSignIn");
        googleSignIn.configureGoogleSignIn();
        console.log("✅ Google Sign-In configured");
      } catch (error) {
        console.log("⚠️ Native Google Sign-In not available:", error.message);
      }

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
        await checkFirstTime(null);
      } else {
        setUser(session?.user ?? null);
        await checkFirstTime(session?.user ?? null);
      }

      // Listen for auth changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        setUser(session?.user ?? null);
        setAuthLoading(false);

        if (event === "SIGNED_IN" && session?.user) {
          // User signed in - handleLoginSuccess will manage the profile check
          console.log(
            "🔐 SIGNED_IN event detected, but handleLoginSuccess will manage profile check"
          );
          setUser(session.user);
        } else if (event === "SIGNED_OUT") {
          // User signed out, reset state
          setDjProfile({
            djName: "",
            firstName: "",
            lastName: "",
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
    console.log("🎬 App: Splash screen finished, starting transition");
    // Show black overlay and fade it in
    setShowFadeOverlay(true);
    Animated.timing(fadeOverlayAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start(() => {
      console.log("🎬 App: Black overlay complete, hiding splash screen");
      // Hide splash screen after black overlay is complete
      setShowSplash(false);
      // Fade out the black overlay to reveal main app
      Animated.timing(fadeOverlayAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }).start(() => {
        console.log("🎬 App: Transition complete, showing main app");
        // Hide overlay after fade out completes
        setShowFadeOverlay(false);
      });
    });
  };

  // Authentication handlers
  const handleLoginSuccess = async (user) => {
    console.log("🔐 handleLoginSuccess called for user:", user.id);
    setUser(user);
    setShowAuth(false);
    setAuthLoading(true); // Keep loading state while checking profile

    // Add a small delay to ensure OAuth profile creation is complete
    await new Promise((resolve) => setTimeout(resolve, 1000));

    try {
      console.log("🔍 Fetching user profile for user ID:", user.id);
      const profile = await db.getUserProfile(user.id);
      console.log("📋 Profile result:", profile ? "Found" : "Not found");

      if (profile) {
        console.log("✅ Profile found, setting up user session");
        console.log("👤 Profile data:", {
          id: profile.id,
          djName: profile.dj_name || profile.djName,
          email: profile.email,
          hasRequiredFields: !!(profile.dj_name || profile.djName),
        });
        setDjProfile(profile);
        setIsFirstTime(false);

        // For login flow, always go to opportunities page
        console.log("🎯 Login successful - navigating to opportunities");
        setCurrentScreen("opportunities");
      } else {
        console.log("⚠️ No profile found after OAuth - user needs onboarding");
        console.log("🔍 Profile query returned:", profile);
        setIsFirstTime(true);
      }
    } catch (error) {
      console.error("❌ Error fetching profile:", error);
      console.error("❌ Error details:", {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      console.log("⚠️ Setting isFirstTime=true due to error");
      setIsFirstTime(true);
    } finally {
      setAuthLoading(false); // Always stop loading when done
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
      firstName: updatedProfile.first_name || "",
      lastName: updatedProfile.last_name || "",
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
        firstName: updatedProfile.first_name || "",
        lastName: updatedProfile.last_name || "",
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

  // Global audio control functions
  const playGlobalAudio = async (track) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      console.log("🎵 Starting to play track:", track.title);
      console.log("🎵 Audio URL:", track.audioUrl);
      console.log("🎵 Audio URL type:", typeof track.audioUrl);
      console.log("🎵 Audio URL value:", JSON.stringify(track.audioUrl));

      // Stop current audio if playing
      if (globalAudioRef.current) {
        console.log("🛑 Stopping current audio before playing new track");
        await globalAudioRef.current.unloadAsync();
        globalAudioRef.current = null;
      }

      setGlobalAudioState((prev) => ({ ...prev, isLoading: true }));

      // Configure audio mode for playback
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
      });

      // Create and load new sound using expo-av
      console.log("🔄 Creating new sound instance...");
      console.log("🔄 Audio file path:", track.audioUrl);
      console.log("🔄 Audio file type:", typeof track.audioUrl);

      // Try to load the audio file
      let sound;

      // Determine if audioUrl is a local require or remote URL
      let audioSource;
      if (typeof track.audioUrl === "string") {
        audioSource = { uri: track.audioUrl };
      } else if (typeof track.audioUrl === "number") {
        audioSource = track.audioUrl;
      } else {
        audioSource = track.audioUrl;
      }

      // Load audio with streaming support for large files
      try {
        const { sound: loadedSound } = await Audio.Sound.createAsync(
          audioSource,
          {
            shouldPlay: false,
            isLooping: false,
            volume: 1.0,
            progressUpdateIntervalMillis: 500,
          },
          null,
          true // downloadFirst = true for better streaming
        );
        sound = loadedSound;
      } catch (loadError) {
        console.error("Failed to load audio:", loadError.message);

        let errorMessage = "Failed to play this mix.";
        if (loadError.message?.includes("404")) {
          errorMessage = "Audio file not found.";
        } else if (loadError.message?.includes("Network")) {
          errorMessage = "Network error. Check your connection.";
        }

        Alert.alert("Playback Error", errorMessage);
        setGlobalAudioState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      console.log("🔄 Sound created:", sound);

      // Check sound properties before playing
      try {
        const status = await sound.getStatusAsync();
        console.log("📊 Initial sound status:", {
          isLoaded: status.isLoaded,
          durationMillis: status.durationMillis,
          playableDurationMillis: status.playableDurationMillis,
          uri: status.uri,
        });

        if (!status.isLoaded) {
          throw new Error("Sound failed to load properly");
        }

        if (status.durationMillis === 0) {
          console.warn("⚠️ Audio file has 0 duration - may be corrupted");
        }
      } catch (statusError) {
        console.error("❌ Error getting sound status:", statusError);
        throw statusError;
      }

      // Set up status update listener
      let durationUpdated = false; // Track if we've updated duration in DB
      sound.setOnPlaybackStatusUpdate(async (status) => {
        console.log("📊 Audio status update:", status);
        if (status.isLoaded) {
          // Check if track has finished playing
          const hasFinished =
            status.didJustFinish ||
            (status.positionMillis >= status.durationMillis - 100 &&
              status.durationMillis > 0);

          if (hasFinished && !status.isPlaying) {
            console.log("🎵 Track finished, checking for next track in queue");

            // Get current queue state
            setGlobalAudioState((prev) => {
              // Play next track if available
              setTimeout(() => {
                playNextTrack();
              }, 100); // Small delay to ensure state is updated

              return {
                ...prev,
                isPlaying: false,
                isLoading: false,
                progress: 1, // Set to 100% when finished
                positionMillis: status.durationMillis || 0,
                durationMillis: status.durationMillis || 0,
              };
            });

            return; // Exit early since we're handling the finished state
          }

          setGlobalAudioState((prev) => ({
            ...prev,
            isPlaying: status.isPlaying,
            isLoading: false,
            progress: status.positionMillis / status.durationMillis || 0,
            positionMillis: status.positionMillis || 0,
            durationMillis: status.durationMillis || 0,
          }));

          // Update duration in database if not already set and we have the duration
          if (
            !durationUpdated &&
            status.durationMillis &&
            status.durationMillis > 0 &&
            track.id
          ) {
            durationUpdated = true;
            const durationInSeconds = Math.floor(status.durationMillis / 1000);

            try {
              const { error } = await supabase
                .from("mixes")
                .update({ duration: durationInSeconds })
                .eq("id", track.id)
                .is("duration", null); // Only update if duration is null

              if (error) {
                console.error("❌ Error updating duration:", error);
              } else {
                console.log(
                  `✅ Updated duration for "${track.title}": ${durationInSeconds}s`
                );
              }
            } catch (err) {
              console.error("❌ Failed to update duration:", err);
            }
          }
        } else if (status.error) {
          console.error("❌ Audio error:", status.error);
          setGlobalAudioState((prev) => ({ ...prev, isLoading: false }));
        }
      });

      // Store reference for cleanup
      globalAudioRef.current = sound;

      // Start playing
      console.log("▶️ Starting playback...");
      try {
        await sound.playAsync();
        console.log("✅ Playback started successfully");
      } catch (playError) {
        console.error("❌ Playback failed:", playError);
        console.error("❌ Playback error details:", {
          message: playError.message,
          code: playError.code,
          name: playError.name,
        });
        throw playError; // Re-throw to be caught by outer catch
      }

      setGlobalAudioState((prev) => {
        // If this track is not in the queue, add it
        let newQueue = [...prev.queue];
        let newIndex = newQueue.findIndex((t) => t.id === track.id);

        if (newIndex === -1) {
          // Track not in queue, add it
          newQueue.push(track);
          newIndex = newQueue.length - 1;
          console.log(
            `🎵 Added "${track.title}" to queue at index ${newIndex}`
          );
        } else {
          console.log(
            `🎵 Playing existing track from queue at index ${newIndex}`
          );
        }

        return {
          ...prev,
          sound: sound,
          isPlaying: true,
          currentTrack: track,
          isLoading: false,
          queue: newQueue,
          currentQueueIndex: newIndex,
        };
      });

      console.log("🎉 Global audio started successfully:", track.title);
    } catch (error) {
      console.log("❌ Error playing global audio:", error);
      setGlobalAudioState((prev) => ({ ...prev, isLoading: false }));
      Alert.alert(
        "Audio Error",
        `Failed to play ${track.title}. Please try again.`
      );
    }
  };

  const pauseGlobalAudio = async () => {
    if (globalAudioRef.current) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await globalAudioRef.current.pauseAsync();
        setGlobalAudioState((prev) => ({ ...prev, isPlaying: false }));
      } catch (error) {
        console.log("❌ Error pausing audio:", error);
      }
    }
  };

  const resumeGlobalAudio = async () => {
    if (globalAudioRef.current) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await globalAudioRef.current.playAsync();
        setGlobalAudioState((prev) => ({ ...prev, isPlaying: true }));
      } catch (error) {
        console.log("❌ Error resuming audio:", error);
      }
    }
  };

  const stopGlobalAudio = async () => {
    if (globalAudioRef.current) {
      try {
        await globalAudioRef.current.unloadAsync();
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
      queue: [],
      currentQueueIndex: -1,
    });
  };

  // Audio Player PanResponder for swipe gestures
  const audioPlayerPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      // More responsive - respond to smaller movements
      return Math.abs(gestureState.dy) > 5 || Math.abs(gestureState.dx) > 30;
    },
    onPanResponderGrant: () => {
      setIsAudioPlayerSwiping(true);
      audioPlayerSwipeTranslateY.setOffset(audioPlayerSwipeTranslateY._value);
      audioPlayerSwipeTranslateY.setValue(0);
    },
    onPanResponderMove: (_, gestureState) => {
      const { dy, dx } = gestureState;

      // Handle vertical swipes (up/down)
      if (Math.abs(dy) > Math.abs(dx)) {
        audioPlayerSwipeTranslateY.setValue(dy);

        // Fade out when swiping down
        if (dy > 0) {
          const opacity = Math.max(0.3, 1 - dy / 150);
          audioPlayerSwipeOpacity.setValue(opacity);
        }
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      setIsAudioPlayerSwiping(false);
      audioPlayerSwipeTranslateY.flattenOffset();

      const { dy, dx, vy, vx } = gestureState;

      // Handle vertical swipes
      if (Math.abs(dy) > Math.abs(dx)) {
        const swipeThreshold = PERFORMANCE_THRESHOLDS.SWIPE_THRESHOLD;
        const velocityThreshold = PERFORMANCE_THRESHOLDS.VELOCITY_THRESHOLD;

        if (dy > swipeThreshold || vy > velocityThreshold) {
          // Swipe down - dismiss player
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          Animated.parallel([
            Animated.timing(audioPlayerSwipeTranslateY, {
              toValue: 200,
              duration: ANIMATION_DURATION.NORMAL,
              useNativeDriver: true,
            }),
            Animated.timing(audioPlayerSwipeOpacity, {
              toValue: 0,
              duration: ANIMATION_DURATION.NORMAL,
              useNativeDriver: true,
            }),
          ]).start(() => {
            stopGlobalAudio();
            audioPlayerSwipeTranslateY.setValue(0);
            audioPlayerSwipeOpacity.setValue(1);
          });
        } else if (dy < -swipeThreshold || vy < -velocityThreshold) {
          // Swipe up - open full screen player
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setShowFullScreenPlayer(true);
          // Reset position
          Animated.parallel([
            Animated.spring(audioPlayerSwipeTranslateY, {
              toValue: 0,
              useNativeDriver: true,
              ...SPRING_CONFIG,
            }),
            Animated.timing(audioPlayerSwipeOpacity, {
              toValue: 1,
              duration: ANIMATION_DURATION.FAST,
              useNativeDriver: true,
            }),
          ]).start();
        } else {
          // Snap back to original position
          Animated.parallel([
            Animated.spring(audioPlayerSwipeTranslateY, {
              toValue: 0,
              useNativeDriver: true,
              ...SPRING_CONFIG,
            }),
            Animated.timing(audioPlayerSwipeOpacity, {
              toValue: 1,
              duration: ANIMATION_DURATION.FAST,
              useNativeDriver: true,
            }),
          ]).start();
        }
      } else {
        // Handle horizontal swipes for track navigation
        const swipeThreshold = 80; // Lower threshold for easier swiping
        const velocityThreshold = 0.6; // Lower velocity threshold

        if (dx > swipeThreshold || vx > velocityThreshold) {
          // Swipe right - previous track (if implemented)
          console.log("Swipe right - previous track");
        } else if (dx < -swipeThreshold || vx < -velocityThreshold) {
          // Swipe left - next track (if implemented)
          console.log("Swipe left - next track");
        }

        // Reset position for horizontal swipes
        Animated.spring(audioPlayerSwipeTranslateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  // Shuffle functionality
  const toggleShuffle = () => {
    setGlobalAudioState((prev) => ({
      ...prev,
      isShuffled: !prev.isShuffled,
    }));
  };

  // Skip forward functionality - now navigates to next track
  const skipForward = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await playNextTrack();
      console.log(`⏩ Skipped to next track`);
    } catch (error) {
      console.error("❌ Error skipping forward:", error);
      Alert.alert("Error", "Failed to skip to next track");
    }
  };

  // Skip backward functionality - now navigates to previous track
  const skipBackward = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await playPreviousTrack();
      console.log(`⏪ Skipped to previous track`);
    } catch (error) {
      console.error("❌ Error skipping backward:", error);
      Alert.alert("Error", "Failed to skip to previous track");
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

  // Like/Unlike functionality
  const toggleLike = async () => {
    if (!globalAudioState.currentTrack || !user) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const isLiked = globalAudioState.currentTrack.isLiked;

      // Optimistically update UI
      setGlobalAudioState((prev) => ({
        ...prev,
        currentTrack: {
          ...prev.currentTrack,
          isLiked: !isLiked,
        },
      }));

      // Update database
      if (isLiked) {
        // Unlike - decrement likes_count
        const { error } = await supabase
          .from("mixes")
          .update({
            likes_count: globalAudioState.currentTrack.likes_count - 1,
          })
          .eq("id", globalAudioState.currentTrack.id);

        if (error) throw error;
        console.log("👎 Unliked mix");
      } else {
        // Like - increment likes_count
        const { error } = await supabase
          .from("mixes")
          .update({
            likes_count: (globalAudioState.currentTrack.likes_count || 0) + 1,
          })
          .eq("id", globalAudioState.currentTrack.id);

        if (error) throw error;
        console.log("❤️ Liked mix");
      }
    } catch (error) {
      console.error("❌ Error toggling like:", error);
      // Revert optimistic update
      setGlobalAudioState((prev) => ({
        ...prev,
        currentTrack: {
          ...prev.currentTrack,
          isLiked: !prev.currentTrack.isLiked,
        },
      }));
    }
  };

  // Seek to position in track
  const seekToPosition = async (positionMillis) => {
    if (!globalAudioRef.current) {
      console.error("❌ No audio reference available for seeking");
      return;
    }

    // Validate position before attempting to seek
    if (positionMillis < 0) {
      console.error(
        `❌ Invalid seek position: ${positionMillis}ms (cannot be negative)`
      );
      return;
    }

    try {
      console.log(`🎯 Attempting to seek to ${positionMillis}ms`);

      // Ensure the audio is loaded before seeking
      const status = await globalAudioRef.current.getStatusAsync();
      console.log(`📊 Audio status before seek:`, status);

      if (status.isLoaded && status.durationMillis > 0) {
        // Ensure position doesn't exceed duration
        const clampedPosition = Math.min(positionMillis, status.durationMillis);
        await globalAudioRef.current.setPositionAsync(clampedPosition);
        console.log(`✅ Successfully seeked to ${clampedPosition}ms`);

        // Update the global state to reflect the new position
        setGlobalAudioState((prev) => ({
          ...prev,
          positionMillis: clampedPosition,
          progress: clampedPosition / status.durationMillis,
        }));
      } else {
        console.error(
          `❌ Audio not ready for seeking - isLoaded: ${status.isLoaded}, duration: ${status.durationMillis}`
        );
      }
    } catch (error) {
      console.error("❌ Error seeking:", error);
    }
  };

  // Refs for progress bar dimensions
  const miniProgressBarRef = useRef(null);
  const fullScreenProgressBarRef = useRef(null);

  // Simple touch handler for progress bar scrubbing
  const handleProgressBarPress = async (event) => {
    event.stopPropagation();
    console.log(`🎯 Progress bar pressed`);
    console.log(`🎯 Touch event:`, event.nativeEvent);

    // Check if audio is ready
    if (globalAudioState.durationMillis <= 0 || globalAudioState.isLoading) {
      console.warn("⚠️ Cannot scrub - audio not ready");
      return;
    }

    // Get the touch position - try multiple approaches
    const { locationX, pageX } = event.nativeEvent;
    const target = event.currentTarget;
    const progressBarWidth = target?.offsetWidth || target?.clientWidth || 300;

    console.log(
      `🎯 Touch details - locationX: ${locationX}, pageX: ${pageX}, width: ${progressBarWidth}`
    );

    // Calculate the percentage position
    const percentage = Math.max(0, Math.min(1, locationX / progressBarWidth));

    console.log(
      `🎯 Scrub to position: ${percentage} (${locationX}/${progressBarWidth})`
    );

    // Seek to the position immediately
    const newPosition = percentage * globalAudioState.durationMillis;
    console.log(
      `🎯 Seeking to ${newPosition}ms of ${globalAudioState.durationMillis}ms`
    );

    await seekToPosition(newPosition);

    // Provide haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Queue management functions
  const addToQueue = (track) => {
    setGlobalAudioState((prev) => {
      const newQueue = [...prev.queue, track];
      console.log(
        `🎵 Added "${track.title}" to queue. Queue length: ${newQueue.length}`
      );
      return {
        ...prev,
        queue: newQueue,
      };
    });
  };

  const addToQueueAndPlay = (track) => {
    setGlobalAudioState((prev) => {
      const newQueue = [...prev.queue, track];
      const newIndex = newQueue.length - 1;
      console.log(
        `🎵 Added "${track.title}" to queue and will play next. Queue length: ${newQueue.length}`
      );
      return {
        ...prev,
        queue: newQueue,
        currentQueueIndex: newIndex,
      };
    });
    playGlobalAudio(track);
  };

  const clearQueue = () => {
    setGlobalAudioState((prev) => ({
      ...prev,
      queue: [],
      currentQueueIndex: -1,
    }));
    console.log("🗑️ Queue cleared");
  };

  const getNextTrack = () => {
    const { queue, currentQueueIndex, repeatMode, isShuffled } =
      globalAudioState;

    if (queue.length === 0) return null;

    // Handle repeat one mode
    if (repeatMode === "one" && globalAudioState.currentTrack) {
      return globalAudioState.currentTrack;
    }

    let nextIndex;

    if (repeatMode === "all") {
      // Repeat all - cycle back to beginning
      nextIndex = (currentQueueIndex + 1) % queue.length;
    } else {
      // Normal progression
      nextIndex = currentQueueIndex + 1;
    }

    // Check if we've reached the end
    if (nextIndex >= queue.length) {
      if (repeatMode === "all") {
        // Already handled above
      } else {
        console.log("🎵 End of queue reached");
        return null;
      }
    }

    return queue[nextIndex];
  };

  const getPreviousTrack = () => {
    const { queue, currentQueueIndex, repeatMode } = globalAudioState;

    if (queue.length === 0) return null;

    // Handle repeat one mode
    if (repeatMode === "one" && globalAudioState.currentTrack) {
      return globalAudioState.currentTrack;
    }

    let prevIndex;

    if (repeatMode === "all") {
      // Repeat all - cycle back to end
      prevIndex =
        currentQueueIndex === 0 ? queue.length - 1 : currentQueueIndex - 1;
    } else {
      // Normal progression
      prevIndex = currentQueueIndex - 1;
    }

    // Check if we've reached the beginning
    if (prevIndex < 0) {
      if (repeatMode === "all") {
        // Already handled above
      } else {
        console.log("🎵 Beginning of queue reached");
        return null;
      }
    }

    return queue[prevIndex];
  };

  const playNextTrack = async () => {
    const nextTrack = getNextTrack();

    if (nextTrack) {
      console.log(`⏭️ Playing next track: "${nextTrack.title}"`);

      // Update queue index
      setGlobalAudioState((prev) => ({
        ...prev,
        currentQueueIndex: prev.currentQueueIndex + 1,
      }));

      // Play the next track
      await playGlobalAudio(nextTrack);
    } else {
      console.log("🎵 No more tracks in queue");
      // Stop playback when queue is empty
      await stopGlobalAudio();
    }
  };

  const playPreviousTrack = async () => {
    const prevTrack = getPreviousTrack();

    if (prevTrack) {
      console.log(`⏮️ Playing previous track: "${prevTrack.title}"`);

      // Update queue index
      setGlobalAudioState((prev) => ({
        ...prev,
        currentQueueIndex: prev.currentQueueIndex - 1,
      }));

      // Play the previous track
      await playGlobalAudio(prevTrack);
    } else {
      console.log("🎵 No previous tracks in queue");
    }
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

  const applyToOpportunity = async (opportunityId) => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) {
        Alert.alert("Error", "Please complete your profile first.");
        return;
      }

      // Get daily application stats before applying
      const stats = await db.getDailyApplicationStats(userId);

      if (!stats.canApply) {
        Alert.alert(
          "Daily Limit Reached",
          `You have reached your daily limit of 5 applications. You have ${stats.remaining} applications remaining today. Please try again tomorrow.`,
          [{ text: "OK" }]
        );
        return;
      }

      await db.applyToOpportunity(opportunityId, userId);

      // Get updated stats after successful application
      const updatedStats = await db.getDailyApplicationStats(userId);

      Alert.alert(
        "Success",
        `Application submitted successfully! You have ${updatedStats.remaining} applications remaining today.`,
        [{ text: "OK" }]
      );
    } catch (error) {
      // Check if it's a daily limit error
      if (error.message.includes("Daily application limit")) {
        showCustomModal({
          type: "warning",
          title: "Daily Limit Reached",
          message: error.message,
          primaryButtonText: "OK",
        });
      } else if (error.message.includes("already applied")) {
        showCustomModal({
          type: "info",
          title: "Already Applied",
          message:
            "You've already applied for this opportunity. We'll notify you on the outcome soon.",
          primaryButtonText: "OK",
        });
      } else {
        // Only log unexpected errors to console
        console.error("Unexpected error applying to opportunity:", error);
        showCustomModal({
          type: "error",
          title: "Application Failed",
          message:
            "There was an error submitting your application. Please try again.",
          primaryButtonText: "OK",
        });
      }
    }
  };

  const checkFirstTime = async (currentUser = null) => {
    try {
      const userToCheck = currentUser || user;
      console.log("🔍 Checking first time for user:", userToCheck?.id);

      // If user is authenticated, they should go straight to home
      // Only show onboarding for unauthenticated users or if no profile exists
      if (userToCheck) {
        // User is signed in, check if they have a profile
        console.log("👤 User is authenticated, checking for profile...");
        try {
          const profile = await db.getUserProfile(userToCheck.id);
          console.log(
            "📋 Profile lookup result:",
            profile ? "Profile found" : "No profile"
          );

          if (profile) {
            console.log("✅ Profile exists, going to home screen");
            console.log("👤 Profile data:", {
              djName: profile.dj_name || profile.djName,
              email: profile.email,
              hasRequiredFields: !!(profile.dj_name || profile.djName),
            });
            setDjProfile(profile);
            setIsFirstTime(false); // User has profile, go to home
          } else {
            console.log("⚠️ No profile found, showing onboarding");
            setIsFirstTime(true); // User signed in but no profile, needs onboarding
          }
        } catch (error) {
          console.log(
            "❌ Error getting profile for authenticated user:",
            error.message
          );
          console.log("📝 Will show onboarding for profile creation");
          setIsFirstTime(true);
        }
      } else {
        console.log("🔓 No authenticated user, checking local storage...");
        // No user, check local storage for offline access
        const hasOnboarded = await AsyncStorage.getItem("hasOnboarded");
        const profile = await AsyncStorage.getItem("djProfile");

        setIsFirstTime(!hasOnboarded);
        if (profile) {
          setDjProfile(JSON.parse(profile));
        }
      }
    } catch (error) {
      console.error("❌ Error checking onboarding status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMenuNavigation = (screen, params = {}) => {
    console.log("🎯 Navigating to screen:", screen);
    setCurrentScreen(screen);
    setScreenParams(params);
    closeMenu();
  };

  const handleOpportunityPress = (opportunity) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showCustomModal({
      type: "info",
      title: opportunity.title,
      message: `Venue: ${opportunity.venue}\nLocation: ${opportunity.location}\nDate: ${opportunity.date}\nTime: ${opportunity.time}\n\n${opportunity.description}\n\nCompensation: ${opportunity.compensation}`,
      primaryButtonText: "Apply",
      secondaryButtonText: "Close",
      onPrimaryPress: () => {
        showCustomModal({
          type: "success",
          title: "Application Sent!",
          message: `Your application for ${opportunity.title} has been sent successfully. You'll hear back within 48 hours.`,
          primaryButtonText: "OK",
        });
      },
    });
  };

  const handleSwipeLeft = () => {
    // Pass on opportunity
    const currentOpportunity = opportunities[currentOpportunityIndex];
    setSwipedOpportunities([
      ...swipedOpportunities,
      { ...currentOpportunity, action: "pass" },
    ]);

    // Move to next card immediately
    setCurrentOpportunityIndex(currentOpportunityIndex + 1);
  };

  const handleSwipeRight = async () => {
    // Check daily application limit before showing details
    if (!dailyApplicationStats.can_apply) {
      Alert.alert(
        "Daily Limit Reached",
        `You have reached your daily limit of 5 applications. You have ${
          dailyApplicationStats?.remaining_applications || 0
        } applications remaining today. Please try again tomorrow.`,
        [{ text: "OK" }]
      );
      return;
    }

    // Show detailed opportunity information for confirmation
    const currentOpportunity = opportunities[currentOpportunityIndex];
    setSelectedOpportunity(currentOpportunity);

    // Show detailed modal with opportunity info and apply button
    showCustomModal({
      type: "info",
      title: currentOpportunity.title,
      message: `Date: ${currentOpportunity.date}\nTime: ${
        currentOpportunity.time
      }\nCompensation: ${currentOpportunity.compensation}\nLocation: ${
        currentOpportunity.location
      }\n\n${currentOpportunity.description}\n\nYou have ${
        dailyApplicationStats?.remaining_applications || 0
      } applications remaining today.`,
      primaryButtonText: "Apply Now",
      secondaryButtonText: "Cancel",
      onPrimaryPress: () => handleConfirmApply(currentOpportunity),
      onSecondaryPress: () => {
        console.log(
          "Modal cancelled. Closing modal and clearing selected opportunity."
        );
        setShowModal(false);
        setSelectedOpportunity(null);
        console.log("Current opportunities length:", opportunities.length);
        console.log("Current opportunity index:", currentOpportunityIndex);
        if (
          opportunities.length > 0 &&
          currentOpportunityIndex < opportunities.length
        ) {
          console.log(
            "Opportunity at current index:",
            opportunities[currentOpportunityIndex].title
          );
        } else {
          console.log(
            "Opportunities array is empty or index is out of bounds, showing empty state."
          );
        }
      },
    });
  };

  const handleConfirmApply = async (opportunity) => {
    try {
      setShowModal(false);

      // Apply to opportunity using existing logic
      await db.applyToOpportunity(opportunity.id, user.id);

      // Refresh daily stats after successful application
      try {
        const updatedStats = await db.getUserDailyApplicationStats(user.id);
        setDailyApplicationStats(updatedStats);
        console.log(`✅ Updated daily application stats:`, updatedStats);
      } catch (statsError) {
        console.error("Error refreshing daily stats:", statsError);
      }

      // Add to swiped opportunities
      setSwipedOpportunities([
        ...swipedOpportunities,
        { ...opportunity, action: "applied" },
      ]);

      // Move to next card immediately
      setCurrentOpportunityIndex(currentOpportunityIndex + 1);

      // Show success message
      setTimeout(() => {
        showCustomModal({
          type: "success",
          title: "Application Sent!",
          message: `Your application for ${
            opportunity.title
          } has been sent successfully. You have ${
            dailyApplicationStats?.remaining_applications || 0
          } applications remaining today.`,
          primaryButtonText: "OK",
        });
      }, 300);
    } catch (error) {
      // Check if it's a daily limit error
      if (error.message.includes("Daily application limit")) {
        showCustomModal({
          type: "warning",
          title: "Daily Limit Reached",
          message: error.message,
          primaryButtonText: "OK",
        });
      } else if (error.message.includes("already applied")) {
        // Show modal and automatically move to next opportunity
        showCustomModal({
          type: "info",
          title: "Already Applied",
          message:
            "You've already applied for this opportunity. We'll notify you on the outcome soon.",
          primaryButtonText: "OK",
          onPrimaryPress: () => {
            // Automatically move to next opportunity
            setCurrentOpportunityIndex(currentOpportunityIndex + 1);
            setShowModal(false);
            setSelectedOpportunity(null);
          },
        });
      } else {
        // Only log unexpected errors to console
        console.error("Unexpected error applying to opportunity:", error);
        showCustomModal({
          type: "error",
          title: "Application Failed",
          message:
            "There was an error submitting your application. Please try again.",
          primaryButtonText: "OK",
        });
      }
    } finally {
      setSelectedOpportunity(null);
    }
  };

  const resetOpportunities = () => {
    setCurrentOpportunityIndex(0);
    setSwipedOpportunities([]);
  };

  const refreshOpportunities = async () => {
    await fetchOpportunities();
    setCurrentOpportunityIndex(0);
    setSwipedOpportunities([]);
  };

  // Brief form handlers - REMOVED (no longer needed for simplified swipe-to-apply)

  // Global authentication helper
  const ensureAuthenticated = async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        // Try to refresh session
        const { data: refreshData, error: refreshError } =
          await supabase.auth.refreshSession();

        if (refreshError || !refreshData.user) {
          return null; // Need to log in
        }

        return refreshData.user;
      }

      return user;
    } catch (error) {
      console.error("Auth check error:", error);
      return null;
    }
  };

  // Fetch opportunities from Supabase
  const fetchOpportunities = async () => {
    try {
      setIsLoadingOpportunities(true);

      // Fetch opportunities from database
      const { data: opportunitiesData, error: opportunitiesError } =
        await supabase
          .from("opportunities")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false });

      if (opportunitiesError) {
        console.error(
          "❌ Error fetching opportunities from database:",
          opportunitiesError
        );
        console.log("⚠️ No opportunities available");
        // No fallback to mock data - show empty state
        setOpportunities([]);
        return;
      }

      console.log(
        `✅ Fetched ${opportunitiesData.length} opportunities from database`
      );

      // Transform database data to match our component expectations
      const transformedOpportunities = opportunitiesData.map((opp) => {
        return {
          id: opp.id,
          venue: opp.organizer_name,
          title: opp.title,
          location: opp.location,
          date: opp.event_date
            ? new Date(opp.event_date).toLocaleDateString()
            : "TBD",
          time: "TBD", // We don't have time in the database schema
          audienceSize: "TBD", // We don't have audience size in the database schema
          description: opp.description,
          genres: opp.genre ? [opp.genre] : ["Electronic"],
          compensation: opp.payment ? `$${opp.payment}` : "TBD",
          // applicationsLeft will be set based on user's daily application stats
          applicationsLeft: 0, // Will be updated with user's daily stats
          status:
            opp.created_at > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
              ? "new"
              : "hot", // New if created within last 7 days
          // Use the actual image_url from database, fallback to a good default
          image:
            opp.image_url ||
            (opp.genre === "Techno"
              ? "https://images.unsplash.com/photo-1571266028243-e68f8570c0e8?w=400&h=400&fit=crop"
              : opp.genre === "House"
              ? "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=400&fit=crop"
              : opp.genre === "Electronic"
              ? "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop"
              : "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop"),
        };
      });

      setOpportunities(transformedOpportunities);

      // Load daily application stats for the current user
      if (user?.id) {
        try {
          const stats = await db.getUserDailyApplicationStats(user.id);
          setDailyApplicationStats(stats);
          console.log(`✅ User daily application stats:`, stats);
        } catch (statsError) {
          console.error("Error loading daily stats:", statsError);
          // Set default stats if there's an error
          setDailyApplicationStats({
            daily_count: 0,
            remaining_applications: 5,
            can_apply: true,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching opportunities:", error);
      // Show empty state instead of mock data
      setOpportunities([]);
    } finally {
      setIsLoadingOpportunities(false);
    }
  };

  // Menu animation functions
  const openMenu = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowMenu(true);
    Animated.parallel([
      Animated.timing(menuSlideAnim, {
        toValue: 1,
        duration: ANIMATION_DURATION.NORMAL,
        useNativeDriver: true,
      }),
      Animated.timing(menuOpacityAnim, {
        toValue: 1,
        duration: ANIMATION_DURATION.FAST,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeMenu = () => {
    Animated.parallel([
      Animated.timing(menuSlideAnim, {
        toValue: 0,
        duration: ANIMATION_DURATION.NORMAL,
        useNativeDriver: true,
      }),
      Animated.timing(menuOpacityAnim, {
        toValue: 0,
        duration: ANIMATION_DURATION.FAST,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowMenu(false);
    });
  };

  const completeOnboarding = async () => {
    console.log("🎉 completeOnboarding called");
    console.log("👤 djProfile:", djProfile);

    // Check both property name formats for compatibility
    const djName = djProfile.dj_name || djProfile.djName;
    const firstName = djProfile.first_name || djProfile.firstName;
    const lastName = djProfile.last_name || djProfile.lastName;

    if (
      !djName ||
      !firstName ||
      !lastName ||
      !djProfile.city ||
      djProfile.genres.length === 0
    ) {
      console.log("❌ Missing required fields:", {
        djName: !!djName,
        firstName: !!firstName,
        lastName: !!lastName,
        city: !!djProfile.city,
        genres: djProfile.genres?.length || 0,
      });

      showCustomModal({
        type: "error",
        title: "Error",
        message:
          "Please fill in all required fields: DJ name, first name, last name, city, and at least one genre",
        primaryButtonText: "OK",
        onPrimaryPress: () => setShowModal(false),
      });
      return;
    }

    try {
      console.log("💾 Saving profile to database...");
      console.log("🔑 User ID:", user.id);
      console.log("📧 User email:", user.email);

      // Check if profile already exists
      let savedProfile;
      try {
        console.log("🔍 Checking if profile exists...");
        savedProfile = await db.getUserProfile(user.id);
        console.log("✅ Profile exists, updating...");
        console.log("📝 Existing profile:", savedProfile);

        // If profile exists, update it instead of creating new one
        const updateData = {
          dj_name: djName,
          first_name: firstName,
          last_name: lastName,
          instagram: djProfile.instagram || null,
          soundcloud: djProfile.soundcloud || null,
          city: djProfile.city,
          genres: djProfile.genres,
          bio: `DJ from ${
            djProfile.city
          } specializing in ${djProfile.genres.join(", ")}`,
        };
        console.log("📤 Updating with data:", updateData);

        savedProfile = await db.updateUserProfile(user.id, updateData);
        console.log("✅ Update complete:", savedProfile);
      } catch (error) {
        console.log(
          "🆕 Profile doesn't exist (or error checking):",
          error.message
        );
        console.log("🆕 Creating new profile...");

        // Profile doesn't exist, create new one
        const profileData = {
          id: user.id, // Use authenticated user's ID
          dj_name: djName,
          first_name: firstName,
          last_name: lastName,
          instagram: djProfile.instagram || null,
          soundcloud: djProfile.soundcloud || null,
          city: djProfile.city,
          genres: djProfile.genres,
          bio: `DJ from ${
            djProfile.city
          } specializing in ${djProfile.genres.join(", ")}`,
          email: user.email,
        };

        console.log("📤 Creating profile with data:", profileData);

        try {
          savedProfile = await db.createUserProfile(profileData);
          console.log("✅ Profile created successfully:", savedProfile);
        } catch (createError) {
          console.error("❌ Error creating profile:", createError);
          console.error(
            "❌ Error details:",
            JSON.stringify(createError, null, 2)
          );
          throw createError; // Re-throw to be caught by outer try-catch
        }
      }

      console.log("✅ Profile saved successfully:", savedProfile);

      // Also save to AsyncStorage for offline access
      await AsyncStorage.setItem("hasOnboarded", "true");
      await AsyncStorage.setItem("djProfile", JSON.stringify(djProfile));
      await AsyncStorage.setItem("userId", user.id);

      console.log("🎉 Onboarding completed, setting isFirstTime=false");
      setIsFirstTime(false);

      // Navigate to opportunities after onboarding completion
      setCurrentScreen("opportunities");

      showCustomModal({
        type: "success",
        title: "Success",
        message: "Welcome to R/HOOD! Your profile has been saved to the cloud.",
        primaryButtonText: "OK",
        onPrimaryPress: () => setShowModal(false),
      });
    } catch (error) {
      console.error("❌ Error saving profile:", error);
      showCustomModal({
        type: "error",
        title: "Error",
        message:
          "Failed to save profile. Please check your internet connection and try again.",
        primaryButtonText: "OK",
        onPrimaryPress: () => setShowModal(false),
      });
    }
  };

  // Wait for fonts to load
  if (!fontsLoaded) {
    console.log("⏳ App: Waiting for fonts to load...");
    return null; // or a loading screen
  }

  console.log("✅ App: Fonts loaded, checking app state");

  // Show splash screen first
  if (showSplash) {
    console.log("🎬 App: Rendering splash screen");
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

  // Show onboarding if first time user (only after auth is complete)
  if (isFirstTime && !authLoading && user) {
    console.log("📱 Showing onboarding for authenticated first-time user");
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

  // Show loading screen while determining auth state
  if (authLoading || (user && !djProfile)) {
    console.log(
      "📱 Showing loading screen - authLoading:",
      authLoading,
      "user:",
      !!user,
      "djProfile:",
      !!djProfile
    );
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <View
            style={[
              styles.container,
              { justifyContent: "center", alignItems: "center" },
            ]}
          >
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
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
    console.log("🎬 Rendering screen:", screen);
    switch (screen) {
      case "opportunities":
        return (
          <View style={[styles.screen, { backgroundColor: "hsl(0, 0%, 0%)" }]}>
            <View style={styles.opportunitiesContainer}>
              <View style={styles.opportunitiesHeader}>
                <Text style={styles.tsBlockBoldHeading}>OPPORTUNITIES</Text>
                <Text style={styles.opportunitiesSubtitle}>
                  Find your next DJ gig
                </Text>
                {/* Daily Application Counter */}
                <View style={styles.dailyApplicationCounter}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={16}
                    color={
                      dailyApplicationStats.can_apply
                        ? "hsl(75, 100%, 60%)"
                        : "hsl(0, 100%, 60%)"
                    }
                  />
                  <Text
                    style={[
                      styles.dailyApplicationText,
                      {
                        color: dailyApplicationStats.can_apply
                          ? "hsl(75, 100%, 60%)"
                          : "hsl(0, 100%, 60%)",
                      },
                    ]}
                  >
                    {dailyApplicationStats?.remaining_applications || 0}{" "}
                    applications remaining today
                  </Text>
                </View>
              </View>

              {/* Single Card with Transition */}
              <View style={styles.opportunitiesCardContainer}>
                {isLoadingOpportunities ? (
                  /* Loading state */
                  <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>
                      Loading opportunities...
                    </Text>
                  </View>
                ) : currentOpportunityIndex < opportunities.length ? (
                  (() => {
                    console.log(
                      "🎯 App.js - Rendering SwipeableOpportunityCard with dailyApplicationStats:",
                      dailyApplicationStats
                    );
                    return (
                      <SwipeableOpportunityCard
                        key={currentOpportunityIndex}
                        opportunity={opportunities[currentOpportunityIndex]}
                        onPress={() =>
                          handleOpportunityPress(
                            opportunities[currentOpportunityIndex]
                          )
                        }
                        onSwipeLeft={handleSwipeLeft}
                        onSwipeRight={handleSwipeRight}
                        isTopCard={true}
                        dailyApplicationStats={dailyApplicationStats}
                      />
                    );
                  })()
                ) : (
                  /* No more opportunities */
                  <View style={styles.noMoreOpportunities}>
                    <Ionicons
                      name="checkmark-circle"
                      size={64}
                      color="hsl(75, 100%, 60%)"
                    />
                    <Text style={styles.noMoreTitle}>All Caught Up!</Text>
                    <Text style={styles.noMoreSubtitle}>
                      You've seen all available opportunities. Check back later
                      for new gigs!
                    </Text>
                    <TouchableOpacity
                      style={styles.resetButton}
                      onPress={resetOpportunities}
                    >
                      <Text style={styles.resetButtonText}>Start Over</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </View>
        );

      case "messages":
        return (
          <MessagesScreen
            navigation={{ goBack: () => setCurrentScreen("connections") }}
            route={{ params: screenParams }}
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

      case "notifications":
        return (
          <NotificationsScreen
            onNavigate={(screen, params = {}) => {
              setCurrentScreen(screen);
              setScreenParams(params);
            }}
          />
        );

      case "community":
        return (
          <CommunityScreen
            onNavigate={(screen, params = {}) => {
              setCurrentScreen(screen);
              setScreenParams(params);
            }}
          />
        );

      case "profile":
        return (
          <ProfileScreen
            user={user}
            onNavigate={(screen, params = {}) => {
              setCurrentScreen(screen);
              setScreenParams(params);
            }}
          />
        );

      case "settings":
        return (
          <SettingsScreen
            user={user}
            onNavigate={(screen, params = {}) => {
              setCurrentScreen(screen);
              setScreenParams(params);
            }}
            onSignOut={() => {
              // Handle sign out
              setUser(null);
              setIsFirstTime(true);
              setDjProfile({
                djName: "",
                firstName: "",
                lastName: "",
                instagram: "",
                soundcloud: "",
                city: "",
                genres: [],
              });
              setCurrentScreen("login");
            }}
          />
        );

      case "upload-mix":
        return (
          <UploadMixScreen
            user={user}
            onBack={() => setCurrentScreen("profile")}
            onUploadComplete={(mix) => {
              console.log("Mix uploaded:", mix);
              setCurrentScreen("profile");
            }}
          />
        );

      case "edit-profile":
        return (
          <EditProfileScreen
            user={user}
            onSave={(updatedProfile) => {
              console.log("Profile updated:", updatedProfile);
              // Refresh user profile data
              if (user) {
                db.getUserProfile(user.id)
                  .then((profile) => {
                    console.log("✅ Profile refreshed after save");
                  })
                  .catch((error) => {
                    console.error("❌ Error refreshing profile:", error);
                  });
              }
              setCurrentScreen("profile");
            }}
            onCancel={() => setCurrentScreen("profile")}
          />
        );

      case "user-profile":
        return (
          <UserProfileView
            userId={screenParams.userId}
            onBack={() => setCurrentScreen("connections")}
            onNavigate={(screen, params = {}) => {
              setCurrentScreen(screen);
              setScreenParams(params);
            }}
          />
        );

      case "about":
        return <AboutScreen onBack={() => setCurrentScreen("opportunities")} />;

      case "terms":
        return (
          <TermsOfServiceScreen onBack={() => setCurrentScreen("settings")} />
        );

      case "privacy":
        return (
          <PrivacyPolicyScreen onBack={() => setCurrentScreen("settings")} />
        );

      case "help":
        return <HelpCenterScreen onBack={() => setCurrentScreen("settings")} />;

      case "listen":
        return (
          <ListenScreen
            globalAudioState={globalAudioState}
            onPlayAudio={playGlobalAudio}
            onPauseAudio={pauseGlobalAudio}
            onResumeAudio={resumeGlobalAudio}
            onStopAudio={stopGlobalAudio}
            onAddToQueue={addToQueue}
            onPlayNext={playNextTrack}
            onClearQueue={clearQueue}
            onNavigate={(screen, params = {}) => {
              setCurrentScreen(screen);
              setScreenParams(params);
            }}
            user={user}
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
              <Text style={styles.cardTitle}>Genres</Text>
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
              <Text style={styles.cardTitle}>Audio ID</Text>
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

      default:
        return (
          <ListenScreen
            globalAudioState={globalAudioState}
            onPlayAudio={playGlobalAudio}
            onPauseAudio={pauseGlobalAudio}
            onResumeAudio={resumeGlobalAudio}
            onStopAudio={stopGlobalAudio}
            onAddToQueue={addToQueue}
            onPlayNext={playNextTrack}
            onClearQueue={clearQueue}
            user={user}
          />
        );
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoContainer}>
              <Image
                source={require("./assets/rhood_logo.png")}
                style={styles.logoIcon}
                resizeMode="contain"
              />
              <Image
                source={require("./assets/RHOOD_Lettering_White.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.menuButton} onPress={openMenu}>
              <Ionicons name="menu" size={24} color="hsl(0, 0%, 100%)" />
            </TouchableOpacity>
          </View>
        </View>

        {renderScreen()}

        {/* Hide tab bar on messages screen */}
        {currentScreen !== "messages" && (
          <LinearGradient
            colors={["#000000", "#1a1a1a", "#000000"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.tabBar}
          >
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
          </LinearGradient>
        )}

        {/* Hamburger Menu Modal */}
        <Modal
          visible={showMenu}
          transparent={true}
          animationType="none"
          onRequestClose={closeMenu}
        >
          <Animated.View
            style={[
              styles.menuOverlay,
              {
                opacity: menuOpacityAnim,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.menuOverlayTouchable}
              activeOpacity={1}
              onPress={closeMenu}
            />
            <Animated.View
              style={[
                styles.menuContainer,
                {
                  transform: [
                    {
                      translateY: menuSlideAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [300, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.menuContent}>
                <View style={styles.menuHeader}>
                  <Text style={styles.tsBlockBoldHeading}>MENU</Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={closeMenu}
                  >
                    <Ionicons name="close" size={24} color="hsl(0, 0%, 100%)" />
                  </TouchableOpacity>
                </View>

                <View style={styles.menuItems}>
                  <TouchableOpacity
                    style={[
                      styles.menuItem,
                      currentScreen === "about" && styles.menuItemActive,
                    ]}
                    onPress={() => handleMenuNavigation("about")}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={20}
                      color="#C2CC06"
                    />
                    <View style={styles.menuItemContent}>
                      <Text style={styles.menuItemText}>About R/HOOD</Text>
                      <Text style={styles.menuItemDescription}>
                        Learn more about the app
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.menuItem,
                      currentScreen === "connections" && styles.menuItemActive,
                    ]}
                    onPress={() => handleMenuNavigation("connections")}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="chatbubbles-outline"
                      size={20}
                      color="#C2CC06"
                    />
                    <View style={styles.menuItemContent}>
                      <Text style={styles.menuItemText}>Messages</Text>
                      <Text style={styles.menuItemDescription}>
                        View all conversations
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.menuItem,
                      currentScreen === "notifications" &&
                        styles.menuItemActive,
                    ]}
                    onPress={() => handleMenuNavigation("notifications")}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="notifications-outline"
                      size={20}
                      color="#C2CC06"
                    />
                    <View style={styles.menuItemContent}>
                      <Text style={styles.menuItemText}>Notifications</Text>
                      <Text style={styles.menuItemDescription}>
                        Stay updated on activity
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.menuItem,
                      currentScreen === "community" && styles.menuItemActive,
                    ]}
                    onPress={() => handleMenuNavigation("community")}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="people-outline" size={20} color="#C2CC06" />
                    <View style={styles.menuItemContent}>
                      <Text style={styles.menuItemText}>Community</Text>
                      <Text style={styles.menuItemDescription}>
                        Connect with other DJs
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.menuItem,
                      currentScreen === "profile" && styles.menuItemActive,
                    ]}
                    onPress={() => handleMenuNavigation("profile")}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="person-outline" size={20} color="#C2CC06" />
                    <View style={styles.menuItemContent}>
                      <Text style={styles.menuItemText}>Profile</Text>
                      <Text style={styles.menuItemDescription}>
                        Manage your profile
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.menuItem,
                      currentScreen === "settings" && styles.menuItemActive,
                    ]}
                    onPress={() => handleMenuNavigation("settings")}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="settings-outline"
                      size={20}
                      color="#C2CC06"
                    />
                    <View style={styles.menuItemContent}>
                      <Text style={styles.menuItemText}>Settings</Text>
                      <Text style={styles.menuItemDescription}>
                        App preferences
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          </Animated.View>
        </Modal>

        {/* Global Audio Player - shows when there's a current track */}
        {globalAudioState.currentTrack && (
          <TouchableOpacity
            onPress={() => setShowFullScreenPlayer(true)}
            activeOpacity={0.9}
          >
            <Animated.View
              style={[
                styles.globalAudioPlayer,
                {
                  opacity: Animated.multiply(
                    audioPlayerOpacity,
                    audioPlayerSwipeOpacity
                  ),
                  transform: [
                    {
                      translateY: Animated.add(
                        audioPlayerTranslateY,
                        audioPlayerSwipeTranslateY
                      ),
                    },
                  ],
                },
              ]}
              {...audioPlayerPanResponder.panHandlers}
            >
              <View style={styles.audioPlayerContent}>
                {/* Album Art */}
                <View style={styles.audioAlbumArt}>
                  {globalAudioState.currentTrack.image ? (
                    <Image
                      source={{ uri: globalAudioState.currentTrack.image }}
                      style={styles.albumArtImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.albumArtPlaceholder}>
                      <Ionicons
                        name="musical-notes"
                        size={24}
                        color="hsl(75, 100%, 60%)"
                      />
                    </View>
                  )}
                </View>

                <View style={styles.audioTrackInfo}>
                  <AutoScrollText
                    text={globalAudioState.currentTrack.title}
                    style={styles.audioTrackTitle}
                    containerWidth={200}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      if (globalAudioState.currentTrack.user_id) {
                        setCurrentScreen("user-profile");
                        setScreenParams({
                          userId: globalAudioState.currentTrack.user_id,
                        });
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.audioTrackArtist} numberOfLines={1}>
                      {globalAudioState.currentTrack.artist}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Timer - Compact format */}
                <View style={styles.audioTimeContainer}>
                  <Text style={styles.audioTimeText}>
                    {formatTime(globalAudioState.positionMillis || 0)} /{" "}
                    {formatTime(globalAudioState.durationMillis || 0)}
                  </Text>
                </View>

                <View style={styles.audioControls}>
                  <TouchableOpacity
                    style={styles.audioControlButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      if (globalAudioState.isPlaying) {
                        pauseGlobalAudio();
                      } else {
                        resumeGlobalAudio();
                      }
                    }}
                  >
                    <Ionicons
                      name={globalAudioState.isPlaying ? "pause" : "play"}
                      size={24}
                      color="hsl(0, 0%, 100%)"
                    />
                  </TouchableOpacity>
                </View>

                {/* Progress Bar - Scrubbable */}
                <TouchableOpacity
                  ref={miniProgressBarRef}
                  style={styles.audioProgressContainer}
                  onPress={handleProgressBarPress}
                  activeOpacity={0.8}
                >
                  <View style={styles.audioProgressBar}>
                    <View
                      style={[
                        styles.audioProgressFill,
                        {
                          width: `${(globalAudioState.progress || 0) * 100}%`,
                        },
                      ]}
                    />
                  </View>
                </TouchableOpacity>
              </View>
            </Animated.View>
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
              <View
                style={styles.fullScreenPlayer}
                {...createGestureHandlers()}
              >
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
                  <AnimatedAlbumArt
                    image={globalAudioState.currentTrack.image}
                    isPlaying={globalAudioState.isPlaying}
                    style={styles.albumArt}
                  />
                </View>

                {/* Track Info */}
                <View style={styles.fullScreenTrackInfo}>
                  <Text style={styles.fullScreenTrackTitle}>
                    {globalAudioState.currentTrack.title}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      if (globalAudioState.currentTrack.user_id) {
                        setShowFullScreenPlayer(false);
                        setCurrentScreen("user-profile");
                        setScreenParams({
                          userId: globalAudioState.currentTrack.user_id,
                        });
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.fullScreenTrackArtist}>
                      {globalAudioState.currentTrack.artist}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.fullScreenTrackGenre}>
                    {globalAudioState.currentTrack.genre}
                  </Text>
                </View>

                {/* Enhanced Progress Section */}
                <View style={styles.fullScreenProgressSection}>
                  <EnhancedProgressBar
                    progress={globalAudioState.progress || 0}
                    duration={globalAudioState.durationMillis || 0}
                    position={globalAudioState.positionMillis || 0}
                    onSeek={(newProgress) => {
                      const newPosition =
                        newProgress * globalAudioState.durationMillis;
                      if (globalAudioState.sound) {
                        globalAudioState.sound.setPositionAsync(newPosition);
                      }
                    }}
                    isPlaying={globalAudioState.isPlaying}
                  />
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
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={toggleLike}
                  >
                    <Ionicons
                      name={
                        globalAudioState.currentTrack?.isLiked
                          ? "heart"
                          : "heart-outline"
                      }
                      size={20}
                      color={
                        globalAudioState.currentTrack?.isLiked
                          ? "hsl(0, 100%, 60%)"
                          : "hsl(0, 0%, 70%)"
                      }
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

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() =>
                      Alert.alert(
                        "More Options",
                        "Additional options coming soon!"
                      )
                    }
                  >
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

        {/* Custom RHOOD Modal */}
        <RhoodModal
          visible={showModal}
          onClose={() => setShowModal(false)}
          type={modalConfig.type}
          title={modalConfig.title}
          message={modalConfig.message}
          primaryButtonText={modalConfig.primaryButtonText}
          secondaryButtonText={modalConfig.secondaryButtonText}
          onPrimaryPress={modalConfig.onPrimaryPress}
          onSecondaryPress={modalConfig.onSecondaryPress}
        />

        {/* Brief Form Modal - REMOVED (simplified to swipe-to-apply) */}
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
  loadingText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
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
    fontFamily: "TS-Block-Bold",
    fontWeight: "900",
    letterSpacing: 1,
  },
  logoTextGreen: {
    color: "#C2CC06", // Brand lime green - matches the green logo
    fontSize: 18,
    fontFamily: "TS-Block-Bold",
    fontWeight: "900",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  logoTextWhite: {
    color: "#FFFFFF", // White - matches the white logo
    fontSize: 18,
    fontFamily: "TS-Block-Bold",
    fontWeight: "900",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  logoTextBlack: {
    color: "#000000", // Black - matches the black logo
    fontSize: 18,
    fontFamily: "TS-Block-Bold",
    fontWeight: "900",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  logoIcon: {
    height: 32,
    width: 32,
    marginRight: 8,
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
    fontSize: 20,
    fontFamily: "TS-Block-Bold",
    fontWeight: "bold",
    color: "#FFFFFF", // Brand white text
    marginBottom: 20,
    textAlign: "center",
    lineHeight: 24, // 120% of 20pt
    letterSpacing: 0, // Tracking set to 0
    textTransform: "uppercase",
  },
  title: {
    fontSize: 24,
    fontFamily: "TS-Block-Bold",
    fontWeight: "bold",
    color: "#C2CC06", // Brand lime green
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: 0, // Tracking set to 0
    lineHeight: 28.8, // 120% of 24pt
    textTransform: "uppercase",
  },
  // TS Block Bold for impactful headings
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
  subtitle: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    fontWeight: "300", // Light weight
    color: "hsl(0, 0%, 70%)", // Muted foreground
    textAlign: "center",
    marginBottom: 30,
    letterSpacing: 0, // Tracking set to 0
    lineHeight: 19.6, // 140% of 14pt for better readability
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
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
    color: "#C2CC06", // Brand lime green
    marginBottom: 5,
  },
  eventTitle: {
    fontSize: 18,
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
    color: "#FFFFFF", // Brand white text
    marginBottom: 8,
  },
  eventInfo: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
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
    fontFamily: "Helvetica Neue",
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
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
    color: "#FFFFFF", // Brand white text
    marginBottom: 5,
  },
  messagePreview: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)", // Muted foreground
    marginBottom: 5,
  },
  messageTime: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
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
    fontFamily: "TS-Block-Bold",
    fontWeight: "900",
    color: "#C2CC06", // Brand lime green
    marginBottom: 5,
    // Removed glow effects
  },
  profileName: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)", // Muted foreground
    marginBottom: 5,
  },
  profileCity: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
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
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
    color: "#C2CC06", // Brand lime green
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
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
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
  },
  tabBar: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: "row",
    borderRadius: 25,
    paddingVertical: 8,
    paddingHorizontal: 16,
    // Enhanced shadow for more lift
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 15, // Android shadow
    // Enhanced border for more lift
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.08)",
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
    fontSize: 13,
    fontFamily: "Helvetica Neue",
    fontWeight: "500", // Medium weight
    color: "hsl(0, 0%, 70%)", // Muted foreground
    textTransform: "capitalize", // Proper capitalization instead of uppercase
    letterSpacing: 0.3,
  },
  activeTabText: {
    color: "#C2CC06", // Brand lime green for active text
    fontWeight: "500", // Medium weight to match inactive tabs
  },
  // Empty Opportunities Screen Styles
  emptyOpportunitiesContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "hsl(0, 0%, 0%)",
    padding: 40,
    paddingHorizontal: 20,
  },
  emptyOpportunitiesTitle: {
    fontSize: 20,
    fontFamily: "TS-Block-Bold",
    fontWeight: "900",
    color: "hsl(0, 0%, 100%)",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
    width: "100%",
  },
  emptyOpportunitiesSubtitle: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
    textAlign: "center",
    width: "100%",
    lineHeight: 20,
  },
  opportunitiesContainer: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 0%)",
  },
  opportunitiesHeader: {
    padding: 20,
    paddingBottom: 10,
  },
  opportunitiesSubtitle: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
    marginBottom: 8,
  },
  dailyApplicationCounter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  dailyApplicationText: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    marginLeft: 6,
    fontWeight: "500",
  },
  opportunitiesCardContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
    position: "relative",
    justifyContent: "flex-start",
    alignItems: "center",
    backgroundColor: "hsl(0, 0%, 0%)", // Black background to prevent white flash
  },
  noMoreOpportunities: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    backgroundColor: "hsl(0, 0%, 0%)", // Black background
  },
  loadingText: {
    fontSize: 18,
    fontFamily: "Helvetica Neue",
    color: "hsl(75, 100%, 60%)",
    textAlign: "center",
  },
  noMoreTitle: {
    fontSize: 24,
    fontFamily: "TS-Block-Bold",
    color: "hsl(0, 0%, 100%)",
    marginTop: 20,
    marginBottom: 12,
    textAlign: "center",
  },
  noMoreSubtitle: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
  },
  resetButton: {
    backgroundColor: "hsl(75, 100%, 60%)",
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  resetButtonText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 0%)",
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
    fontFamily: "Helvetica Neue",
    color: "#FFFFFF", // Brand white text
    fontWeight: "bold",
  },
  opportunityContent: {
    padding: 20,
  },
  opportunityTitle: {
    fontSize: 20,
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
    color: "#FFFFFF", // Brand white text
    marginBottom: 10,
  },
  opportunityDescription: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)", // Muted foreground
    lineHeight: 20,
    marginBottom: 15,
  },
  opportunityDetails: {
    marginBottom: 15,
  },
  opportunityDetail: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
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
    fontFamily: "Helvetica Neue",
    color: "#FFFFFF", // Brand white text
    fontWeight: "bold",
  },
  organizerName: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
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
    fontFamily: "Helvetica Neue",
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
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
    color: "#C2CC06", // Brand lime green
    marginBottom: 5,
  },
  opportunityInfo: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
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
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
    color: "#FFFFFF", // Brand white text
    marginBottom: 5,
  },
  notificationText: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)", // Muted foreground
    marginBottom: 8,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
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
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
    color: "#C2CC06", // Brand lime green
    marginBottom: 5,
  },
  communityMembers: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)", // Muted foreground
    marginBottom: 8,
  },
  communityDescription: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
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
    fontFamily: "Helvetica Neue",
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
    fontFamily: "Helvetica Neue",
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
    fontFamily: "Helvetica Neue",
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
    fontFamily: "Helvetica Neue",
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "hsl(0, 0%, 70%)",
    fontFamily: "Helvetica Neue",
  },
  // Hamburger Menu Styles
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-end",
  },
  menuOverlayTouchable: {
    flex: 1,
  },
  menuContainer: {
    backgroundColor: "hsl(0, 0%, 5%)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
    borderBottomWidth: 0,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
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
    fontFamily: "TS-Block-Bold",
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
    gap: 12,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "hsl(0, 0%, 10%)",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  menuItemText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 100%)",
    fontWeight: "500",
    lineHeight: 20,
  },
  menuItemContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  menuItemDescription: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 60%)",
    marginTop: 2,
    lineHeight: 16,
  },
  menuItemActive: {
    backgroundColor: "hsl(0, 0%, 15%)",
    borderColor: "hsl(75, 100%, 60%)",
    borderWidth: 1,
  },

  // Global Audio Player Styles
  globalAudioPlayer: {
    position: "absolute",
    bottom: 120, // Above floating tab bar
    left: 16,
    right: 16,
    backgroundColor: "hsl(0, 0%, 8%)", // Fully opaque
    borderRadius: 16,
    paddingVertical: 20, // Increased padding for larger swipe area
    paddingHorizontal: 20,
    zIndex: 1001, // Higher than tab bar
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 1,
    borderColor: "#C2CC06", // Brand color border
    minHeight: 80, // Minimum height for easier swiping
  },
  audioPlayerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  audioAlbumArt: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
    overflow: "hidden",
  },
  albumArtImage: {
    width: "100%",
    height: "100%",
  },
  albumArtPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "hsl(0, 0%, 15%)",
    justifyContent: "center",
    alignItems: "center",
  },
  audioTrackInfo: {
    flex: 1,
    marginRight: 16,
  },
  audioTrackTitle: {
    fontSize: 14,
    fontFamily: "TS-Block-Bold",
    fontWeight: "900",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 4,
  },
  audioTrackArtist: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "#C2CC06",
    fontWeight: "600",
  },
  audioControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  audioControlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#C2CC06",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#C2CC06",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    marginLeft: 8,
  },
  audioCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  audioProgressContainer: {
    marginTop: 12,
    paddingVertical: 8, // Larger touch area
  },
  audioProgressBar: {
    height: 6,
    backgroundColor: "hsl(0, 0%, 15%)",
    borderRadius: 3,
    marginBottom: 8,
    position: "relative",
  },
  audioProgressFill: {
    height: "100%",
    backgroundColor: "#C2CC06",
    borderRadius: 2,
  },
  scrubberThumb: {
    position: "absolute",
    top: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#C2CC06",
    marginLeft: -6,
    shadowColor: "#C2CC06",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  scrubTimeText: {
    fontSize: 10,
    fontFamily: "Helvetica Neue",
    color: "#C2CC06",
    fontWeight: "600",
    textAlign: "center",
    marginTop: 4,
  },
  audioTimeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  audioTimeText: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 60%)",
    fontWeight: "500",
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
    backgroundColor: "hsl(0, 0%, 0%)", // Pure black background
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
    backgroundColor: "hsl(0, 0%, 8%)", // Brand backgroundSecondary
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Brand border
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
    fontSize: 28,
    fontFamily: "TS-Block-Bold",
    color: "hsl(0, 0%, 100%)", // Brand textPrimary
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
  },
  fullScreenTrackArtist: {
    fontSize: 18,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
    textAlign: "center",
    marginBottom: 4,
  },
  fullScreenTrackGenre: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "#C2CC06", // Brand primary color
    textAlign: "center",
    fontWeight: "600",
  },
  fullScreenProgressSection: {
    marginBottom: 40,
  },
  fullScreenProgressContainer: {
    paddingVertical: 12, // Larger touch area
    marginBottom: 12,
  },
  fullScreenProgressBarContainer: {
    height: 4,
    backgroundColor: "hsl(0, 0%, 20%)",
    borderRadius: 2,
    position: "relative",
  },
  fullScreenProgressBar: {
    height: "100%",
    backgroundColor: "#C2CC06",
    borderRadius: 2,
  },
  fullScreenScrubberThumb: {
    position: "absolute",
    top: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#C2CC06",
    marginLeft: -8,
    shadowColor: "#C2CC06",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 2,
    borderColor: "hsl(0, 0%, 0%)",
  },
  progressText: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)", // Brand textSecondary
    textAlign: "center",
    marginTop: 8,
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
    backgroundColor: "hsl(0, 0%, 8%)", // Brand backgroundSecondary
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Brand border
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
    backgroundColor: "hsl(0, 0%, 8%)", // Brand backgroundSecondary
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Brand border
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
  swipeHint: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    opacity: 0.7,
  },
  swipeHintText: {
    fontSize: 10,
    color: "#C2CC06",
    marginHorizontal: 4,
    fontFamily: "Helvetica Neue",
  },

  // Enhanced Progress Bar Styles
  enhancedProgressContainer: {
    width: "100%",
    paddingHorizontal: 20,
    marginVertical: 20,
  },
  enhancedProgressBar: {
    width: "100%",
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  progressTrack: {
    width: "100%",
    height: 8,
    backgroundColor: "hsl(0, 0%, 20%)",
    borderRadius: 4,
    position: "relative",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "hsl(75, 100%, 60%)",
    borderRadius: 4,
    position: "absolute",
    left: 0,
    top: 0,
  },
  progressThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "hsl(75, 100%, 60%)",
    position: "absolute",
    top: -4,
    shadowColor: "#C2CC06",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  timeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  timeText: {
    fontSize: 14,
    color: "hsl(0, 0%, 70%)",
    fontFamily: "Helvetica Neue",
    fontWeight: "500",
  },

  // Enhanced Album Art Styles
  albumArtImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  albumArtPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "hsl(0, 0%, 15%)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
});
