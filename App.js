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
  PanResponder,
  RefreshControl,
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
import ConnectionsScreen from "./components/ConnectionsScreen";
import ListenScreen from "./components/ListenScreen";
import MessagesScreen from "./components/MessagesScreen";
import NotificationsScreen from "./components/NotificationsScreen";
import CommunityScreen from "./components/CommunityScreen";
import ProfileScreen from "./components/ProfileScreen";
import SettingsScreen from "./components/SettingsScreen";
import RhoodModal from "./components/RhoodModal";
import SwipeableOpportunityCard from "./components/SwipeableOpportunityCard";
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
  });

  // Full-screen player state
  const [showFullScreenPlayer, setShowFullScreenPlayer] = useState(false);

  // Opportunities swipe state
  const [currentOpportunityIndex, setCurrentOpportunityIndex] = useState(0);
  const [swipedOpportunities, setSwipedOpportunities] = useState([]);

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

  // Mock opportunities data
  const mockOpportunities = [
    {
      id: 1,
      venue: "Underground Warehouse",
      title: "Friday Night Rave",
      location: "Brooklyn, NY",
      date: "March 15, 2024",
      time: "10:00 PM - 6:00 AM",
      audienceSize: "500+ people",
      description:
        "Join us for an electrifying night of underground electronic music. We're looking for DJs who can bring high-energy sets and keep the crowd moving all night long. This is a premier venue with state-of-the-art sound system and lighting.",
      genres: ["Techno", "House", "Trance"],
      compensation: "$300 - $500",
      applicationsLeft: 3,
      status: "hot", // hot, new, closing
      image:
        "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
    },
    {
      id: 2,
      venue: "The Loft",
      title: "Sunset Sessions",
      location: "Los Angeles, CA",
      date: "March 20, 2024",
      time: "6:00 PM - 12:00 AM",
      audienceSize: "200+ people",
      description:
        "Chill vibes and deep house for our sunset rooftop sessions. Perfect for DJs who love to create intimate, atmospheric experiences.",
      genres: ["Deep House", "Chillout", "Ambient"],
      compensation: "$200 - $350",
      applicationsLeft: 7,
      status: "new",
      image:
        "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=400&fit=crop",
    },
    {
      id: 3,
      venue: "Bass Station",
      title: "Bass Night",
      location: "Miami, FL",
      date: "March 25, 2024",
      time: "9:00 PM - 4:00 AM",
      audienceSize: "800+ people",
      description:
        "Heavy bass and high energy for our biggest night of the month. Looking for DJs who can handle the intensity and keep the crowd hyped.",
      genres: ["Drum & Bass", "Dubstep", "Bass"],
      compensation: "$400 - $600",
      applicationsLeft: 1,
      status: "closing",
      image:
        "https://images.unsplash.com/photo-1571266028243-e68fdf4ce6d9?w=400&h=400&fit=crop",
    },
    {
      id: 4,
      venue: "Electric Garden",
      title: "Neon Dreams",
      location: "Austin, TX",
      date: "March 30, 2024",
      time: "8:00 PM - 2:00 AM",
      audienceSize: "350+ people",
      description:
        "Futuristic beats and neon vibes at our outdoor garden venue. We're seeking DJs who can blend electronic genres and create an otherworldly atmosphere under the stars.",
      genres: ["Future Bass", "Synthwave", "Electronic"],
      compensation: "$250 - $400",
      applicationsLeft: 5,
      status: "new",
      image:
        "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop",
    },
    {
      id: 5,
      venue: "Sky Lounge",
      title: "Cloud Nine",
      location: "Chicago, IL",
      date: "April 5, 2024",
      time: "7:00 PM - 1:00 AM",
      audienceSize: "150+ people",
      description:
        "Elevated vibes at our rooftop lounge with panoramic city views. Perfect for DJs who specialize in ambient, chill, and progressive house music.",
      genres: ["Progressive House", "Ambient", "Chill"],
      compensation: "$180 - $300",
      applicationsLeft: 8,
      status: "hot",
      image:
        "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=400&fit=crop",
    },
    {
      id: 6,
      venue: "The Underground",
      title: "Midnight Sessions",
      location: "Seattle, WA",
      date: "April 10, 2024",
      time: "11:00 PM - 5:00 AM",
      audienceSize: "400+ people",
      description:
        "Deep underground venue with state-of-the-art sound system. We're looking for DJs who can deliver immersive techno and minimal sets that take the crowd on a journey.",
      genres: ["Minimal Techno", "Deep Techno", "Industrial"],
      compensation: "$350 - $500",
      applicationsLeft: 2,
      status: "closing",
      image:
        "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400&h=400&fit=crop",
    },
  ];

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
          // User signed in, check their profile status
          setUser(session.user);
          await checkFirstTime(session.user);
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
      try {
        const result = await Audio.Sound.createAsync(track.audioUrl, {
          shouldPlay: false,
          isLooping: false,
          volume: 1.0,
        });
        sound = result.sound;
        console.log("✅ Sound loaded successfully");
      } catch (loadError) {
        console.error("❌ Error loading sound:", loadError);
        throw new Error(`Failed to load audio file: ${loadError.message}`);
      }

      console.log("🔄 Sound created:", sound);

      // Set up status update listener
      sound.setOnPlaybackStatusUpdate((status) => {
        console.log("📊 Audio status update:", status);
        if (status.isLoaded) {
          setGlobalAudioState((prev) => ({
            ...prev,
            isPlaying: status.isPlaying,
            isLoading: false,
            progress: status.positionMillis / status.durationMillis || 0,
            positionMillis: status.positionMillis || 0,
            durationMillis: status.durationMillis || 0,
          }));
        } else if (status.error) {
          console.error("❌ Audio error:", status.error);
          setGlobalAudioState((prev) => ({ ...prev, isLoading: false }));
        }
      });

      // Store reference for cleanup
      globalAudioRef.current = sound;

      // Start playing
      console.log("▶️ Starting playback...");
      await sound.playAsync();

      setGlobalAudioState((prev) => ({
        ...prev,
        sound: sound,
        isPlaying: true,
        currentTrack: track,
        isLoading: false,
      }));

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

  // Skip forward functionality
  const skipForward = async () => {
    if (globalAudioRef.current) {
      try {
        const currentPosition = globalAudioState.positionMillis || 0;
        const duration = globalAudioState.durationMillis || 0;
        const newPosition = Math.min(
          currentPosition + 10000, // Skip 10 seconds
          duration
        );
        await globalAudioRef.current.seekTo(newPosition);
      } catch (error) {
        console.log("Error skipping forward:", error);
      }
    }
  };

  // Skip backward functionality
  const skipBackward = async () => {
    if (globalAudioRef.current) {
      try {
        const currentPosition = globalAudioState.positionMillis || 0;
        const newPosition = Math.max(
          currentPosition - 10000, // Skip back 10 seconds
          0
        );
        await globalAudioRef.current.seekTo(newPosition);
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

  const checkFirstTime = async (currentUser = null) => {
    try {
      const userToCheck = currentUser || user;

      // If user is authenticated, they should go straight to home
      // Only show onboarding for unauthenticated users or if no profile exists
      if (userToCheck) {
        // User is signed in, check if they have a profile
        try {
          const profile = await db.getUserProfile(userToCheck.id);
          if (profile) {
            setDjProfile(profile);
            setIsFirstTime(false); // User has profile, go to home
          } else {
            setIsFirstTime(true); // User signed in but no profile, needs onboarding
          }
        } catch (error) {
          console.log(
            "No profile found for authenticated user, needs onboarding"
          );
          setIsFirstTime(true);
        }
      } else {
        // No user, check local storage for offline access
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
    const currentOpportunity = mockOpportunities[currentOpportunityIndex];
    setSwipedOpportunities([
      ...swipedOpportunities,
      { ...currentOpportunity, action: "pass" },
    ]);
    setCurrentOpportunityIndex(currentOpportunityIndex + 1);
  };

  const handleSwipeRight = () => {
    // Like/Apply to opportunity
    const currentOpportunity = mockOpportunities[currentOpportunityIndex];
    setSwipedOpportunities([
      ...swipedOpportunities,
      { ...currentOpportunity, action: "like" },
    ]);
    setCurrentOpportunityIndex(currentOpportunityIndex + 1);

    // Show application modal
    showCustomModal({
      type: "success",
      title: "Application Sent!",
      message: `Your application for ${currentOpportunity.title} has been sent successfully. You'll hear back within 48 hours.`,
      primaryButtonText: "OK",
    });
  };

  const resetOpportunities = () => {
    setCurrentOpportunityIndex(0);
    setSwipedOpportunities([]);
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
    if (
      !djProfile.djName ||
      !djProfile.firstName ||
      !djProfile.lastName ||
      !djProfile.city ||
      djProfile.genres.length === 0
    ) {
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
      // Check if profile already exists
      let savedProfile;
      try {
        savedProfile = await db.getUserProfile(user.id);
        // If profile exists, update it instead of creating new one
        savedProfile = await db.updateUserProfile(user.id, {
          dj_name: djProfile.djName,
          full_name: djProfile.fullName,
          instagram: djProfile.instagram || null,
          soundcloud: djProfile.soundcloud || null,
          city: djProfile.city,
          genres: djProfile.genres,
          bio: `DJ from ${
            djProfile.city
          } specializing in ${djProfile.genres.join(", ")}`,
        });
      } catch (error) {
        // Profile doesn't exist, create new one
        const profileData = {
          id: user.id, // Use authenticated user's ID
          dj_name: djProfile.djName,
          full_name: djProfile.fullName,
          instagram: djProfile.instagram || null,
          soundcloud: djProfile.soundcloud || null,
          city: djProfile.city,
          genres: djProfile.genres,
          bio: `DJ from ${
            djProfile.city
          } specializing in ${djProfile.genres.join(", ")}`,
          email: user.email,
        };

        savedProfile = await db.createUserProfile(profileData);
      }

      // Also save to AsyncStorage for offline access
      await AsyncStorage.setItem("hasOnboarded", "true");
      await AsyncStorage.setItem("djProfile", JSON.stringify(djProfile));
      await AsyncStorage.setItem("userId", user.id);

      setIsFirstTime(false);
      showCustomModal({
        type: "success",
        title: "Success",
        message: "Welcome to R/HOOD! Your profile has been saved to the cloud.",
        primaryButtonText: "OK",
        onPrimaryPress: () => setShowModal(false),
      });
    } catch (error) {
      console.error("Error saving profile:", error);
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
    console.log("🎬 Rendering screen:", screen);
    switch (screen) {
      case "opportunities":
        return (
          <View style={styles.screen}>
            <View style={styles.opportunitiesContainer}>
              <View style={styles.opportunitiesHeader}>
                <Text style={styles.opportunitiesTitle}>Opportunities</Text>
                <Text style={styles.opportunitiesSubtitle}>
                  Find your next DJ gig
                </Text>
              </View>

              {/* Swipeable Card Stack */}
              <View style={styles.opportunitiesCardContainer}>
                {currentOpportunityIndex < mockOpportunities.length &&
                mockOpportunities[currentOpportunityIndex] ? (
                  <>
                    {/* Next card (background) */}
                    {currentOpportunityIndex + 1 < mockOpportunities.length && (
                      <View style={styles.nextCard}>
                        <SwipeableOpportunityCard
                          opportunity={
                            mockOpportunities[currentOpportunityIndex + 1]
                          }
                          onPress={() =>
                            handleOpportunityPress(
                              mockOpportunities[currentOpportunityIndex + 1]
                            )
                          }
                          isTopCard={false}
                        />
                      </View>
                    )}

                    {/* Current card (top) */}
                    <SwipeableOpportunityCard
                      opportunity={mockOpportunities[currentOpportunityIndex]}
                      onPress={() =>
                        handleOpportunityPress(
                          mockOpportunities[currentOpportunityIndex]
                        )
                      }
                      onSwipeLeft={handleSwipeLeft}
                      onSwipeRight={handleSwipeRight}
                      isTopCard={true}
                    />
                  </>
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
            onNavigate={(screen, params = {}) => {
              setCurrentScreen(screen);
              setScreenParams(params);
            }}
          />
        );

      case "settings":
        return (
          <SettingsScreen
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
            navigation={{ goBack: () => setCurrentScreen("connections") }}
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
          <ListenScreen
            globalAudioState={globalAudioState}
            onPlayAudio={playGlobalAudio}
            onPauseAudio={pauseGlobalAudio}
            onResumeAudio={resumeGlobalAudio}
            onStopAudio={stopGlobalAudio}
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
            <TouchableOpacity
              style={styles.audioPlayerContent}
              onPress={() => setShowFullScreenPlayer(true)}
              activeOpacity={0.8}
              disabled={isAudioPlayerSwiping}
            >
              <View style={styles.audioTrackInfo}>
                <Text style={styles.audioTrackTitle} numberOfLines={1}>
                  {globalAudioState.currentTrack.title}
                </Text>
                <Text style={styles.audioTrackArtist} numberOfLines={1}>
                  {globalAudioState.currentTrack.artist}
                </Text>
                {/* Swipe hint indicator */}
                {!isAudioPlayerSwiping && (
                  <View style={styles.swipeHint}>
                    <Ionicons name="chevron-up" size={12} color="#C2CC06" />
                    <Text style={styles.swipeHintText}>
                      Swipe up for full player
                    </Text>
                    <Ionicons name="chevron-down" size={12} color="#C2CC06" />
                    <Text style={styles.swipeHintText}>
                      Swipe down to dismiss
                    </Text>
                  </View>
                )}
              </View>

              {/* Timer in the middle */}
              <View style={styles.audioTimeContainer}>
                <Text style={styles.audioTimeText}>
                  {formatTime(globalAudioState.positionMillis || 0)}
                </Text>
                <Text style={styles.audioTimeText}>
                  {formatTime(globalAudioState.durationMillis || 0)}
                </Text>
              </View>

              <View style={styles.audioControls}>
                <TouchableOpacity
                  style={styles.audioControlButton}
                  onPress={() => {
                    if (globalAudioState.isPlaying) {
                      pauseGlobalAudio();
                    } else {
                      resumeGlobalAudio();
                    }
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
                  onPress={() => {
                    // Skip forward 15 seconds
                    // This would need to be implemented in the audio functions
                  }}
                >
                  <Ionicons
                    name="play-skip-forward"
                    size={20}
                    color="hsl(0, 0%, 100%)"
                  />
                </TouchableOpacity>
              </View>

              {/* Progress Bar */}
              <View style={styles.audioProgressContainer}>
                <View style={styles.audioProgressBar}>
                  <View
                    style={[
                      styles.audioProgressFill,
                      { width: `${globalAudioState.progress || 0}%` },
                    ]}
                  />
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
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
  opportunitiesTitle: {
    fontSize: 24,
    fontFamily: "TS-Block-Bold",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 8,
  },
  opportunitiesSubtitle: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
  },
  opportunitiesCardContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  nextCard: {
    position: "absolute",
    top: 30,
    left: 20,
    right: 20,
    transform: [{ scale: 0.95 }],
    opacity: 0.8,
  },
  noMoreOpportunities: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
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
  audioTrackInfo: {
    flex: 1,
    marginRight: 16,
  },
  audioTrackTitle: {
    fontSize: 16,
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
  },
  audioProgressBar: {
    height: 4,
    backgroundColor: "hsl(0, 0%, 15%)",
    borderRadius: 2,
    marginBottom: 8,
  },
  audioProgressFill: {
    height: "100%",
    backgroundColor: "#C2CC06",
    borderRadius: 2,
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
});
