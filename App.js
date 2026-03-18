import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
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
  Platform,
  InteractionManager,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
// Import Audio from expo-av (works in Expo Go)
import { Audio } from "expo-av";
import lockScreenControls from "./lib/lockScreenControls";

// Playback uses expo-av only (TrackPlayer removed for reliable duration/position and seeking)
import { LinearGradient } from "expo-linear-gradient";
import { useFonts } from "expo-font";
import * as Haptics from "expo-haptics";
import { HapticPatterns } from "./lib/haptics";
import {
  setupAudioNotificationCategories,
  setupNotificationListeners as setupAudioNotificationListeners,
  requestNotificationPermissions,
} from "./lib/notificationSetup";
import RhoodModal from "./components/RhoodModal";
import ProgressiveImage from "./components/ProgressiveImage";
import EditProfileScreen from "./components/EditProfileScreen";
import AuthGate from "./components/AuthGate";
import { db, auth, supabase } from "./lib/supabase";
import { clearScreenCachesForUser } from "./lib/screenCache";
import { APPLICATION_LIMITS } from "./lib/performanceConstants";
import {
  ANIMATION_DURATION,
  NATIVE_ANIMATION_CONFIG,
  SPRING_CONFIG,
  PERFORMANCE_THRESHOLDS,
} from "./lib/performanceConstants";
import AppShell from "./components/AppShell";
import ScreenRouter from "./navigation/ScreenRouter";
import { getAudioErrorMessage } from "./lib/errorMessages";
// Push notifications - gracefully handle Expo Go limitations
import {
  registerForPushNotifications,
  setupNotificationListeners,
} from "./lib/pushNotifications";
import {
  getCurrentLocation,
  calculateDistance,
  formatDistance,
  checkLocationMatch,
} from "./lib/locationService";
import {
  initAnalytics,
  setAnalyticsUser,
  resetAnalyticsUser,
  track,
  trackScreenView,
  AnalyticsEvents,
} from "./lib/analytics";
import { useAudioState, useAudioActions } from "./context/AudioContext";
import GlobalAudioPlayerUI from "./components/GlobalAudioPlayerUI";

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
  // Use the actual font family name "TS Block Bold" (not PostScript name)
  // This matches the internal font name from the TTF file
  const [fontsLoaded, fontError] = useFonts({
    "TS Block Bold": require("assets/TS Block Bold.ttf"),
  });

  // Log font status (but don't block app if it fails)
  useEffect(() => {
    if (fontError) {
      // Font failed to load - app will use system fonts gracefully
      console.warn(
        "⚠️ Custom font not available, using system fonts:",
        fontError?.message?.substring(0, 80)
      );
    } else if (fontsLoaded) {
      console.log("✅ TS Block Bold font loaded successfully");
    }
  }, [fontsLoaded, fontError]);

  // Format time helper function
  const formatTime = (milliseconds) => {
    if (!milliseconds || milliseconds < 0) return "0:00";
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const [showSplash, setShowSplash] = useState(true);
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Fast-start: skip custom splash for returning users so the app feels like a warm resume
  const HAS_COMPLETED_SPLASH_KEY = "hasCompletedSplashOnce";
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(HAS_COMPLETED_SPLASH_KEY).then((value) => {
      if (!cancelled && value === "true") setShowSplash(false);
    });
    return () => { cancelled = true; };
  }, []);
  const [currentScreen, setCurrentScreen] = useState("opportunities");
  const [screenParams, setScreenParams] = useState({});

  // Notification badge state
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [showFadeOverlay, setShowFadeOverlay] = useState(false);
  const fadeOverlayAnim = useRef(new Animated.Value(0)).current;
  const menuSlideAnim = useRef(new Animated.Value(0)).current;
  const menuOpacityAnim = useRef(new Animated.Value(0)).current;
  const fullScreenMenuOpacityAnim = useRef(new Animated.Value(0)).current;

  // Authentication state
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("login"); // 'login' or 'signup'

  // Audio: subscribe to currentTrack so we can pass it to the player UI (ensures mini bar shows when playback starts)
  const audioState = useAudioState();
  const { setGlobalAudioState, actionsRef, stateRef } = useAudioActions();

  // Pending track: set synchronously when user taps a mix so mini bar shows immediately (before context updates)
  const [pendingPlayTrack, setPendingPlayTrack] = useState(null);
  useEffect(() => {
    if (audioState.currentTrack?.id && pendingPlayTrack?.id === audioState.currentTrack.id) {
      setPendingPlayTrack(null);
    }
  }, [audioState.currentTrack?.id, pendingPlayTrack?.id]);

  // Audio error modal state
  const [audioErrorModal, setAudioErrorModal] = useState({ visible: false, title: "", message: "" });

  // Like state
  const [likedMixIds, setLikedMixIds] = useState(() => new Set());

  // Initialize notification setup for lock screen audio controls
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        // Request notification permissions
        await requestNotificationPermissions();

        // Set up notification categories for iOS
        await setupAudioNotificationCategories();

        // Set up notification listeners
        const removeListeners = setupAudioNotificationListeners();

        // Initialize lock screen controls
        // Lock screen: Android uses lockScreenControls; iOS uses system now playing if configured
        // On Android, this sets up MediaStyle notifications
        await lockScreenControls.initialize();

        console.log("✅ Lock screen audio controls initialized");

        return removeListeners;
      } catch (error) {
        console.error("❌ Error initializing notifications:", error);
      }
    };

    initializeNotifications();

    // Initialize analytics
    (async () => {
      await initAnalytics();
      await track(AnalyticsEvents.APP_OPEN);
    })();
  }, []);

  // Track screen views when screen changes
  useEffect(() => {
    if (currentScreen && user) {
      trackScreenView(currentScreen, screenParams);
    }
  }, [currentScreen, user]);

  // Complete profile modal state
  const [showCompleteProfileModal, setShowCompleteProfileModal] =
    useState(false);
  const [hasShownCompleteProfileModal, setHasShownCompleteProfileModal] =
    useState(false);

  // Location state
  const [userLocation, setUserLocation] = useState(null);
  const [locationMismatchWarning, setLocationMismatchWarning] = useState(false);

  // Opportunities state - now using live data from Supabase
  const [opportunities, setOpportunities] = useState([]);
  const [currentOpportunityIndex, setCurrentOpportunityIndex] = useState(0);
  const [swipedOpportunities, setSwipedOpportunities] = useState([]);
  const [isLoadingOpportunities, setIsLoadingOpportunities] = useState(true);
  const [showSwipeTutorial, setShowSwipeTutorial] = useState(false);
  const [inAppNotification, setInAppNotification] = useState(null);
  const inAppNotificationAnim = useRef(new Animated.Value(0)).current;

  // Brief form state - REMOVED (no longer needed for simplified swipe-to-apply)
  // But we still need selectedOpportunity for the details modal
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);

  // Daily application limit state
  const [dailyApplicationStats, setDailyApplicationStats] = useState({
    daily_count: 0,
    remaining_applications: 5,
    can_apply: true,
  });

  // Audio player animation moved to GlobalAudioPlayerUI so only that subtree re-renders on audio change

  // Application sent modal state

  // Edit profile modal state
  const [showEditProfile, setShowEditProfile] = useState(false);

  // Custom modal state
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    type: "info",
    title: "",
    message: "",
    eventDetails: null,
    primaryButtonText: "OK",
    secondaryButtonText: null,
    onPrimaryPress: null,
    onSecondaryPress: null,
    showCloseButton: true,
  });

  // Global audio instance reference for cleanup
  const globalAudioRef = useRef(null);
  const progressPollIntervalRef = useRef(null);

  // Guards to prevent duplicate calls
  const isPlayingAudioRef = useRef(false);
  const trackFinishedRef = useRef(false);
  const isScrubbingRef = useRef(false);

  const clearProgressPoll = useCallback(() => {
    if (progressPollIntervalRef.current) {
      clearInterval(progressPollIntervalRef.current);
      progressPollIntervalRef.current = null;
    }
  }, []);

  // Refs to store latest functions for background service callbacks
  const playNextTrackRef = useRef(null);
  const playPreviousTrackRef = useRef(null);
  const pauseGlobalAudioRef = useRef(null);
  const resumeGlobalAudioRef = useRef(null);
  const seekGlobalAudioRef = useRef(null);
  // stateRef from context is kept in sync by AudioProvider – use for latest audio state in callbacks

  // All opportunities data comes from database

  // Helper function to show custom modal
  const showCustomModal = (config) => {
    setModalConfig({
      type: config.type || "info",
      title: config.title || "",
      message: config.message || "",
      eventDetails: config.eventDetails || null,
      primaryButtonText: config.primaryButtonText || "OK",
      secondaryButtonText: config.secondaryButtonText || null,
      onPrimaryPress: config.onPrimaryPress || null,
      onSecondaryPress: config.onSecondaryPress || null,
      showCloseButton:
        config.showCloseButton !== undefined ? config.showCloseButton : true,
      showShareButton:
        config.showShareButton !== undefined ? config.showShareButton : false,
      shareOpportunity: config.shareOpportunity || null,
      shareUserId: config.shareUserId || null,
      onShareInApp: config.onShareInApp || null,
    });
    setShowModal(true);
  };

  const hideCustomModal = () => {
    setShowModal(false);
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

    // Handle deep links for password reset
    const handleDeepLink = async (url) => {
      if (!url) return;
      
      console.log("🔗 Deep link received:", url);
      
      try {
        // Handle both rhoodapp://reset-password and rhoodapp://reset-password#... formats
        if (url.includes("reset-password")) {
          // Supabase includes tokens in the URL hash/fragment
          // Format: rhoodapp://reset-password#access_token=xxx&type=recovery&refresh_token=xxx
          const hashIndex = url.indexOf("#");
          if (hashIndex !== -1) {
            const hash = url.substring(hashIndex + 1);
            const params = new URLSearchParams(hash);
            const accessToken = params.get("access_token");
            const refreshToken = params.get("refresh_token");
            const type = params.get("type");
            
            console.log("🔐 Password reset link detected:", { 
              hasAccessToken: !!accessToken, 
              hasRefreshToken: !!refreshToken,
              type 
            });
            
            if (type === "recovery" && accessToken) {
              // Set the session using the tokens from the reset link
              const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || "",
              });
              
              if (error) {
                console.error("❌ Error setting reset session:", error);
                Alert.alert("Error", "This password reset link is invalid or has expired. Please request a new one.");
                return;
              }
              
              console.log("✅ Reset session established, showing reset password screen");
              setShowAuth(false);
              setCurrentScreen("reset-password");
            }
          } else {
            // No hash - might be opening the screen directly
            // Check if there's an active recovery session
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              console.log("✅ Active session found, showing reset password screen");
              setShowAuth(false);
              setCurrentScreen("reset-password");
            }
          }
        }
      } catch (error) {
        console.error("❌ Error handling deep link:", error);
        // If URL parsing fails, try checking for active session
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session && url.includes("reset-password")) {
            setShowAuth(false);
            setCurrentScreen("reset-password");
          }
        } catch (sessionError) {
          console.error("❌ Error checking session:", sessionError);
        }
      }
    };

    // Check for initial URL (app opened from link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Listen for deep links while app is running
    const linkingSubscription = Linking.addEventListener("url", (event) => {
      handleDeepLink(event.url);
    });

    // Setup push notifications (gracefully handle Expo Go limitations)
    // Note: Push notifications work in development builds but not in Expo Go
    try {
      setupPushNotifications();
    } catch (error) {
      console.log(
        "Push notifications not available (running in Expo Go):",
        error.message
      );
    }

    // Handle app state changes for background audio
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === "background" && stateRef.current.isPlaying) {
        console.log("App went to background, audio should continue playing");
      } else if (nextAppState === "active" && stateRef.current.isPlaying) {
        console.log("App became active, audio is still playing");
      }
    };

    const appStateSubscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    // Cleanup on unmount
    return () => {
      linkingSubscription?.remove();
      appStateSubscription?.remove();
      clearProgressPoll();
      if (globalAudioRef.current) {
        globalAudioRef.current.unloadAsync();
        globalAudioRef.current = null;
      }
    };
  }, [clearProgressPoll]);

  // Load notification counts when user changes
  useEffect(() => {
    if (user) {
      loadNotificationCounts();
    }
  }, [user]);

  // State to track network errors for daily stats refresh
  const [networkErrorCount, setNetworkErrorCount] = useState(0);
  const intervalRef = useRef(null); // To store the interval ID

  // Check if swipe tutorial should be shown (first time user sees opportunities)
  useEffect(() => {
    const checkSwipeTutorial = async () => {
      if (currentScreen === "opportunities" && user?.id && !isLoadingOpportunities && opportunities.length > 0) {
        try {
          const hasSeenTutorial = await AsyncStorage.getItem("hasSeenSwipeTutorial");
          if (!hasSeenTutorial) {
            // Small delay to ensure screen is fully rendered
            setTimeout(() => {
              setShowSwipeTutorial(true);
            }, 500);
          }
        } catch (error) {
          console.error("Error checking swipe tutorial:", error);
        }
      }
    };
    checkSwipeTutorial();
  }, [currentScreen, user?.id, isLoadingOpportunities, opportunities.length]);

  // Refresh daily application stats when on opportunities screen
  useEffect(() => {
    if (currentScreen === "opportunities" && user?.id) {
      const refreshStats = async () => {
        try {
          const stats = await db.getUserDailyApplicationStats(user.id);
          setDailyApplicationStats(stats);
          setNetworkErrorCount(0); // Reset error count on success
          console.log("🔄 Refreshed daily application stats:", stats);
        } catch (error) {
          const isNetworkError =
            error?.message?.includes("Network request failed") ||
            error?.message?.includes("Failed to fetch") ||
            error?.code === "NETWORK_ERROR";

          // Use warn for network failures so we don't trigger the red error overlay (common in simulator)
          if (isNetworkError) {
            console.warn("⚠️ Daily stats refresh failed (network):", error?.message || error);
          } else {
            console.error("Error refreshing daily stats:", error);
          }

          if (isNetworkError) {
            setNetworkErrorCount((prevCount) => {
              const newCount = prevCount + 1;
              if (newCount >= 3) {
                // Stop refreshing after 3 consecutive network errors
                console.warn(
                  "🚫 Stopping daily stats refresh due to persistent network errors"
                );
                if (intervalRef.current) {
                  clearInterval(intervalRef.current);
                  intervalRef.current = null;
                }
                // Don't show error for network issues that are likely temporary
                return newCount;
              }
              return newCount;
            });
          } else {
            // For other errors, reset the count
            setNetworkErrorCount(0);
          }
        }
      };

      // Clear any existing interval before setting a new one
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Refresh immediately and then every 5 seconds while on screen
      refreshStats();
      intervalRef.current = setInterval(refreshStats, 5000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setNetworkErrorCount(0); // Reset error count when leaving screen
      };
    } else {
      // If not on opportunities screen or no user, clear interval if it exists
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setNetworkErrorCount(0); // Reset error count when leaving screen
    }
  }, [currentScreen, user?.id]);

  // Refresh notification counts when app becomes active
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === "active" && user) {
        loadNotificationCounts();
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => subscription?.remove();
  }, [user]);

  // Setup push notifications
  const setupPushNotifications = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.log("Skipping push setup - no authenticated user");
        return;
      }

      const userSettings = await db.getUserSettings(user.id);
      if (userSettings?.push_notifications === false) {
        console.log(
          "Push notifications disabled in settings. Skipping registration."
        );
        return;
      }

      const token = await registerForPushNotifications();
      if (!token) {
        console.log("Unable to obtain push notification token");
        return;
      }

      console.log("Push notification token obtained:", token);

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

        // Handle specific refresh token errors
        if (
          sessionError.message?.includes("Refresh Token") ||
          sessionError.message?.includes("Invalid Refresh Token")
        ) {
          console.log(
            "🔄 Invalid refresh token detected, clearing session and signing out"
          );
          try {
            await supabase.auth.signOut();
          } catch (signOutError) {
            console.log("Sign out error:", signOutError);
          }
        }

        // Clear invalid session
        setUser(null);
        setAuthLoading(false);
        await checkFirstTime(null);
      } else {
        setUser(session?.user ?? null);
        await checkFirstTime(session?.user ?? null);
        setAuthLoading(false);
      }

      // Listen for auth changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        // Handle token refresh errors
        if (event === "TOKEN_REFRESHED" && !session) {
          console.log("🔄 Token refresh failed, signing out");
          try {
            await supabase.auth.signOut();
          } catch (signOutError) {
            console.log("Sign out error during token refresh:", signOutError);
          }
          setUser(null);
          setAuthLoading(false);
          await checkFirstTime(null);
          return;
        }

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
      // Playback uses expo-av only (TrackPlayer removed)
      if (Platform.OS === "android") {
        console.log("✅ Global audio configured for Android background playback");
      }

      // Queue navigation callbacks will be set up after functions are defined
      // See useEffect below that sets up setQueueNavigationCallbacks
    } catch (error) {
      console.log("❌ Error setting up global audio:", error);
    }
  };

  const handleSplashFinish = () => {
    // Persist so next cold start skips splash (fast-start / warm-resume feel)
    AsyncStorage.setItem(HAS_COMPLETED_SPLASH_KEY, "true");
    setShowFadeOverlay(true);
    Animated.timing(fadeOverlayAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      setShowSplash(false);
      Animated.timing(fadeOverlayAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
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

        // Set analytics user
        await setAnalyticsUser(user.id, {
          email: user.email,
          dj_name: profile.dj_name || profile.djName,
          city: profile.city,
        });
        await track(AnalyticsEvents.USER_LOGGED_IN, {
          method: "oauth",
        });

        // For login flow, always go to opportunities page
        console.log("🎯 Login successful - navigating to opportunities");
        setCurrentScreen("opportunities");
        await trackScreenView("opportunities");

        // Check if profile picture is missing and show complete profile modal
        if (!profile.profile_image_url && !hasShownCompleteProfileModal) {
          setTimeout(() => {
            setShowCompleteProfileModal(true);
            setHasShownCompleteProfileModal(true);
          }, 1000);
        }

        // Fetch user location and check for mismatch
        fetchUserLocation(profile);
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
      
      // Only show onboarding if the profile truly doesn't exist
      // Error code PGRST116 means "no rows returned" (profile doesn't exist)
      // Other errors (like column doesn't exist) should not trigger onboarding
      if (error.code === "PGRST116" || error.message?.includes("No rows returned")) {
        console.log("⚠️ No profile found - user needs onboarding");
        setIsFirstTime(true);
      } else {
        // For other errors (like database schema issues), try to continue with existing user
        // Don't force onboarding - this might be a temporary database issue
        console.error("⚠️ Database error fetching profile - this may be a schema issue");
        console.error("⚠️ User is authenticated but profile fetch failed - showing error state");
        // Set isFirstTime to false to avoid showing onboarding for existing users
        // The app will show a loading/error state instead
        setIsFirstTime(false);
        Alert.alert(
          "Error Loading Profile",
          "There was an issue loading your profile. Please try again or contact support.",
          [{ text: "OK" }]
        );
      }
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
      await track(AnalyticsEvents.USER_LOGGED_OUT);
      await resetAnalyticsUser();
      await auth.signOut();
      clearScreenCachesForUser(user?.id);
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

  const handleProfileSaved = async (updatedProfile) => {
    setShowEditProfile(false);

    // Track profile update
    await track(AnalyticsEvents.PROFILE_UPDATED, {
      has_profile_image: !!updatedProfile.profile_image_url,
      has_city: !!updatedProfile.city,
      genres_count: updatedProfile.genres?.length || 0,
    });

    // Refresh profile from database to get latest data including profile_image_url
    try {
      if (user?.id) {
        const refreshedProfile = await db.getUserProfile(user.id);
        if (refreshedProfile) {
          setDjProfile(refreshedProfile);

          // Update analytics user properties
          await setAnalyticsUser(user.id, {
            email: user.email,
            dj_name: refreshedProfile.dj_name,
            city: refreshedProfile.city,
          });

          // If profile picture was added, close the complete profile modal
          if (refreshedProfile.profile_image_url) {
            setShowCompleteProfileModal(false);
          }
        }
      }
    } catch (error) {
      console.error("Error refreshing profile:", error);
      // Fallback to using updatedProfile if refresh fails
      setDjProfile({
        djName: updatedProfile.dj_name,
        firstName: updatedProfile.first_name || "",
        lastName: updatedProfile.last_name || "",
        instagram: updatedProfile.instagram || "",
        soundcloud: updatedProfile.soundcloud || "",
        city: updatedProfile.city,
        genres: updatedProfile.genres,
      });

      // If profile picture was added, close the complete profile modal
      if (updatedProfile.profile_image_url) {
        setShowCompleteProfileModal(false);
      }
    }
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

  // Fetch user location and check for mismatch with profile city
  // Made non-blocking to prevent app freeze on first load in new countries
  const fetchUserLocation = async (profile) => {
    try {
      // Don't await - let it run in background to prevent blocking app initialization
      // This is especially important in new countries where GPS might take longer
      getCurrentLocation()
        .then((location) => {
          if (location) {
                setUserLocation(location);

            // Check if location matches profile city
            if (profile?.city) {
              checkLocationMatch(
                profile.city,
                location.latitude,
                location.longitude
              )
                .then((matchResult) => {
                  if (!matchResult.matches && matchResult.currentCity) {
                    setLocationMismatchWarning(true);

                    // Track location mismatch
                    track(AnalyticsEvents.LOCATION_MISMATCH, {
                      profile_city: profile.city,
                      current_city: matchResult.currentCity,
                    });

                    // Show warning modal after a short delay
                    setTimeout(() => {
                      showCustomModal({
                        type: "warning",
                        title: "Location Mismatch",
                        message: `Your current location (${matchResult.currentCity}) doesn't match your profile city (${profile.city}). Update your profile to show accurate opportunities.`,
                        primaryButtonText: "Update Profile",
                        secondaryButtonText: "Dismiss",
                        onPrimaryPress: () => {
                          setShowModal(false);
                          setShowEditProfile(true);
                        },
                        onSecondaryPress: () => {
                          setShowModal(false);
                          setLocationMismatchWarning(false);
                        },
                      });
                    }, 2000);
                  }

                  // Track location fetched
                  track(AnalyticsEvents.LOCATION_FETCHED, {
                    latitude: location.latitude,
                    longitude: location.longitude,
                    accuracy: location.accuracy,
                  });
                })
                .catch((matchError) => {
                  console.error("Error checking location match:", matchError);
                });
            }
          }
        })
        .catch((error) => {
          // Silently handle location errors - don't block app initialization
          console.warn("⚠️ Location fetch failed (non-blocking):", error.message);
          // Location is optional, app can continue without it
        });
    } catch (error) {
      // Silently handle location errors - don't block app initialization
      console.warn("⚠️ Location fetch error (non-blocking):", error.message);
    }
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
    // Prevent duplicate calls
    if (isPlayingAudioRef.current) {
      console.log("⚠️ playGlobalAudio already in progress, ignoring duplicate call");
      return;
    }

    // Show mini bar + full-screen immediately (synchronous state so UI paints before any async work)
    const trackForUI = {
      ...track,
      image: track.image || track.artwork_url || track.image_url || null,
      isLiked: likedMixIds.has(track.id),
    };
    setPendingPlayTrack(trackForUI);

    try {
      isPlayingAudioRef.current = true;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      console.log("🎵 playGlobalAudio called with track:", {
        id: track.id,
        title: track.title,
        artist: track.artist,
        image: track.image,
        audioUrl: track.audioUrl ? "URL provided" : "No URL",
        user_id: track.user_id,
        user_image: track.user_image,
        user_dj_name: track.user_dj_name,
        user_bio: track.user_bio,
        user: track.user ? "User object present" : "No user object",
      });

      // Context state so playback logic and lock screen see current track
      setGlobalAudioState((prev) => ({
        ...prev,
        isLoading: true,
        currentTrack: trackForUI,
      }));
      trackFinishedRef.current = false;

      InteractionManager.runAfterInteractions(() => {
        runPlayback();
      });

      async function runPlayback() {
        try {
          // Validate audio URL
          const audioUrl =
        (typeof track.audioUrl === "string" && track.audioUrl.trim()
          ? track.audioUrl.trim()
          : null) ||
        track.audioUrl?.uri ||
        (typeof track.file_url === "string" && track.file_url.trim()
          ? track.file_url.trim()
          : null) ||
        track.audio_url ||
        null;

        if (!audioUrl) {
        console.error("❌ No audio URL found in track:", {
          id: track.id,
          title: track.title,
          audioUrl: track.audioUrl,
          file_url: track.file_url,
          audio_url: track.audio_url,
        });
        throw new Error("Audio URL is missing. Please check that the mix has a valid audio file.");
        }

      // Validate URL format
      if (!audioUrl.startsWith("http://") && !audioUrl.startsWith("https://") && !audioUrl.startsWith("file://")) {
        console.error("❌ Invalid audio URL format:", audioUrl);
        throw new Error("Invalid audio URL format. The audio file URL must be a valid HTTP/HTTPS or file URL.");
      }

      // Use expo-av for all platforms (TrackPlayer removed for reliable duration, position, seeking)

      // Stop current audio if playing
      clearProgressPoll();
      if (globalAudioRef.current) {
        await globalAudioRef.current.unloadAsync();
        globalAudioRef.current = null;
      }

      // Configure audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Create and load new sound using expo-av
      let sound;

      // Use the already-validated audioUrl
      // Determine audio source
      const audioSource =
        typeof audioUrl === "string"
          ? { uri: audioUrl }
          : track.audioUrl;

      // Load audio with streaming support for large files
      try {
        const { sound: loadedSound } = await Audio.Sound.createAsync(
          audioSource,
          {
            shouldPlay: false,
            isLooping: false,
            volume: 1.0,
            progressUpdateIntervalMillis: 250,
          }
        );
        sound = loadedSound;
      } catch (loadError) {
        if (__DEV__) {
          console.warn("Audio load failed:", loadError?.message || loadError?.code || "Unknown");
        }
        setGlobalAudioState((prev) => ({
          ...prev,
          isLoading: false,
          isPlaying: false,
          currentTrack: null,
          error: getAudioErrorMessage(loadError),
        }));
        const userFriendlyMessage = getAudioErrorMessage(loadError);
        setAudioErrorModal({
          visible: true,
          title: "Unable to Play Audio",
          message: userFriendlyMessage,
        });
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
          // Unload the sound to free resources
          await sound.unloadAsync();
          throw new Error("Sound failed to load properly");
        }

        if (status.durationMillis === 0) {
          console.warn("⚠️ Audio file has 0 duration - may be corrupted");
          // Unload the sound and show error
          await sound.unloadAsync();
          const error = new Error("Audio file has invalid duration");
          setGlobalAudioState((prev) => ({
            ...prev,
            isLoading: false,
            isPlaying: false,
            currentTrack: null,
            error: getAudioErrorMessage(error),
          }));
          setAudioErrorModal({
            visible: true,
            title: "Unable to Play Audio",
            message: getAudioErrorMessage(error)
          });
          return;
        }
      } catch (statusError) {
        console.error("❌ Error getting sound status:", statusError);
        // Clean up sound if it exists
        if (sound) {
          try {
            await sound.unloadAsync();
          } catch (unloadError) {
            console.error("❌ Error unloading sound:", unloadError);
          }
        }
        // Show user-friendly error
        setGlobalAudioState((prev) => ({
          ...prev,
          isLoading: false,
          isPlaying: false,
          currentTrack: null,
          error: getAudioErrorMessage(statusError),
        }));
        setAudioErrorModal({
          visible: true,
          title: "Unable to Play Audio",
          message: getAudioErrorMessage(statusError)
        });
        return;
      }

      // Set up status update listener
      let durationUpdated = false; // Track if we've updated duration in DB
      sound.setOnPlaybackStatusUpdate((status) => {
        try {
          if (status.isLoaded) {
            // Always push position/duration to state first so UI never stalls (expo-av callbacks can be unreliable)
            if (status.durationMillis > 0 && !isScrubbingRef.current) {
              setGlobalAudioState((prev) => ({
                ...prev,
                isPlaying: status.isPlaying,
                isLoading: false,
                progress: (status.positionMillis || 0) / status.durationMillis,
                positionMillis: status.positionMillis || 0,
                durationMillis: status.durationMillis || 0,
              }));
            }
            if (Platform.OS === "android") {
              lockScreenControls.updatePlaybackState(
                status.isPlaying,
                status.positionMillis || 0,
                status.durationMillis || 0
              );
            }

            // Check if track has finished playing
            const hasFinished =
              status.didJustFinish ||
              (status.positionMillis >= status.durationMillis - 50 &&
                status.durationMillis > 0 &&
                !isScrubbingRef.current &&
                !status.isPlaying);

            if (hasFinished && !trackFinishedRef.current) {
              trackFinishedRef.current = true;
              console.log("🎵 Track finished, checking for next track in queue");
              setGlobalAudioState((prev) => {
                setTimeout(async () => { await playNextTrack(); }, 100);
                return {
                  ...prev,
                  isPlaying: false,
                  isLoading: false,
                  progress: 1,
                  positionMillis: status.durationMillis || 0,
                  durationMillis: status.durationMillis || 0,
                };
              });
              return;
            }

            // Update duration in DB once (async, don't block)
            if (!durationUpdated && status.durationMillis > 0 && track.id) {
              durationUpdated = true;
              const durationInSeconds = Math.floor(status.durationMillis / 1000);
              supabase
                .from("mixes")
                .update({ duration: durationInSeconds })
                .eq("id", track.id)
                .is("duration", null)
                .then(({ error }) => {
                  if (error) console.error("❌ Error updating duration:", error);
                })
                .catch(() => {});
            }
          } else if (status.error) {
            setGlobalAudioState((prev) => ({ ...prev, isLoading: false }));
          }
        } catch (err) {
          if (__DEV__) console.warn("Playback status callback error:", err?.message);
        }
      });

      // Store reference for cleanup
      globalAudioRef.current = sound;

      // Progress poll: primary sync for UI (expo-av status callback can be unreliable, especially on Android)
      clearProgressPoll();
      const runProgressPoll = async () => {
        if (!globalAudioRef.current || isScrubbingRef.current) return;
        try {
          const s = await globalAudioRef.current.getStatusAsync();
          if (s?.isLoaded && s?.durationMillis > 0) {
            setGlobalAudioState((prev) => ({
              ...prev,
              positionMillis: s.positionMillis ?? 0,
              durationMillis: s.durationMillis ?? 0,
              progress: (s.positionMillis ?? 0) / s.durationMillis,
            }));
          }
        } catch (_) {}
      };
      runProgressPoll(); // immediate first update
      progressPollIntervalRef.current = setInterval(runProgressPoll, 500);

      // Start playing
      console.log("▶️ Starting playback...");
      try {
        await sound.playAsync();
        console.log("✅ Playback started successfully");
        try {
          await sound.setProgressUpdateIntervalAsync(500);
        } catch (_) {}
      } catch (playError) {
        console.error("❌ Playback failed:", playError);
        console.error("❌ Playback error details:", {
          message: playError.message,
          code: playError.code,
          name: playError.name,
        });
        throw playError; // Re-throw to be caught by outer catch
      }

      let initialStatus = null;
      try {
        initialStatus = await sound.getStatusAsync();
      } catch (statusErr) {
        if (__DEV__) console.warn("Initial playback status for UI:", statusErr?.message);
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

        // Transform track to ensure user data is available
        let userImage = track.user_image || track.user?.profile_image_url;
        let userDjName = track.user_dj_name || track.user?.dj_name;
        let userBio = track.user_bio || track.user?.bio;
        const userId = track.user_id || track.user?.id;

        // Check if mix is liked in database (to sync with ListenScreen likes)
        let isLiked = likedMixIds.has(track.id);
        if (user?.id && track.id) {
          // If not in likedMixIds, check database to ensure state is accurate
          if (!isLiked) {
            supabase
              .from("mix_likes")
              .select("mix_id")
              .eq("user_id", user.id)
              .eq("mix_id", track.id)
              .single()
              .then(({ data: likeData }) => {
                if (likeData) {
                  // Mix is liked, update likedMixIds
                  setLikedMixIds((prev) => {
                    const updated = new Set(prev);
                    updated.add(track.id);
                    return updated;
                  });
                  // Update currentTrack isLiked state
                  setGlobalAudioState((prev) => {
                    if (prev.currentTrack?.id === track.id) {
                      return {
                        ...prev,
                        currentTrack: {
                          ...prev.currentTrack,
                          isLiked: true,
                        },
                      };
                    }
                    return prev;
                  });
                }
              })
              .catch(() => {
                // Mix is not liked, which is fine
              });
          }
        }

        // If user_image is missing but we have user_id, fetch from database (async, don't block)
        if (!userImage && userId) {
          // Fetch in background and update state when ready
          supabase
            .from("user_profiles")
            .select("profile_image_url, dj_name, bio")
            .eq("id", userId)
            .single()
            .then(({ data: userProfile }) => {
              if (userProfile) {
                setGlobalAudioState((prev) => {
                  if (prev.currentTrack?.id === track.id) {
                    return {
                      ...prev,
                      currentTrack: {
                        ...prev.currentTrack,
                        user_image: userProfile.profile_image_url || prev.currentTrack.user_image,
                        user_dj_name: userProfile.dj_name || prev.currentTrack.user_dj_name,
                        user_bio: userProfile.bio || prev.currentTrack.user_bio,
                      },
                    };
                  }
                  return prev;
                });
                console.log("✅ Fetched user profile data for DJ image (Android):", {
                  hasImage: !!userProfile.profile_image_url,
                  djName: userProfile.dj_name,
                });
              }
            })
            .catch((fetchError) => {
              console.warn("⚠️ Could not fetch user profile for DJ image (Android):", fetchError);
            });
        }

        const enhancedTrack = {
          ...track,
          user_id: userId,
          user_image: userImage,
          user_dj_name: userDjName,
          user_bio: userBio,
          isLiked: isLiked, // Sync with likedMixIds
        };

        const next = {
          ...prev,
          sound: sound,
          isPlaying: true,
          currentTrack: enhancedTrack,
          isLoading: false,
          queue: newQueue,
          currentQueueIndex: newIndex,
        };
        if (initialStatus?.isLoaded && initialStatus?.durationMillis > 0) {
          next.positionMillis = initialStatus.positionMillis ?? 0;
          next.durationMillis = initialStatus.durationMillis ?? 0;
          next.progress =
            (initialStatus.positionMillis ?? 0) / initialStatus.durationMillis;
        } else {
          // Use track metadata so UI shows duration immediately (no "Preparing" stuck)
          const trackDur = track.durationMillis ?? (track.durationSeconds != null ? track.durationSeconds * 1000 : 0);
          if (trackDur > 0) {
            next.positionMillis = 0;
            next.durationMillis = trackDur;
            next.progress = 0;
          }
        }
        return next;
      });

      // Set up lock screen controls callbacks (Android only)
      if (Platform.OS === "android") {
        // Ensure lock screen controls are initialized
        await lockScreenControls.initialize();
        lockScreenControls.setCallbacks({
          onPlayPause: async () => {
            try {
              if (globalAudioRef.current) {
                const status = await globalAudioRef.current.getStatusAsync();
                if (status.isLoaded && status.isPlaying) {
                  await pauseGlobalAudio();
                } else {
                  await resumeGlobalAudio();
                }
              } else if (stateRef.current.isPlaying) {
                await pauseGlobalAudio();
              } else {
                await resumeGlobalAudio();
              }
            } catch (error) {
              console.error("❌ Lock screen play/pause error:", error);
            }
          },
          onNext: async () => {
            try {
              await playNextTrack();
            } catch (error) {
              console.error("❌ Lock screen next error:", error);
            }
          },
          onPrevious: async () => {
            try {
              await playPreviousTrack();
            } catch (error) {
              console.error("❌ Lock screen previous error:", error);
            }
          },
        });

        // Show lock screen notification
        const initialStatus = await sound.getStatusAsync();
        await lockScreenControls.showNotification({
          id: track.id,
          title: track.title || "R/HOOD Mix",
          artist: track.artist || "Unknown Artist",
          image: track.image || null,
          durationMillis: initialStatus.durationMillis || 0,
        });
      }

      console.log("🎉 Global audio started successfully:", track.title);
        } catch (error) {
          console.error("❌ Error playing global audio:", error);
          console.error("❌ Error details:", {
            message: error.message,
            code: error.code,
            name: error.name,
            trackId: track.id,
            trackTitle: track.title,
            audioUrl: track.audioUrl || track.file_url || track.audio_url || "missing",
          });
          setPendingPlayTrack(null);
          setGlobalAudioState((prev) => ({ ...prev, isLoading: false }));

          const errorMessage = error.message || "Unknown error occurred";
          const userFriendlyMessage = errorMessage.includes("Audio URL is missing")
            ? "This mix doesn't have an audio file. Please contact the artist or try another mix."
            : errorMessage.includes("Invalid audio URL")
            ? "The audio file URL is invalid. Please try again or contact support."
            : errorMessage.includes("Failed to start playback")
            ? errorMessage
            : `Failed to play "${track.title || "this mix"}". ${errorMessage}`;
          Alert.alert("Audio Error", userFriendlyMessage);
        } finally {
          isPlayingAudioRef.current = false;
        }
      }
    } catch (syncError) {
      isPlayingAudioRef.current = false;
      throw syncError;
    }
  };

  const pauseGlobalAudio = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Store in ref for background service access
      pauseGlobalAudioRef.current = pauseGlobalAudio;

      // Use expo-av for all platforms
      if (globalAudioRef.current) {
        await globalAudioRef.current.pauseAsync();
        setGlobalAudioState((prev) => ({ ...prev, isPlaying: false }));
        // Update lock screen notification
        if (Platform.OS === "android") {
          lockScreenControls.updatePlaybackState(
            false,
            stateRef.current.positionMillis || 0,
            stateRef.current.durationMillis || 0
          );
        }
      }
    } catch (error) {
      console.log("❌ Error pausing audio:", error);
    }
  };

  const seekGlobalAudio = async (seekAmount) => {
    try {
      // Store in ref for background service access
      seekGlobalAudioRef.current = seekGlobalAudio;
      
      // Use expo-av for all platforms
      if (globalAudioRef.current && stateRef.current.durationMillis) {
        const currentPosition = stateRef.current.positionMillis || 0;
        const newPosition = Math.max(
          0,
          Math.min(
            stateRef.current.durationMillis,
            currentPosition + seekAmount
          )
        );

        await globalAudioRef.current.setPositionAsync(newPosition);
        setGlobalAudioState((prev) => ({
          ...prev,
          positionMillis: newPosition,
        }));
        // Update lock screen notification
        if (Platform.OS === "android") {
          lockScreenControls.updatePlaybackState(
            stateRef.current.isPlaying,
            newPosition,
            stateRef.current.durationMillis
          );
        }

        console.log(
          `⏩ Seeked ${seekAmount > 0 ? "forward" : "backward"} to ${Math.floor(
            newPosition / 1000
          )}s`
        );
      } else if (!stateRef.current.durationMillis) {
        console.warn("⚠️ Cannot seek - no duration available");
      }
    } catch (error) {
      console.log("❌ Error seeking audio:", error);
    }
  };

  const resumeGlobalAudio = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Store in ref for background service access
      resumeGlobalAudioRef.current = resumeGlobalAudio;

      // Use expo-av for all platforms
      if (globalAudioRef.current) {
        await globalAudioRef.current.playAsync();
        setGlobalAudioState((prev) => ({ ...prev, isPlaying: true }));
        // Update lock screen notification
        if (Platform.OS === "android") {
          lockScreenControls.updatePlaybackState(
            true,
            stateRef.current.positionMillis || 0,
            stateRef.current.durationMillis || 0
          );
        }
      }
    } catch (error) {
      console.log("❌ Error resuming audio:", error);
    }
  };

  const stopGlobalAudio = async () => {
    try {
      clearProgressPoll();
      if (globalAudioRef.current) {
        await globalAudioRef.current.unloadAsync();
        globalAudioRef.current = null;
        // Hide lock screen notification
        await lockScreenControls.hideNotification();
      }
    } catch (error) {
      console.log("❌ Error stopping audio:", error);
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
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (hapticError) {
        // Ignore haptic errors (may not work in background service)
      }
      await playNextTrack();
      console.log(`⏩ Skipped to next track`);
    } catch (error) {
      console.error("❌ Error skipping forward:", error);
      // Don't show Alert in background service context - just log
    }
  };

  // Skip backward functionality - now navigates to previous track
  const skipBackward = async () => {
    try {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (hapticError) {
        // Ignore haptic errors (may not work in background service)
      }
      await playPreviousTrack();
      console.log(`⏪ Skipped to previous track`);
    } catch (error) {
      console.error("❌ Error skipping backward:", error);
      // Don't show Alert in background service context - just log
    }
  };

  // Fetch user's liked mixes
  const fetchUserLikedMixes = async () => {
    if (!user?.id) {
      setLikedMixIds(new Set());
      return;
    }

    try {
      const { data, error } = await supabase
        .from("mix_likes")
        .select("mix_id")
        .eq("user_id", user.id);

      if (error) {
        if (error.code === "42P01" || error.code === "PGRST205") {
          console.warn("mix_likes table not found. Skipping liked mixes fetch.");
          return;
        }
        console.error("❌ Error fetching liked mixes:", error);
        return;
      }

      const likedSet = new Set(
        (data || [])
          .map((row) => row?.mix_id)
          .filter((mixId) => mixId !== null && mixId !== undefined)
      );

      setLikedMixIds(likedSet);
    } catch (error) {
      console.error("❌ Unexpected error fetching liked mixes:", error);
    }
  };

  // Like/Unlike functionality
  const toggleLike = async () => {
    if (!stateRef.current.currentTrack || !user) {
      Alert.alert(
        "Sign In Required",
        "You need to be signed in to like a mix.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const mixId = stateRef.current.currentTrack.id;
      const isCurrentlyLiked = likedMixIds.has(mixId);

      // Optimistically update UI
      setLikedMixIds((prev) => {
        const updated = new Set(prev);
        if (isCurrentlyLiked) {
          updated.delete(mixId);
        } else {
          updated.add(mixId);
        }
        return updated;
      });

      setGlobalAudioState((prev) => ({
        ...prev,
        currentTrack: {
          ...prev.currentTrack,
          isLiked: !isCurrentlyLiked,
        },
      }));

      // Update database
      if (isCurrentlyLiked) {
        // Unlike - remove from mix_likes
        const { error } = await supabase
          .from("mix_likes")
          .delete()
          .eq("mix_id", mixId)
          .eq("user_id", user.id);

        if (error) {
          if (error.code === "42P01" || error.code === "PGRST205") {
            Alert.alert(
              "Feature Unavailable",
              "Mix likes are not available right now. Please try again later."
            );
            // Revert optimistic update
            setLikedMixIds((prev) => {
              const updated = new Set(prev);
              updated.add(mixId);
              return updated;
            });
            return;
          }
          throw error;
        }

        // Award credits to mix creator (deduct)
        if (stateRef.current.currentTrack.user_id && stateRef.current.currentTrack.user_id !== user.id) {
          try {
            await db.incrementUserCredits(stateRef.current.currentTrack.user_id, -10);
          } catch (creditError) {
            console.error("❌ Error rolling back credits:", creditError);
          }
        }

        console.log("👎 Unliked mix");
      } else {
        // Like - add to mix_likes
        const { error } = await supabase
          .from("mix_likes")
          .insert([{ mix_id: mixId, user_id: user.id }]);

        if (error) {
          if (error.code === "23505") {
            // Already liked, sync state
            console.warn("Mix already liked. Syncing local state.");
          } else if (error.code === "42P01" || error.code === "PGRST205") {
            Alert.alert(
              "Feature Unavailable",
              "Mix likes are not available right now. Please try again later."
            );
            // Revert optimistic update
            setLikedMixIds((prev) => {
              const updated = new Set(prev);
              updated.delete(mixId);
              return updated;
            });
            return;
          } else {
            throw error;
          }
        } else {
          // Award credits to mix creator
          if (stateRef.current.currentTrack.user_id && stateRef.current.currentTrack.user_id !== user.id) {
              try {
                await db.incrementUserCredits(stateRef.current.currentTrack.user_id, 10);
            } catch (creditError) {
              console.error("❌ Error awarding credits:", creditError);
            }
          }
        }

        console.log("❤️ Liked mix");
      }
    } catch (error) {
      console.error("❌ Error toggling like:", error);
      Alert.alert(
        "Error",
        "We couldn't like this mix right now. Please try again."
      );
      // Revert optimistic update
      const mixId = stateRef.current.currentTrack.id;
      const wasLiked = likedMixIds.has(mixId);
      setLikedMixIds((prev) => {
        const updated = new Set(prev);
        if (wasLiked) {
          updated.add(mixId);
        } else {
          updated.delete(mixId);
        }
        return updated;
      });
      setGlobalAudioState((prev) => ({
        ...prev,
        currentTrack: {
          ...prev.currentTrack,
          isLiked: wasLiked,
        },
      }));
    }
  };

  // Seek to position in track
  const seekToPosition = async (positionMillis) => {
    // Validate position before attempting to seek
    if (positionMillis < 0) {
      console.error(
        `❌ Invalid seek position: ${positionMillis}ms (cannot be negative)`
      );
      return;
    }

    // Use expo-av for all platforms
    if (!globalAudioRef.current) {
      console.error("❌ No audio reference available for seeking");
      return;
    }

    try {
      isScrubbingRef.current = true;
      console.log(`🎯 Attempting to seek to ${positionMillis}ms`);

      // Ensure the audio is loaded before seeking
      const status = await globalAudioRef.current.getStatusAsync();
      console.log(`📊 Audio status before seek:`, status);

      if (status.isLoaded && status.durationMillis > 0) {
        // Ensure position doesn't exceed duration and leave buffer to prevent finished trigger
        const maxSeekPosition = Math.max(0, status.durationMillis - 100); // Leave 100ms buffer
        const clampedPosition = Math.min(Math.max(0, positionMillis), maxSeekPosition);

        // Skip only if we're within 50ms (was 100ms) so user scrubs aren't ignored
        const currentPosition = status.positionMillis || 0;
        const positionDiff = Math.abs(clampedPosition - currentPosition);
        if (positionDiff < 50) {
          isScrubbingRef.current = false;
          return;
        }

        // Don't seek if audio is in a critical state (loading, buffering, etc.)
        if (status.isBuffering || status.isLoading) {
          console.log(`⏭️ Skipping seek - audio is buffering/loading`);
          isScrubbingRef.current = false;
          return;
        }

        await globalAudioRef.current.setPositionAsync(clampedPosition);
        console.log(`✅ Successfully seeked to ${clampedPosition}ms`);

        // Update the global state to reflect the new position
        setGlobalAudioState((prev) => ({
          ...prev,
          positionMillis: clampedPosition,
          progress: status.durationMillis ? clampedPosition / status.durationMillis : 0,
        }));
      } else {
        console.error(
          `❌ Audio not ready for seeking - isLoaded: ${status.isLoaded}, duration: ${status.durationMillis}`
        );
      }
    } catch (error) {
      // Handle specific "seeking interrupted" errors more gracefully
      if (error.message && error.message.includes("interrupted")) {
        console.warn(
          "⚠️ Seek was interrupted - this is normal during rapid scrubbing"
        );
      } else {
        console.error("❌ Error seeking:", error);
      }
    } finally {
      isScrubbingRef.current = false;
    }
  };

  // Refs for progress bar dimensions
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
      isShuffled: false,
    }));
    console.log("🗑️ Queue cleared");
  };

  // Move queue item up (decrease index)
  const moveQueueItemUp = useCallback((index) => {
    if (index > 0) {
      setGlobalAudioState((prev) => {
        // Reorder logic inline to avoid nested setState
        const newQueue = [...prev.queue];
        const [movedItem] = newQueue.splice(index, 1);
        newQueue.splice(index - 1, 0, movedItem);
        
        // Update currentQueueIndex if it's affected by the reorder
        let newCurrentIndex = prev.currentQueueIndex;
        if (prev.currentQueueIndex === index) {
          newCurrentIndex = index - 1;
        } else if (prev.currentQueueIndex === index - 1) {
          newCurrentIndex = index;
        }
        
        HapticPatterns.buttonPress();
        console.log(`🔄 Moved queue item from position ${index + 1} to ${index}`);
        
        return {
          ...prev,
          queue: newQueue,
          currentQueueIndex: newCurrentIndex,
        };
      });
    }
  }, []);

  // Move queue item down (increase index)
  const moveQueueItemDown = useCallback((index) => {
    setGlobalAudioState((prev) => {
      if (index < prev.queue.length - 1) {
        // Reorder logic inline to avoid nested setState
        const newQueue = [...prev.queue];
        const [movedItem] = newQueue.splice(index, 1);
        newQueue.splice(index + 1, 0, movedItem);
        
        // Update currentQueueIndex if it's affected by the reorder
        let newCurrentIndex = prev.currentQueueIndex;
        if (prev.currentQueueIndex === index) {
          newCurrentIndex = index + 1;
        } else if (prev.currentQueueIndex === index + 1) {
          newCurrentIndex = index;
        }
        
        HapticPatterns.buttonPress();
        console.log(`🔄 Moved queue item from position ${index + 1} to ${index + 2}`);
        
        return {
          ...prev,
          queue: newQueue,
          currentQueueIndex: newCurrentIndex,
        };
      }
      return prev;
    });
  }, []);

  // Shuffle functions
  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Shuffle ALL mixes
  const shuffleAllMixes = async (allMixes) => {
    if (!allMixes || allMixes.length === 0) {
      console.warn("No mixes available to shuffle");
      return;
    }

    const shuffled = shuffleArray(allMixes);
    const currentTrack = stateRef.current.currentTrack;
    
    // If a track is currently playing, keep it first and shuffle the rest
    let queue = shuffled;
    if (currentTrack) {
      const currentIndex = shuffled.findIndex(t => t.id === currentTrack.id);
      if (currentIndex > 0) {
        queue = [currentTrack, ...shuffled.filter(t => t.id !== currentTrack.id)];
      } else if (currentIndex === -1) {
        queue = [currentTrack, ...shuffled];
      }
    }

    setGlobalAudioState((prev) => ({
      ...prev,
      queue: queue,
      currentQueueIndex: currentTrack ? 0 : -1,
      isShuffled: true,
    }));

    console.log(`🔀 Shuffled ${queue.length} mixes`);
  };

  // Shuffle BY GENRE
  const shuffleByGenre = async (allMixes, genre) => {
    if (!allMixes || allMixes.length === 0) {
      console.warn("No mixes available to shuffle");
      return;
    }

    const genreMixes = allMixes.filter(mix => mix.genre === genre);
    if (genreMixes.length === 0) {
      console.warn(`No mixes found for genre: ${genre}`);
      return;
    }

    const shuffled = shuffleArray(genreMixes);
    const currentTrack = stateRef.current.currentTrack;
    
    let queue = shuffled;
    if (currentTrack && currentTrack.genre === genre) {
      const currentIndex = shuffled.findIndex(t => t.id === currentTrack.id);
      if (currentIndex > 0) {
        queue = [currentTrack, ...shuffled.filter(t => t.id !== currentTrack.id)];
      } else if (currentIndex === -1) {
        queue = [currentTrack, ...shuffled];
      }
    }

    setGlobalAudioState((prev) => ({
      ...prev,
      queue: queue,
      currentQueueIndex: currentTrack && currentTrack.genre === genre ? 0 : -1,
      isShuffled: true,
    }));

    console.log(`🔀 Shuffled ${queue.length} ${genre} mixes`);
  };

  // Shuffle "Based on what you like" - uses ML recommendation system
  const shuffleBasedOnLikes = async (allMixes, userLikedMixIds = []) => {
    if (!allMixes || allMixes.length === 0) {
      console.warn("No mixes available to shuffle");
      return;
    }

    if (!user?.id) {
      // Fallback to simple shuffle if no user
      return shuffleAllMixes(allMixes);
    }

    try {
      // Use recommendation system to get weighted recommendations
      const { getRecommendedMixes } = require("./lib/mixRecommendations");
      const recommended = await getRecommendedMixes(user.id, 50, true); // Get more for shuffle pool
      
      if (recommended && recommended.length > 0) {
        // Map recommended mix IDs to full mix objects
        const recommendedMixIds = new Set(recommended.map(m => m.id));
        const recommendedMixes = allMixes.filter(mix => recommendedMixIds.has(mix.id));
        
        // Sort by recommendation score (weighted random sampling)
        const weightedMixes = recommendedMixes.map(mix => {
          const rec = recommended.find(r => r.id === mix.id);
          return {
            ...mix,
            recommendationWeight: rec?.recommendationScore || rec?.recommendation_weight || 0.5,
          };
        });

        // Weighted random shuffle (higher weight = more likely to appear early)
        const shuffled = weightedShuffle(weightedMixes);
        const currentTrack = stateRef.current.currentTrack;
        
        let queue = shuffled;
        if (currentTrack) {
          const currentIndex = shuffled.findIndex(t => t.id === currentTrack.id);
          if (currentIndex > 0) {
            queue = [currentTrack, ...shuffled.filter(t => t.id !== currentTrack.id)];
          } else if (currentIndex === -1) {
            queue = [currentTrack, ...shuffled];
          }
        }

        setGlobalAudioState((prev) => ({
          ...prev,
          queue: queue,
          currentQueueIndex: currentTrack ? 0 : -1,
          isShuffled: true,
        }));

        console.log(`🔀 Shuffled ${queue.length} mixes based on ML recommendations`);
        return;
      }
    } catch (error) {
      console.error("Error using recommendation system for shuffle:", error);
    }

    // Fallback to simple genre-based shuffle
    const likedMixes = allMixes.filter(mix => userLikedMixIds.includes(mix.id));
    const likedGenres = new Set(likedMixes.map(mix => mix.genre).filter(Boolean));
    const similarMixes = allMixes.filter(mix => 
      likedGenres.has(mix.genre) || likedMixes.some(liked => 
        liked.genre === mix.genre || 
        (liked.user_id === mix.user_id && liked.id !== mix.id)
      )
    );

    const combined = [...new Map([
      ...likedMixes.map(m => [m.id, m]),
      ...similarMixes.map(m => [m.id, m])
    ]).values()];

    if (combined.length === 0) {
      return shuffleAllMixes(allMixes);
    }

    const shuffled = shuffleArray(combined);
    const currentTrack = stateRef.current.currentTrack;
    
    let queue = shuffled;
    if (currentTrack) {
      const currentIndex = shuffled.findIndex(t => t.id === currentTrack.id);
      if (currentIndex > 0) {
        queue = [currentTrack, ...shuffled.filter(t => t.id !== currentTrack.id)];
      } else if (currentIndex === -1) {
        queue = [currentTrack, ...shuffled];
      }
    }

    setGlobalAudioState((prev) => ({
      ...prev,
      queue: queue,
      currentQueueIndex: currentTrack ? 0 : -1,
      isShuffled: true,
    }));

    console.log(`🔀 Shuffled ${queue.length} mixes based on your likes (fallback)`);
  };

  // Weighted shuffle function for recommendation-based shuffling
  const weightedShuffle = (items) => {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      // Weighted random selection
      const weights = shuffled.slice(0, i + 1).map(item => item.recommendationWeight || 0.5);
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      let random = Math.random() * totalWeight;
      
      let selectedIndex = 0;
      for (let j = 0; j < weights.length; j++) {
        random -= weights[j];
        if (random <= 0) {
          selectedIndex = j;
          break;
        }
      }
      
      // Swap selected item to current position
      [shuffled[i], shuffled[selectedIndex]] = [shuffled[selectedIndex], shuffled[i]];
    }
    return shuffled;
  };

  // Get a random mix from database for auto-queue
  const getRandomMix = async () => {
    try {
      const { supabase } = await import("./lib/supabase");
      const currentTrack = stateRef.current.currentTrack;
      
      // Get a random mix, excluding the current one
      let query = supabase
        .from("mixes")
        .select(`
          *,
          user_profiles!mixes_user_id_fkey (
            id,
            dj_name,
            full_name,
            profile_image_url
          )
        `)
        .eq("is_public", true)
        .limit(100); // Get a batch to choose from
      
      // Exclude current track if available
      if (currentTrack?.id) {
        query = query.neq("id", currentTrack.id);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error("Error fetching random mix:", error);
        return null;
      }
      
      if (!data || data.length === 0) {
        console.log("No mixes available for auto-queue");
        return null;
      }
      
      // Pick a random mix from the results
      const randomMix = data[Math.floor(Math.random() * data.length)];
      
      // Transform to track format
      const userProfile = randomMix.user_profiles;
      const artistName = userProfile?.dj_name || userProfile?.full_name || "Unknown Artist";
      
      return {
        id: randomMix.id,
        title: randomMix.title,
        artist: artistName,
        user_dj_name: artistName,
        genre: randomMix.genre || "Electronic",
        image: randomMix.artwork_url || randomMix.image_url || randomMix.image,
        audioUrl: randomMix.file_url,
        duration: randomMix.duration,
        durationSeconds: randomMix.duration,
        user_id: randomMix.user_id,
      };
    } catch (error) {
      console.error("Error in getRandomMix:", error);
      return null;
    }
  };

  const getNextTrack = () => {
    // Use ref to get latest state (not stale closure)
    const currentState = stateRef.current;
    const { queue, currentQueueIndex, repeatMode, isShuffled } = currentState;

    if (queue.length === 0) {
      // Queue is empty - will be handled by async auto-queue
      return null;
    }

    // Handle repeat one mode
    if (repeatMode === "one" && currentState.currentTrack) {
      return currentState.currentTrack;
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
        // Only log once to reduce spam - the actual auto-queue will log when it happens
        return null; // Will trigger auto-queue
      }
    }

    return queue[nextIndex];
  };

  const getPreviousTrack = () => {
    // Use ref to get latest state (not stale closure)
    const currentState = stateRef.current;
    const { queue, currentQueueIndex, repeatMode } = currentState;

    if (queue.length === 0) return null;

    // Handle repeat one mode
    if (repeatMode === "one" && currentState.currentTrack) {
      return currentState.currentTrack;
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
    // Use ref to get latest state, not closure
    const currentState = stateRef.current;
    const nextTrack = getNextTrack();
    
    if (nextTrack) {
      setGlobalAudioState((prev) => ({
        ...prev,
        currentQueueIndex: prev.currentQueueIndex + 1,
      }));
      await playGlobalAudio(nextTrack);
    } else {
      // Queue is empty - try to auto-queue a random mix
      console.log("🎵 Queue empty, fetching random mix for auto-queue");
      const randomMix = await getRandomMix();
      
      if (randomMix) {
        console.log("🎵 Auto-queuing random mix:", randomMix.title);
        // Add to queue and play
        setGlobalAudioState((prev) => ({
          ...prev,
          queue: [randomMix],
          currentQueueIndex: 0,
        }));
        await playGlobalAudio(randomMix);
      } else if (currentState.queue && currentState.queue.length > 0) {
        // Fallback: loop back to the start of the existing queue
        console.log("🎵 No random mix available, looping to start of queue");
        setGlobalAudioState((prev) => ({
          ...prev,
          currentQueueIndex: 0,
        }));
        await playGlobalAudio(currentState.queue[0]);
      } else {
        console.log("🎵 No mixes available for auto-queue, stopping playback");
      await stopGlobalAudio();
      }
    }
  };

  // Store in ref for background service access
  useEffect(() => {
    playNextTrackRef.current = playNextTrack;
  }, [playNextTrack]);

  const playPreviousTrack = async () => {
    // Use ref to get latest state, not closure
    const currentState = stateRef.current;
    const prevTrack = getPreviousTrack();
    if (prevTrack) {
      setGlobalAudioState((prev) => ({
        ...prev,
        currentQueueIndex: prev.currentQueueIndex - 1,
      }));
      await playGlobalAudio(prevTrack);
    } else if (currentState.currentTrack) {
      await seekGlobalAudio(-999999);
    }
  };

  // Store in ref for background service access
  useEffect(() => {
    playPreviousTrackRef.current = playPreviousTrack;
  }, [playPreviousTrack]);

  // Remote controls / lock screen: Android uses lockScreenControls callbacks; expo-av drives playback
  useEffect(() => {
    return () => {};
  }, []);

  // Expose audio actions to context so screens can use useAudioActions().current without re-subscribing to state
  useLayoutEffect(() => {
    if (actionsRef) {
      actionsRef.current = {
        playGlobalAudio,
        pauseGlobalAudio,
        resumeGlobalAudio,
        stopGlobalAudio,
        addToQueue,
        playNextTrack,
        playPreviousTrack,
        clearQueue,
        addToQueueAndPlay,
        skipForward,
        skipBackward,
        toggleLike,
        seekToPosition,
        moveQueueItemUp,
        moveQueueItemDown,
        toggleShuffle,
      };
    }
  });

  // Share functionality
  const shareTrack = async () => {
    if (stateRef.current.currentTrack) {
      try {
        const shareMessage = `Check out this track: "${stateRef.current.currentTrack.title}" by ${stateRef.current.currentTrack.artist} on Rhood!`;
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
      const stats = await db.getUserDailyApplicationStats(userId);

      if (!stats.can_apply) {
        Alert.alert(
          "Daily Limit Reached",
          `You have reached your daily limit of ${APPLICATION_LIMITS.DAILY_LIMIT} applications. You have ${stats.remaining_applications} applications remaining today. Please try again tomorrow.`,
          [{ text: "OK" }]
        );
        return;
      }

      await db.applyToOpportunity(opportunityId, userId);

      // Get updated stats after successful application
      const updatedStats = await db.getUserDailyApplicationStats(userId);

      Alert.alert(
        "Success",
        `Application submitted successfully! You have ${updatedStats.remaining_applications} applications remaining today.`,
        [{ text: "OK" }]
      );
    } catch (error) {
      // Check if it's a mix requirement error
      if (error.message.includes("upload at least one mix")) {
        showCustomModal({
          type: "warning",
          title: "Mix Required",
          message: error.message,
          primaryButtonText: "Upload Mix",
          onPrimaryPress: () => {
            setCurrentScreen("upload-mix");
            hideCustomModal();
          },
          secondaryButtonText: "Cancel",
          onSecondaryPress: hideCustomModal,
        });
      } else if (error.message.includes("Daily application limit")) {
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
          
          // Only show onboarding if the profile truly doesn't exist
          // Error code PGRST116 means "no rows returned" (profile doesn't exist)
          // Other errors (like column doesn't exist) should not trigger onboarding
          if (error.code === "PGRST116" || error.message?.includes("No rows returned")) {
            console.log("📝 No profile found - will show onboarding for profile creation");
            setIsFirstTime(true);
          } else {
            // For other errors (like database schema issues), we still need a profile
            // If we can't get the profile, we can't proceed - show onboarding as fallback
            console.error("⚠️ Database error fetching profile - this may be a schema issue");
            console.error("⚠️ User is authenticated but profile fetch failed");
            console.error("⚠️ Error code:", error.code, "Message:", error.message);
            // If it's a schema error (column doesn't exist), the fallback query should handle it
            // But if that also fails, we need to show onboarding so user can create/update their profile
            console.log("⚠️ Will show onboarding to allow profile creation/update");
            setIsFirstTime(true);
          }
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
    trackScreenView(screen, params);
    closeMenu();
  };

  const handleOpportunityPress = (opportunity) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Track opportunity viewed
    track(AnalyticsEvents.OPPORTUNITY_VIEWED, {
      opportunity_id: opportunity.id,
      opportunity_title: opportunity.title,
      opportunity_location: opportunity.location,
    });

    showCustomModal({
      type: "info",
      title: opportunity.title,
      message: opportunity.description || "",
      eventDetails: {
        date: opportunity.date,
        time: opportunity.time,
        compensation: opportunity.compensation,
        location: opportunity.location,
        description: opportunity.description,
        distanceFormatted: opportunity.distanceFormatted,
      },
      primaryButtonText: "Apply",
      secondaryButtonText: "Close",
      showShareButton: true, // Enable share button for opportunities
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

  const handleDismissSwipeTutorial = async () => {
    try {
      await AsyncStorage.setItem("hasSeenSwipeTutorial", "true");
      setShowSwipeTutorial(false);
    } catch (error) {
      console.error("Error saving swipe tutorial state:", error);
      setShowSwipeTutorial(false);
    }
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
        `You have reached your daily limit of ${
          APPLICATION_LIMITS.DAILY_LIMIT
        } applications. You have ${
          dailyApplicationStats?.remaining_applications || 0
        } applications remaining today. Please try again tomorrow.`,
        [{ text: "OK" }]
      );
      return;
    }

    // Show detailed opportunity information for confirmation
    const currentOpportunity = opportunities[currentOpportunityIndex];

    // Track swipe right
    await track(AnalyticsEvents.SWIPE_RIGHT, {
      opportunity_id: currentOpportunity?.id,
      opportunity_title: currentOpportunity?.title,
      opportunity_location: currentOpportunity?.location,
    });
    setSelectedOpportunity(currentOpportunity);

    const applicationsRemainingCount =
      dailyApplicationStats?.remaining_applications || 0;
    // Show detailed modal with opportunity info and apply button
    showCustomModal({
      type: "info",
      title: currentOpportunity.title,
      message: currentOpportunity.description || "",
      eventDetails: {
        date: currentOpportunity.date,
        time: currentOpportunity.time,
        compensation: currentOpportunity.compensation,
        location: currentOpportunity.location,
        description: currentOpportunity.description,
        distanceFormatted: currentOpportunity.distanceFormatted,
        applicationsRemainingText: `You have ${applicationsRemainingCount} applications remaining today.`,
      },
      primaryButtonText: "Apply Now",
      secondaryButtonText: "Cancel",
      showCloseButton: false,
      showShareButton: true, // Enable share button for opportunities
      shareOpportunity: currentOpportunity, // Pass opportunity for sharing
      shareUserId: user?.id || null, // Pass user ID for referral code
      onShareInApp: handleShareOpportunityInApp, // Handler for in-app sharing
      onPrimaryPress: () => handleConfirmApply(currentOpportunity),
      onSecondaryPress: () => {
        console.log(
          "Modal cancelled. Closing modal and advancing to next opportunity."
        );
        setShowModal(false);
        setSelectedOpportunity(null);

        // Advance to next opportunity since card was already swiped away
        setCurrentOpportunityIndex(currentOpportunityIndex + 1);

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
      console.log(
        "🎯 Starting application process for opportunity:",
        opportunity.title
      );
      console.log("🎯 User ID:", user.id);
      console.log("🎯 Opportunity ID:", opportunity.id);

      setShowModal(false);

      // Apply to opportunity using existing logic
      const application = await db.applyToOpportunity(opportunity.id, user.id);
      const applicationId = application?.id;

      // Track opportunity applied
      await track(AnalyticsEvents.OPPORTUNITY_APPLIED, {
        opportunity_id: opportunity.id,
        opportunity_title: opportunity.title,
        opportunity_location: opportunity.location,
        opportunity_compensation: opportunity.compensation,
        distance_km: opportunity.distance || null,
      });

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

      // Show success message with updated stats
      setTimeout(async () => {
        // Get the most up-to-date stats for the success message
        let updatedRemaining =
          dailyApplicationStats?.remaining_applications || 0;
        try {
          const freshStats = await db.getUserDailyApplicationStats(user.id);
          updatedRemaining = freshStats?.remaining_applications || 0;
        } catch (error) {
          console.error(
            "Error getting fresh stats for success message:",
            error
          );
        }

        // Get user credits to check if they can boost
        let userCredits = 0;
        try {
          const userProfile = await db.getUserProfile(user.id);
          userCredits = userProfile?.credits || 0;
        } catch (error) {
          console.error("Error getting user credits:", error);
        }

        const canBoost = userCredits >= 10 && applicationId; // Boost costs 10 credits
        const boostMessage = canBoost
          ? `\n\n💡 Boost your application to the top for 24 hours (10 credits)`
          : applicationId
          ? `\n\n💡 Boost your application to the top for 24 hours (requires 10 credits)`
          : "";

        showCustomModal({
          type: "success",
          title: "Application Sent!",
          message: `Your application for ${opportunity.title} has been sent successfully. You have ${updatedRemaining} applications remaining today.${boostMessage}`,
          primaryButtonText: canBoost ? "Boost" : "OK",
          secondaryButtonText: canBoost ? "Skip" : undefined,
          onPrimaryPress: canBoost && applicationId
            ? async () => {
                try {
                  hideCustomModal();
                  await db.boostApplication(applicationId, 24, 10);
                  // Refresh user credits
                  const updatedProfile = await db.getUserProfile(user.id);
                  showCustomModal({
                    type: "success",
                    title: "Application Boosted!",
                    message: `Your application has been boosted to the top of the list for 24 hours. You now have ${updatedProfile?.credits || 0} credits remaining.`,
                    primaryButtonText: "OK",
                  });
                } catch (boostError) {
                  console.error("Error boosting application:", boostError);
                  const errorMsg = boostError?.message || "Failed to boost application";
                  showCustomModal({
                    type: "error",
                    title: "Boost Failed",
                    message: errorMsg,
                    primaryButtonText: "OK",
                  });
                }
              }
            : undefined,
        });
      }, 300);
    } catch (error) {
      const errorMessage = error?.message || "";
      const logContext = {
        message: errorMessage,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        fullError: error,
      };

      const isDailyLimitError = errorMessage.includes(
        "Daily application limit"
      );
      const isAlreadyAppliedError = errorMessage.includes("already applied");
      const isMissingMixError = errorMessage.includes(
        "upload at least one mix"
      );

      if (isDailyLimitError || isAlreadyAppliedError || isMissingMixError) {
        console.warn("⚠️ Application handled error:", logContext);
      } else {
        console.error("🚨 Unexpected application error:", logContext);
      }

      if (isDailyLimitError) {
        showCustomModal({
          type: "warning",
          title: "Daily Limit Reached",
          message: errorMessage,
          primaryButtonText: "OK",
        });
        return;
      }

      if (isAlreadyAppliedError) {
        showCustomModal({
          type: "info",
          title: "Already Applied",
          message:
            "You've already applied for this opportunity. We'll notify you on the outcome soon.",
          primaryButtonText: "OK",
          onPrimaryPress: () => {
            setCurrentOpportunityIndex(currentOpportunityIndex + 1);
            setShowModal(false);
            setSelectedOpportunity(null);
          },
        });
        return;
      }

      if (isMissingMixError) {
        showCustomModal({
          type: "warning",
          title: "Upload Required",
          message: errorMessage,
          primaryButtonText: "Upload Mix",
          onPrimaryPress: () => {
            setCurrentScreen("upload-mix");
            hideCustomModal();
            setCurrentOpportunityIndex(currentOpportunityIndex + 1);
            setShowModal(false);
            setSelectedOpportunity(null);
          },
          secondaryButtonText: "OK",
          onSecondaryPress: () => {
            setCurrentOpportunityIndex(currentOpportunityIndex + 1);
            setShowModal(false);
            setSelectedOpportunity(null);
            hideCustomModal();
          },
        });
        return;
      }

      showCustomModal({
        type: "error",
        title: "Application Failed",
        message: `There was an error submitting your application: ${
          errorMessage || "Unknown error"
        }. Please try again.`,
        primaryButtonText: "OK",
      });
    } finally {
      setSelectedOpportunity(null);
    }
  };

  const resetOpportunities = () => {
    setCurrentOpportunityIndex(0);
    setSwipedOpportunities([]);
  };

  // Handle sharing opportunity via in-app DM
  const handleShareOpportunityInApp = async (shareMessage, opportunity) => {
    try {
      // Navigate to connections screen in share mode
      setCurrentScreen("connections");
      setScreenParams({
        initialTab: "connections",
        shareMode: true,
        shareMessage: shareMessage,
        shareOpportunity: opportunity,
        onShareSelect: async (selectedUserId) => {
          // Send the message when a connection is selected
          await sendOpportunityShareMessage(
            selectedUserId,
            shareMessage,
            opportunity
          );
        },
      });
    } catch (error) {
      console.error("Error initiating in-app share:", error);
      Alert.alert("Error", "Failed to open connections. Please try again.");
    }
  };

  // Send opportunity share message to a specific user
  const sendOpportunityShareMessage = async (
    receiverId,
    shareMessage,
    opportunity
  ) => {
    try {
      // Get or create message thread
      const threadId = await db.findOrCreateIndividualMessageThread(
        user.id,
        receiverId
      );

      // Prepare opportunity metadata
      const opportunityMetadata = {
        type: "opportunity",
        opportunity: {
          id: opportunity.id,
          title: opportunity.title,
          description: opportunity.description,
          date: opportunity.date,
          time: opportunity.time,
          location: opportunity.location,
          compensation: opportunity.compensation,
          distanceFormatted: opportunity.distanceFormatted,
          genre: opportunity.genre,
        },
      };

      // Send the message with opportunity metadata
      const { error } = await supabase.from("messages").insert({
        thread_id: threadId,
        sender_id: user.id,
        content: shareMessage, // Keep text content for fallback
        message_type: "opportunity", // New message type for opportunities
        metadata: opportunityMetadata, // Store structured opportunity data
      });

      if (error) throw error;

      // Navigate to the message thread
      setCurrentScreen("messages");
      setScreenParams({
        djId: receiverId,
        chatType: "individual",
        threadId: threadId,
        returnToConnectionsTab: "connections",
      });

      Alert.alert("Sent!", "Opportunity shared successfully!");
    } catch (error) {
      console.error("Error sending opportunity share:", error);
      Alert.alert("Error", "Failed to send message. Please try again.");
    }
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
  const formatOpportunityDate = (dateValue) => {
    if (!dateValue) return "TBD";
    try {
      const date = new Date(dateValue);
      if (Number.isNaN(date.getTime())) {
        return "TBD";
      }
      
      const day = date.getDate();
      const month = date.toLocaleDateString("en-GB", { month: "long" });
      const year = date.getFullYear();
      
      // Add ordinal suffix
      const getOrdinalSuffix = (n) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return s[(v - 20) % 10] || s[v] || s[0];
      };
      
      return `${day}${getOrdinalSuffix(day)} ${month} ${year}`;
    } catch (error) {
      console.warn("Unable to format opportunity date:", error);
      return "TBD";
    }
  };

  const formatOpportunityTime = (startValue, endValue = null) => {
    const sanitize = (value) => {
      if (!value && value !== 0) return null;

      if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed || /^tbd$/i.test(trimmed)) return null;

        // Handle ISO timestamps like "2025-09-12T21:00:00Z"
        if (/^\d{4}-\d{2}-\d{2}T/i.test(trimmed)) {
          const parsed = new Date(trimmed);
          if (!Number.isNaN(parsed.getTime())) {
            return new Intl.DateTimeFormat("en-GB", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            }).format(parsed);
          }
        }

        // Handle ranges encoded within a single string (e.g. "18:00-22:00")
        const rangeRegex =
          /^([0-2]?\d(?::\d{2})?(?:\s*[AaPp][Mm])?)\s*(?:-|–|to)\s*([0-2]?\d(?::\d{2})?(?:\s*[AaPp][Mm])?)$/i;
        const rangeMatch = trimmed.match(rangeRegex);
        if (rangeMatch && !endValue) {
          return {
            start: sanitize(rangeMatch[1]),
            end: sanitize(rangeMatch[2]),
            range: true,
          };
        }

        // Handle explicit AM/PM values (e.g. "9 PM", "9:30 am")
        const meridiemMatch = trimmed.match(
          /^([0-1]?\d)(?::([0-5]\d))?\s*([AaPp][Mm])$/
        );
        if (meridiemMatch) {
          const hours = parseInt(meridiemMatch[1], 10);
          const minutes = meridiemMatch[2] ? parseInt(meridiemMatch[2], 10) : 0;
          const period = meridiemMatch[3].toUpperCase();
          const normalizedHours =
            period === "PM" && hours < 12
              ? hours + 12
              : period === "AM" && hours === 12
              ? 0
              : hours;
          return sanitize(
            `${normalizedHours}:${minutes.toString().padStart(2, "0")}`
          );
        }

        // Ensure we only deal with HH:mm[:ss]
        const colonParts = trimmed.split(":");
        if (colonParts.length >= 2) {
          const hours = parseInt(colonParts[0], 10);
          const minutes = parseInt(colonParts[1], 10);

          if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
            const normalizedHours = ((hours + 11) % 12) + 1;
            const period = hours >= 12 ? "PM" : "AM";
            const paddedMinutes = minutes.toString().padStart(2, "0");
            return `${normalizedHours}:${paddedMinutes} ${period}`;
          }
        }

        // Fallback to trimmed string
        return trimmed;
      }

      if (value instanceof Date) {
        return new Intl.DateTimeFormat("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }).format(value);
      }

      if (typeof value === "number") {
        // Treat as minutes past midnight
        const hours = Math.floor(value / 60);
        const minutes = value % 60;
        const normalizedHours = ((hours + 11) % 12) + 1;
        const period = hours >= 12 ? "PM" : "AM";
        const paddedMinutes = minutes.toString().padStart(2, "0");
        return `${normalizedHours}:${paddedMinutes} ${period}`;
      }

      return `${value}`;
    };

    const startResult = sanitize(startValue);

    // Handle ranges embedded in sanitize response
    if (startResult && typeof startResult === "object" && startResult.range) {
      const { start, end } = startResult;
      if (start && end) return `${start} – ${end}`;
      return start || end || "TBD";
    }

    const endResult = sanitize(endValue);

    if (!startResult && !endResult) return "TBD";
    if (startResult && endResult) {
      if (startResult === endResult) return startResult;
      return `${startResult} – ${endResult}`;
    }
    return startResult || endResult || "TBD";
  };

  const formatCurrency = (value, currencyCode) => {
    if (value === null || value === undefined) return "TBD";

    const hasWholeValue = Number.isInteger(value);

    try {
      return new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: currencyCode,
        minimumFractionDigits: hasWholeValue ? 0 : 2,
        maximumFractionDigits: hasWholeValue ? 0 : 2,
      }).format(value);
    } catch (error) {
      console.warn("Unable to format opportunity compensation:", error);
      return `${currencyCode} ${value}`;
    }
  };

  const parseCompensationValue = (rawValue) => {
    if (rawValue === null || rawValue === undefined) return null;

    if (typeof rawValue === "number") {
      return Number.isFinite(rawValue) ? rawValue : null;
    }

    if (typeof rawValue === "string") {
      const trimmed = rawValue.trim();
      if (!trimmed) return null;

      // Handle range within a single string
      const rangeParts = trimmed.split(/\s*(?:-|–|to)\s*/i);
      if (rangeParts.length === 2) {
        const min = parseCompensationValue(rangeParts[0]);
        const max = parseCompensationValue(rangeParts[1]);
        if (min !== null && max !== null) {
          return { min, max };
        }
      }

      const sanitized = trimmed.replace(/[^0-9.-]+/g, "");
      const numeric = parseFloat(sanitized);
      return Number.isFinite(numeric) ? numeric : null;
    }

    return null;
  };

  const formatOpportunityCompensation = (
    amount,
    currency,
    maxAmount = null
  ) => {
    const currencyCode = (currency || "GBP").toUpperCase();
    const parsedAmount = parseCompensationValue(amount);
    let parsedMaxAmount = parseCompensationValue(maxAmount);

    if (parsedAmount && typeof parsedAmount === "object") {
      const min = parsedAmount.min ?? null;
      const max = parsedAmount.max ?? null;
      if (min !== null && max !== null) {
        return `${formatCurrency(min, currencyCode)} – ${formatCurrency(
          max,
          currencyCode
        )}`;
      }
      return min !== null
        ? formatCurrency(min, currencyCode)
        : max !== null
        ? formatCurrency(max, currencyCode)
        : "TBD";
    }

    if (
      parsedMaxAmount &&
      typeof parsedMaxAmount === "object" &&
      parsedMaxAmount.min !== undefined
    ) {
      parsedMaxAmount = parsedMaxAmount.max ?? parsedMaxAmount.min;
    }

    if (parsedAmount === null && parsedMaxAmount === null) {
      return "TBD";
    }

    if (
      parsedAmount !== null &&
      parsedMaxAmount !== null &&
      parsedAmount !== parsedMaxAmount
    ) {
      const min = Math.min(parsedAmount, parsedMaxAmount);
      const max = Math.max(parsedAmount, parsedMaxAmount);
      return `${formatCurrency(min, currencyCode)} – ${formatCurrency(
        max,
        currencyCode
      )}`;
    }

    const valueToFormat =
      parsedAmount !== null ? parsedAmount : parsedMaxAmount;
    return formatCurrency(valueToFormat, currencyCode);
  };

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
        const formattedDate = formatOpportunityDate(opp.event_date);
        let startTimeRaw =
          opp.event_start_time ??
          opp.start_time ??
          opp.event_time ??
          opp.event_date ??
          null;
        let endTimeRaw =
          opp.event_end_time ?? opp.event_time_end ?? opp.end_time ?? null;

        if (!endTimeRaw && typeof startTimeRaw === "string") {
          const timeRangeParts = startTimeRaw
            .split(/\s*(?:-|–|to)\s*/i)
            .map((part) => part.trim())
            .filter(Boolean);

          if (timeRangeParts.length === 2) {
            startTimeRaw = timeRangeParts[0] || startTimeRaw;
            endTimeRaw = timeRangeParts[1] || endTimeRaw;
          }
        }

        const formattedTime = formatOpportunityTime(startTimeRaw, endTimeRaw);
        const formattedCompensation = formatOpportunityCompensation(
          opp.payment,
          opp.payment_currency,
          opp.payment_max ?? opp.max_payment ?? null
        );
        const paymentValue =
          typeof opp.payment === "string"
            ? parseFloat(opp.payment)
            : Number(opp.payment);
        const resolvedLocation =
          opp.location ||
          [opp.city, opp.country].filter(Boolean).join(", ") ||
          "Location not set";
        const createdAt = opp.created_at ? new Date(opp.created_at) : null;
        const isNew =
          createdAt &&
          createdAt.getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000;

        // Calculate distance if user location is available and opportunity has coordinates
        let distance = null;
        let distanceFormatted = null;
        if (userLocation && opp.latitude && opp.longitude) {
          distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            opp.latitude,
            opp.longitude
          );
          distanceFormatted = formatDistance(distance);
        }

        return {
          id: opp.id,
          venue: opp.venue || "",
          title: opp.title,
          location: resolvedLocation,
          distance,
          distanceFormatted,
          date: formattedDate,
          rawDate: opp.event_date,
          time: formattedTime,
          rawTime: startTimeRaw,
          rawTimeEnd: endTimeRaw,
          audienceSize: opp.audience_size || "TBD",
          description: opp.description,
          genres: opp.genre ? [opp.genre] : ["Electronic"],
          compensation: formattedCompensation,
          paymentValue: Number.isFinite(paymentValue) ? paymentValue : null,
          paymentCurrency: opp.payment_currency
            ? opp.payment_currency.toUpperCase()
            : "GBP",
          applicationsLeft: 0, // Will be updated with user's daily stats
          status: isNew ? "new" : "hot",
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

  // Load notification counts
  const loadNotificationCounts = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const userSettings = await db.getUserSettings(user.id);
      // Default to false - messages should not trigger notifications unless user opts in
      const messageNotificationsEnabled =
        userSettings?.message_notifications ?? false;

      const [notificationCount, messageCount] = await Promise.all([
        db.getUnreadNotificationCount(user.id, {
          excludeTypes: messageNotificationsEnabled ? [] : ["message"],
        }),
        messageNotificationsEnabled
          ? db.getUnreadMessageCount(user.id)
          : Promise.resolve(0),
      ]);

      setUnreadNotificationCount(notificationCount);
      setUnreadMessageCount(messageCount || 0);
    } catch (error) {
      console.error("Error loading notification counts:", error);
    }
  };

  // Fetch user's liked mixes when user changes
  useEffect(() => {
    if (user?.id) {
      fetchUserLikedMixes();
    } else {
      setLikedMixIds(new Set());
    }
  }, [user?.id]);

  // Sync isLiked state when currentTrack or likedMixIds changes
  useEffect(() => {
    if (stateRef.current.currentTrack) {
      const isLiked = likedMixIds.has(stateRef.current.currentTrack.id);
      if (stateRef.current.currentTrack.isLiked !== isLiked) {
        setGlobalAudioState((prev) => ({
          ...prev,
          currentTrack: {
            ...prev.currentTrack,
            isLiked: isLiked,
          },
        }));
      }
    }
  // Sync runs when likedMixIds changes; stateRef.current has latest track
  }, [likedMixIds]);

  // Set up real-time subscriptions for notifications and opportunities
  useEffect(() => {
    if (!user) return;

    console.log(
      "🔔 Setting up real-time notification subscriptions for user:",
      user.id
    );

    // Subscribe to new notifications
    const notificationChannel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("🔔 New notification received:", payload.new);
          const newNotification = payload.new;
          
          // Show in-app notification toast
          setInAppNotification({
            id: newNotification.id,
            title: newNotification.title || "New Notification",
            message: newNotification.message || newNotification.content || "",
            type: newNotification.type || "info",
          });
          
          // Animate in
          Animated.spring(inAppNotificationAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
          }).start();
          
          // Auto-dismiss after 5 seconds
          setTimeout(() => {
            Animated.timing(inAppNotificationAnim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }).start(() => {
              setInAppNotification(null);
            });
          }, 5000);
          
          // Refresh notification counts when new notification arrives
          loadNotificationCounts();
          
          // Haptic feedback
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("🔔 Notification updated:", payload.new);
          // Refresh notification counts when notification is marked as read
          loadNotificationCounts();
        }
      )
      .subscribe();

    // Subscribe to new messages
    const messageChannel = supabase
      .channel(`messages-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("💬 New message received:", payload.new);
          // Refresh message counts when new message arrives
          loadNotificationCounts();
        }
      )
      .subscribe();

    // Subscribe to new opportunities (real-time updates)
    const opportunitiesChannel = supabase
      .channel("opportunities-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "opportunities",
          filter: "is_active=eq.true",
        },
        (payload) => {
          console.log("🎯 New opportunity added:", payload.new);
          // Refresh opportunities when a new one is added
          fetchOpportunities();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "opportunities",
        },
        (payload) => {
          console.log("🎯 Opportunity updated:", payload.new);
          // Refresh opportunities when one is updated (e.g., status change)
          fetchOpportunities();
        }
      )
      .subscribe();

    return () => {
      console.log("🔔 Cleaning up real-time subscriptions");
      supabase.removeChannel(notificationChannel);
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(opportunitiesChannel);
    };
  }, [user]);

  // Notification Badge Component
  const NotificationBadge = ({ count, style }) => {
    if (count === 0) return null;

    const displayValue = count > 99 ? "99+" : `${count}`;
    const isSingleDigit = displayValue.length === 1;

    return (
      <View
        style={[
          styles.notificationBadge,
          isSingleDigit && styles.notificationBadgeSingleDigit,
          style,
        ]}
      >
        <Text style={styles.notificationBadgeText}>{displayValue}</Text>
      </View>
    );
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
          youtube: djProfile.youtube || null,
          city: djProfile.city,
          genres: djProfile.genres,
          bio: `DJ from ${
            djProfile.city
          } specializing in ${djProfile.genres.join(", ")}`,
          profile_image_url: djProfile.profile_image_url || null,
        };
        console.log("📤 Updating with data:", updateData);

        savedProfile = await db.updateUserProfile(user.id, updateData);
        console.log("✅ Update complete:", savedProfile);

        // Ensure existing profile has invite code
        try {
          await db.getUserInviteCode(user.id);
        } catch (codeError) {
          console.warn("⚠️ Failed to ensure invite code:", codeError);
        }
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
          youtube: djProfile.youtube || null,
          city: djProfile.city,
          genres: djProfile.genres,
          bio: `DJ from ${
            djProfile.city
          } specializing in ${djProfile.genres.join(", ")}`,
          email: user.email,
          profile_image_url: djProfile.profile_image_url || null,
        };

        console.log("📤 Creating profile with data:", profileData);

        try {
          savedProfile = await db.createUserProfile(profileData);
          console.log("✅ Profile created successfully:", savedProfile);

          // Ensure invite code is generated
          try {
            await db.getUserInviteCode(user.id);
          } catch (codeError) {
            console.warn("⚠️ Failed to ensure invite code:", codeError);
          }
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

      // Check if profile picture is missing and show complete profile modal
      if (!savedProfile?.profile_image_url) {
        setTimeout(() => {
          setShowCompleteProfileModal(true);
        }, 1500); // Show after success modal closes
      } else {
        showCustomModal({
          type: "success",
          title: "Success",
          message:
            "Welcome to R/HOOD! Your profile has been saved to the cloud.",
          primaryButtonText: "OK",
          onPrimaryPress: () => setShowModal(false),
        });
      }
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

  // Fonts will load asynchronously - app continues with system fonts until ready
  // No need to block or log repeatedly

  // Auth gate: splash, auth loading, login/signup, onboarding, profile loading
  const authGateRender = AuthGate({
    showSplash,
    onSplashFinish: handleSplashFinish,
    authLoading,
    isLoading,
    user,
    isFirstTime,
    authMode,
    djProfile,
    setDjProfile,
    onLoginSuccess: handleLoginSuccess,
    onSignupSuccess: handleSignupSuccess,
    onSwitchToSignup: showSignup,
    onSwitchToLogin: showLogin,
    onOnboardingComplete: completeOnboarding,
    styles,
  });
  if (authGateRender !== null) {
    return authGateRender;
  }

  const renderScreen = () => (
    <View style={styles.screenContainer}>
      <ScreenRouter
        screen={currentScreen}
        screenParams={screenParams}
        styles={styles}
        user={user}
        setCurrentScreen={setCurrentScreen}
        setScreenParams={setScreenParams}
        setUser={setUser}
        setIsFirstTime={setIsFirstTime}
        setDjProfile={setDjProfile}
        setShowAuth={setShowAuth}
        setAuthMode={setAuthMode}
        playGlobalAudio={playGlobalAudio}
        pauseGlobalAudio={pauseGlobalAudio}
        resumeGlobalAudio={resumeGlobalAudio}
        stopGlobalAudio={stopGlobalAudio}
        addToQueue={addToQueue}
        playNextTrack={playNextTrack}
        clearQueue={clearQueue}
        opportunities={opportunities}
        currentOpportunityIndex={currentOpportunityIndex}
        dailyApplicationStats={dailyApplicationStats}
        handleOpportunityPress={handleOpportunityPress}
        handleSwipeLeft={handleSwipeLeft}
        handleSwipeRight={handleSwipeRight}
        resetOpportunities={resetOpportunities}
        isLoadingOpportunities={isLoadingOpportunities}
        showSwipeTutorial={showSwipeTutorial}
        handleDismissSwipeTutorial={handleDismissSwipeTutorial}
        loadNotificationCounts={loadNotificationCounts}
        shuffleAllMixes={shuffleAllMixes}
        shuffleByGenre={shuffleByGenre}
        shuffleBasedOnLikes={shuffleBasedOnLikes}
      />
    </View>
  );


  return (
    <AppShell
      currentScreen={currentScreen}
      onOpenMenu={openMenu}
      onTabPress={handleMenuNavigation}
      unreadNotificationCount={unreadNotificationCount}
      styles={styles}
    >
      {renderScreen()}

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
                  <Text style={styles.menuTitle}>MENU</Text>
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
                      size={24}
                      color="hsl(75, 100%, 60%)"
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
                    onPress={() =>
                      handleMenuNavigation("connections", {
                        initialTab: "connections",
                      })
                    }
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="chatbubbles-outline"
                      size={24}
                      color="hsl(75, 100%, 60%)"
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
                    <View style={styles.tabIconContainer}>
                      <Ionicons
                        name="notifications-outline"
                        size={24}
                        color="hsl(75, 100%, 60%)"
                      />
                      <NotificationBadge
                        count={unreadNotificationCount}
                        style={styles.tabNotificationBadge}
                      />
                    </View>
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
                    <Ionicons
                      name="people-outline"
                      size={24}
                      color="hsl(75, 100%, 60%)"
                    />
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
                    <Ionicons
                      name="person-outline"
                      size={24}
                      color="hsl(75, 100%, 60%)"
                    />
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
                      size={24}
                      color="hsl(75, 100%, 60%)"
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

        <GlobalAudioPlayerUI
          currentScreen={currentScreen}
          currentTrack={audioState.currentTrack}
          pendingTrack={pendingPlayTrack}
          onNavigateToProfile={(userId) => {
            setCurrentScreen("user-profile");
            setScreenParams({ userId });
          }}
          styles={styles}
          globalAudioRef={globalAudioRef}
        />

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

        {/* Complete Profile Modal */}
        <RhoodModal
          visible={showCompleteProfileModal}
          onClose={() => setShowCompleteProfileModal(false)}
          title="Complete Your Profile"
          message="Add a profile picture to personalize your profile and help others recognize you."
          type="info"
          primaryButtonText="Add Photo"
          secondaryButtonText="Maybe Later"
          onPrimaryPress={() => {
            setShowCompleteProfileModal(false);
            setShowEditProfile(true);
          }}
          onSecondaryPress={() => setShowCompleteProfileModal(false)}
        />

        {/* In-App Notification Toast */}
        {inAppNotification && (
          <Animated.View
            style={[
              styles.inAppNotificationContainer,
              {
                opacity: inAppNotificationAnim,
                transform: [
                  {
                    translateY: inAppNotificationAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-100, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.inAppNotification}
              activeOpacity={0.9}
              onPress={() => {
                Animated.timing(inAppNotificationAnim, {
                  toValue: 0,
                  duration: 300,
                  useNativeDriver: true,
                }).start(() => {
                  setInAppNotification(null);
                });
                handleMenuNavigation("notifications");
              }}
            >
              <View style={styles.inAppNotificationContent}>
                <Ionicons
                  name="notifications"
                  size={20}
                  color="hsl(75, 100%, 60%)"
                  style={styles.inAppNotificationIcon}
                />
                <View style={styles.inAppNotificationTextContainer}>
                  <Text style={styles.inAppNotificationTitle}>
                    {inAppNotification.title}
                  </Text>
                  {inAppNotification.message && (
                    <Text
                      style={styles.inAppNotificationMessage}
                      numberOfLines={2}
                    >
                      {inAppNotification.message}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => {
                    Animated.timing(inAppNotificationAnim, {
                      toValue: 0,
                      duration: 300,
                      useNativeDriver: true,
                    }).start(() => {
                      setInAppNotification(null);
                    });
                  }}
                  style={styles.inAppNotificationClose}
                >
                  <Ionicons
                    name="close"
                    size={18}
                    color="hsl(0, 0%, 70%)"
                  />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}

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

        {/* Audio Error Modal */}
        <RhoodModal
          visible={audioErrorModal.visible}
          onClose={() => setAudioErrorModal({ visible: false, title: "", message: "" })}
          title={audioErrorModal.title}
          message={audioErrorModal.message}
          type="error"
          primaryButtonText="OK"
          onPrimaryPress={() => setAudioErrorModal({ visible: false, title: "", message: "" })}
        />

        {/* Custom RHOOD Modal */}
        <RhoodModal
          visible={showModal}
          onClose={() => setShowModal(false)}
          type={modalConfig.type}
          title={modalConfig.title}
          message={modalConfig.message}
          eventDetails={modalConfig.eventDetails}
          primaryButtonText={modalConfig.primaryButtonText}
          secondaryButtonText={modalConfig.secondaryButtonText}
          onPrimaryPress={modalConfig.onPrimaryPress}
          onSecondaryPress={modalConfig.onSecondaryPress}
          showCloseButton={modalConfig.showCloseButton}
          showShareButton={modalConfig.showShareButton}
          shareOpportunity={modalConfig.shareOpportunity || null}
          shareUserId={modalConfig.shareUserId || null}
          onShareInApp={modalConfig.onShareInApp || null}
        />

        {/* Brief Form Modal - REMOVED (simplified to swipe-to-apply) */}
    </AppShell>
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
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start", // Ensure left alignment
  },
  logoText: {
    color: "#C2CC06", // Brand lime green
    fontSize: 18,
    fontFamily: "TS Block Bold",
    letterSpacing: 1,
  },
  logoTextGreen: {
    color: "#C2CC06", // Brand lime green - matches the green logo
    fontSize: 18,
    fontFamily: "TS Block Bold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  logoTextWhite: {
    color: "#FFFFFF", // White - matches the white logo
    fontSize: 18,
    fontFamily: "TS Block Bold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  logoTextBlack: {
    color: "#000000", // Black - matches the black logo
    fontSize: 18,
    fontFamily: "TS Block Bold",
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
    fontFamily: "TS Block Bold",
    color: "#FFFFFF", // Brand white text
    marginBottom: 20,
    textAlign: "center",
    lineHeight: 24, // 120% of 20pt
    letterSpacing: 0, // Tracking set to 0
    textTransform: "uppercase",
  },
  title: {
    fontSize: 24,
    fontFamily: "TS Block Bold",
    color: "#C2CC06", // Brand lime green
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: 0, // Tracking set to 0
    lineHeight: 28.8, // 120% of 24pt
    textTransform: "uppercase",
  },
  // TS Block Bold for impactful headings
  tsBlockBoldHeading: {
    fontFamily: "TS Block Bold",
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
    fontFamily: "TS Block Bold",
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
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 16,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 15, // Android shadow
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(0, 0, 0, 0.92)",
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: "center",
    flexDirection: "column",
    gap: 4,
    marginHorizontal: 1,
    backgroundColor: "transparent", // Ensure 0 opacity for all tabs
  },
  activeTab: {
    backgroundColor: "transparent", // Remove background for active tab
  },
  tabText: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    fontWeight: "500", // Medium weight
    color: "hsl(0, 0%, 70%)", // Muted foreground
    textTransform: "capitalize", // Proper capitalization instead of uppercase
    letterSpacing: 0.2,
  },
  activeTabText: {
    color: "hsl(75, 100%, 60%)", // Brand lime green for active text
    fontWeight: "500", // Medium weight to match inactive tabs
  },

  // Notification Badge Styles
  tabIconContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBadge: {
    position: "absolute",
    top: -6,
    right: -8,
    backgroundColor: "#FF3B30", // iOS red
    alignItems: "center",
    justifyContent: "center",
    minWidth: 22,
    minHeight: 22,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#000000", // Black border to stand out
  },
  notificationBadgeSingleDigit: {
    minWidth: 18,
    minHeight: 18,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 11,
  },
  tabNotificationBadge: {
    top: -8,
    right: -10,
  },
  menuNotificationBadge: {
    top: -4,
    right: -4,
  },
  notificationBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 13,
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
    fontFamily: "TS Block Bold",
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
    fontFamily: "TS Block Bold",
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
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "transparent",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 30%)",
  },
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
    maxHeight: "85%",
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
    padding: 24,
    paddingBottom: 60,
  },
  menuHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 20%)",
  },
  menuTitle: {
    fontSize: 24,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    letterSpacing: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  menuItems: {
    gap: 12,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "hsl(0, 0%, 12%)",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 18%)",
    minHeight: 72,
  },
  menuItemText: {
    fontSize: 18,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 100%)",
    fontWeight: "bold",
    lineHeight: 20,
    marginBottom: 2,
  },
  menuItemContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },
  menuItemDescription: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
    lineHeight: 16,
    // marginLeft: 16,
    fontWeight: "400",
  },
  menuItemActive: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "hsl(0, 0%, 15%)",
    borderWidth: 2,
    borderColor: "hsl(75, 100%, 60%)",
    minHeight: 72,
  },

  // Full-Screen Player Menu Styles
  fullScreenMenuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-end",
  },
  fullScreenMenuOverlayTouchable: {
    flex: 1,
  },
  fullScreenMenuContainer: {
    backgroundColor: "hsl(0, 0%, 5%)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
    borderBottomWidth: 0,
    maxHeight: "50%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  fullScreenMenuContent: {
    padding: 20,
  },
  fullScreenMenuHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 20%)",
  },
  fullScreenMenuItems: {
    gap: 16,
  },
  fullScreenMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "hsl(0, 0%, 10%)",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  menuItemContent: {
    flex: 1,
    marginLeft: 16,
  },
  menuItemText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 4,
  },
  menuItemDescription: {
    fontSize: 13,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 60%)",
  },
  // Queue Modal Styles
  queueModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-end",
  },
  queueModalOverlayTouchable: {
    flex: 1,
  },
  queueModalContainer: {
    backgroundColor: "hsl(0, 0%, 5%)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
    maxHeight: "80%",
  },
  queueModalContent: {
    padding: 20,
  },
  queueModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  queueModalTitle: {
    fontSize: 24,
    fontFamily: "TS Block Bold",
    fontWeight: "900",
    color: "hsl(0, 0%, 100%)",
  },
  queueModalClose: {
    padding: 4,
  },
  queueModalScroll: {
    maxHeight: 500,
  },
  queueItemCurrent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "hsl(0, 0%, 10%)",
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%)",
    marginBottom: 12,
  },
  queueItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "hsl(0, 0%, 8%)",
    marginBottom: 8,
  },
  queueItemContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  queueItemActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  queueItemReorderButton: {
    padding: 4,
  },
  queueItemNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "hsl(0, 0%, 15%)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  queueItemNumberText: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 70%)",
  },
  queueItemInfo: {
    flex: 1,
  },
  queueItemTitle: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 4,
  },
  queueItemArtist: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
  },
  queueItemBadge: {
    backgroundColor: "hsl(75, 100%, 60%)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  queueItemBadgeText: {
    fontSize: 11,
    fontFamily: "Helvetica Neue",
    fontWeight: "700",
    color: "hsl(0, 0%, 0%)",
  },
  queueItemRemove: {
    padding: 4,
    marginLeft: 8,
  },
  queueEmpty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  queueEmptyText: {
    fontSize: 18,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 50%)",
    marginTop: 16,
    marginBottom: 8,
  },
  queueEmptySubtext: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 40%)",
    textAlign: "center",
  },
  queueClearButton: {
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: "hsl(0, 0%, 10%)",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 20%)",
    alignItems: "center",
  },
  queueClearButtonText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 100%, 60%)",
  },

  // Global Audio Player Styles
  globalAudioPlayer: {
    position: "absolute",
    bottom: 120, // Above floating tab bar
    left: 20,
    right: 20,
    backgroundColor: "hsl(0, 0%, 8%)", // Dark background
    borderRadius: 12, // Reduced from 50 to match other elements
    paddingVertical: 12, // Compact vertical padding
    paddingHorizontal: 16,
    zIndex: 1001, // Higher than tab bar
    elevation: 20, // Above tab bar (elevation 15) on Android
    // Remove shadow to avoid overlapping bottom tab
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    borderWidth: 0, // Remove border for cleaner look
    minHeight: 70, // Compact height
  },
  audioPlayerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  audioAlbumArt: {
    width: 50, // Slightly smaller for compact design
    height: 50,
    borderRadius: 8, // Less rounded than main container
    marginRight: 12, // Tighter spacing
    overflow: "hidden",
    borderWidth: 0.5, // Subtle border
    borderColor: "hsl(0, 0%, 20%)", // Very subtle border
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
    marginRight: 16, // Better spacing
    justifyContent: "center",
  },
  audioTrackTitle: {
    fontSize: 16, // Larger for better hierarchy
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 2, // Tight spacing
    lineHeight: 18,
  },
  audioTrackArtist: {
    fontSize: 14, // Slightly larger
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)", // Light gray for artist
    fontWeight: "400",
  },
  upNextPreview: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "hsl(0, 0%, 20%)",
  },
  upNextLabel: {
    fontSize: 10,
    fontFamily: "Helvetica Neue",
    fontWeight: "500",
    color: "hsl(0, 0%, 60%)",
    marginBottom: 2,
  },
  upNextTrack: {
    fontSize: 11,
    fontFamily: "Helvetica Neue",
    color: "hsl(75, 100%, 60%)",
  },
  audioControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center", // Center the single button
  },
  audioControlButton: {
    width: 40, // Smaller, more compact
    height: 40,
    borderRadius: 20,
    backgroundColor: "hsl(75, 100%, 60%)", // R/HOOD green
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "hsl(75, 100%, 60%)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
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
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3, // Very thin progress bar
    backgroundColor: "hsl(0, 0%, 15%)", // Dark track
    borderBottomLeftRadius: 12, // Match container radius
    borderBottomRightRadius: 12,
    overflow: "visible", // Allow thumb to extend beyond container
  },
  audioProgressBar: {
    height: "100%",
    backgroundColor: "transparent", // No background needed
    position: "relative",
  },
  audioProgressFill: {
    height: "100%",
    backgroundColor: "hsl(75, 100%, 60%)", // R/HOOD green
    borderRadius: 0, // No border radius for thin line
  },
  scrubberThumb: {
    position: "absolute",
    top: -4, // Position above the progress bar
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "hsl(75, 100%, 60%)", // R/HOOD green
    marginLeft: -5, // Center the thumb
    shadowColor: "hsl(75, 100%, 60%)",
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
    marginTop: 4,
    marginRight: 24, // Increased spacing from play button
  },
  audioTimeText: {
    fontSize: 11, // Smaller for subtlety
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 50%)", // More subtle
    fontWeight: "400",
    letterSpacing: 0.5,
  },

  // Full-Screen Player Styles - Redesigned to match reference with R/HOOD theming
  fullScreenPlayerOverlay: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 8%)", // Dark background like reference
  },
  fullScreenBackgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  fullScreenOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.3)", // Subtle overlay
  },
  fullScreenPlayer: {
    flex: 1,
    backgroundColor: "transparent",
    zIndex: 1,
  },
  fullScreenPlayerContent: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 40,
    minHeight: Dimensions.get("window").height,
  },
  fullScreenHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 40,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenMenuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  threeDotsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "hsl(0, 0%, 15%)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 25%)",
  },
  fullScreenHeaderTitle: {
    fontSize: 18,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    fontWeight: "600",
    textAlign: "center",
    flex: 1,
    marginHorizontal: 16,
  },
  fullScreenAlbumArtContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  fullScreenAlbumArt: {
    width: 320,
    height: 320,
    borderRadius: 12,
    shadowColor: "hsl(75, 100%, 60%)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  fullScreenTrackInfo: {
    alignItems: "flex-start",
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  fullScreenTrackTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    gap: 12,
    marginBottom: 8,
  },
  fullScreenTrackTitle: {
    fontSize: 24,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    fontWeight: "900",
    textAlign: "left",
    flex: 1,
    lineHeight: 28,
  },
  fullScreenLikeButton: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenTrackArtist: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
    textAlign: "left",
    fontWeight: "500",
    marginBottom: 4,
  },
  fullScreenProgressSection: {
    marginBottom: 32,
  },
  fullScreenProgressBar: {
    height: 4,
    backgroundColor: "hsla(0, 0%, 20%, 0.3)",
    borderRadius: 2,
    marginBottom: 16,
    position: "relative",
    paddingVertical: 12,
    justifyContent: "center",
  },
  fullScreenProgressFill: {
    height: 4,
    backgroundColor: "hsl(75, 100%, 60%)",
    borderRadius: 2,
    position: "absolute",
    top: 12,
  },
  fullScreenProgressThumb: {
    position: "absolute",
    top: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "hsl(75, 100%, 60%)",
    marginLeft: -6,
    shadowColor: "hsl(75, 100%, 60%)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 3,
  },
  fullScreenTimeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  fullScreenTimeText: {
    fontSize: 14,
    color: "hsl(0, 0%, 70%)",
    fontFamily: "Helvetica Neue",
    fontWeight: "500",
  },
  fullScreenControls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 32,
    marginLeft: 40,
    marginRight: 40,
    gap: 40,
  },
  fullScreenControlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenSecondaryActions: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 16,
    paddingHorizontal: 20,
    gap: 24,
  },
  fullScreenSecondaryButton: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 80,
    position: "relative",
  },
  fullScreenSecondaryButtonText: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 100%)",
    marginTop: 4,
    fontWeight: "500",
  },
  queueBadge: {
    position: "absolute",
    top: 0,
    right: 4,
    backgroundColor: "hsl(75, 100%, 60%)",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  queueBadgeText: {
    fontSize: 10,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 0%)",
    fontWeight: "700",
  },
  fullScreenPlayButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "hsl(75, 100%, 60%)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "hsl(75, 100%, 60%)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
  },

  // About the DJ Section
  aboutDJCard: {
    marginTop: 32,
    marginHorizontal: 24,
    backgroundColor: "hsl(0, 0%, 12%)",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 20%)",
    shadowColor: "hsl(75, 100%, 60%)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  aboutDJHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  aboutDJAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
    borderWidth: 2,
    borderColor: "hsl(75, 100%, 60%)",
    overflow: "hidden",
  },
  aboutDJAvatarImage: {
    width: "100%",
    height: "100%",
  },
  aboutDJInfo: {
    flex: 1,
  },
  aboutDJTitle: {
    fontSize: 16,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    fontWeight: "600",
    marginBottom: 4,
  },
  aboutDJName: {
    fontSize: 14,
    color: "hsl(75, 100%, 60%)",
    fontWeight: "500",
  },
  aboutDJArrow: {
    marginLeft: 8,
  },
  aboutDJText: {
    fontSize: 14,
    color: "hsl(0, 0%, 70%)",
    lineHeight: 20,
    fontWeight: "400",
  },

  // Enhanced Progress Bar Styles
  enhancedProgressContainer: {
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

  // Play Bar Fade Overlay (above tab bar, below mini player)
  playBarFadeOverlay: {
    position: "absolute",
    bottom: 90, // Position above the play bar (play bar height is ~70px)
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    pointerEvents: "none",
    zIndex: 1000,
    elevation: 19,
  },

  // Menu Styles
  headerSpacer: {
    flex: 1,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  menuItemText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 100%)",
    // marginLeft: 16,
    fontWeight: "bold",
  },
  // Swipe Tutorial Styles
  tutorialOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  tutorialContent: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  tutorialHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  tutorialTitle: {
    fontSize: 24,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    fontWeight: "bold",
  },
  tutorialCloseButton: {
    padding: 4,
  },
  tutorialInstructions: {
    marginBottom: 24,
  },
  tutorialInstructionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  tutorialIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "hsl(0, 0%, 12%)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  tutorialTextContainer: {
    flex: 1,
  },
  tutorialInstructionTitle: {
    fontSize: 18,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 4,
  },
  tutorialInstructionText: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
    lineHeight: 20,
  },
  tutorialGotItButton: {
    backgroundColor: "hsl(75, 100%, 60%)",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: "center",
  },
  tutorialGotItButtonText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
    color: "hsl(0, 0%, 0%)",
  },
  // In-App Notification Toast Styles
  inAppNotificationContainer: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    zIndex: 10000,
    elevation: 10000,
  },
  inAppNotification: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  inAppNotificationContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  inAppNotificationIcon: {
    marginRight: 12,
  },
  inAppNotificationTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  inAppNotificationTitle: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 4,
  },
  inAppNotificationMessage: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
    lineHeight: 18,
  },
  inAppNotificationClose: {
    padding: 4,
  },
});
