import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  AppState,
  Linking,
  Alert,
  Platform,
  Dimensions,
  PanResponder,
  Easing,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import lockScreenControls from "./lib/lockScreenControls";
import { useFonts } from "expo-font";
import * as Haptics from "expo-haptics";
import {
  setupAudioNotificationCategories,
  setupNotificationListeners as setupAudioNotificationListeners,
  requestNotificationPermissions,
} from "./lib/notificationSetup";
import RhoodModal from "./components/RhoodModal";
import EditProfileScreen from "./components/EditProfileScreen";
import AuthGate from "./components/AuthGate";
import { db, auth, supabase } from "./lib/supabase";
import { clearScreenCachesForUser } from "./lib/screenCache";
import { clearMessageThreadSnapshotsForUser } from "./lib/messageThreadSnapshotCache";
import {
  ANIMATION_DURATION,
} from "./lib/performanceConstants";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import AppShell from "./components/AppShell";
import ScreenRouter from "./navigation/ScreenRouter";
import {
  SCREENS,
  TAB_BAR_HIDDEN_SCREEN_IDS,
  ANCHORED_TAB_BAR_CONTENT_HEIGHT,
} from "./navigation/routes";
import {
  registerForPushNotifications,
  setupNotificationListeners,
  setPushNotificationTapHandler,
  clearSessionExpoPushTokenCache,
} from "./lib/pushNotifications";
import {
  getCurrentLocation,
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
import GlobalAudioPlayerUI from "./components/GlobalAudioPlayerUI";
import { AppTutorialProvider } from "./context/AppTutorialContext";
import useAudioPlayback from "./hooks/useAudioPlayback";
import useOpportunities from "./hooks/useOpportunities";

/** Menu sheet motion — cubic easing reads smoother than linear defaults */
const MENU_EASE = {
  out: Easing.out(Easing.cubic),
  in: Easing.in(Easing.cubic),
  outSoft: Easing.out(Easing.quad),
};

const MENU_TIMINGS = {
  openSlideMs: 340,
  openOverlayMs: 220,
  closeSlideMs: 300,
  closeOverlayMs: 210,
  swipeDismissMs: 280,
};

// Notification Badge Component (defined outside App to maintain stable identity)
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

export default function App() {
  // Load custom fonts
  // Use the actual font family name "TS Block Bold" (not PostScript name)
  // This matches the internal font name from the TTF file
  const [fontsLoaded, fontError] = useFonts({
    // Filename without spaces avoids broken Metro asset URLs (.%2Fassets) and load issues.
    "TS Block Bold": require("./assets/TSBlockBold.ttf"),
  });

  // Log font status (but don't block app if it fails)
  useEffect(() => {
    if (fontError) {
      // Font failed to load - app will use system fonts gracefully
      if (__DEV__) {
        console.warn(
          "⚠️ Custom font not available, using system fonts:",
          fontError?.message?.substring(0, 80)
        );
      }
    } else if (fontsLoaded) {
      if (__DEV__) console.log("✅ TS Block Bold font loaded successfully");
    }
  }, [fontsLoaded, fontError]);

  const [showSplash, setShowSplash] = useState(true);
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const [currentScreen, setCurrentScreen] = useState("opportunities");
  const [screenParams, setScreenParams] = useState({});

  const insets = useSafeAreaInsets();
  const showMainTabBar = !TAB_BAR_HIDDEN_SCREEN_IDS.includes(currentScreen);
  const anchoredTabBottomPad = showMainTabBar
    ? ANCHORED_TAB_BAR_CONTENT_HEIGHT + insets.bottom
    : 0;

  // Notification badge state
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [showFadeOverlay, setShowFadeOverlay] = useState(false);
  const fadeOverlayAnim = useRef(new Animated.Value(0)).current;
  const menuSlideAnim = useRef(new Animated.Value(0)).current;
  const menuOpacityAnim = useRef(new Animated.Value(0)).current;
  /** Extra translateY while dragging the menu sheet down (dismiss). */
  const menuDragY = useRef(new Animated.Value(0)).current;
  const finishMenuSwipeDismissRef = useRef(() => {});
  const fullScreenMenuOpacityAnim = useRef(new Animated.Value(0)).current;

  const menuSheetHiddenOffset = useMemo(
    () =>
      Math.min(
        440,
        Math.max(280, Math.round((Dimensions.get("window")?.height || 700) * 0.36))
      ),
    []
  );

  const menuSlideTranslateY = useMemo(
    () =>
      menuSlideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [menuSheetHiddenOffset, 0],
      }),
    [menuSlideAnim, menuSheetHiddenOffset]
  );

  // Forward-declaration refs for callbacks referenced before their definition
  const closeMenuRef = useRef(null);
  const fetchUserLocationRef = useRef(null);
  /** Keeps latest tab/screen for handleMenuNavigation (stable callback, no stale closure). */
  const currentScreenRef = useRef(currentScreen);

  // Authentication state
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("login"); // 'login' or 'signup'

  // Audio playback (all audio logic extracted into dedicated hook)
  const audio = useAudioPlayback({ user });

  // Initialize notification setup for lock screen audio controls
  useEffect(() => {
    let audioNotifSubscription = null;

    const initializeNotifications = async () => {
      try {
        await requestNotificationPermissions();
        await setupAudioNotificationCategories();
        audioNotifSubscription = setupAudioNotificationListeners();
        await lockScreenControls.initialize();

        if (__DEV__) console.log("✅ Lock screen audio controls initialized");
      } catch (error) {
        if (__DEV__) console.error("❌ Error initializing notifications:", error);
      }
    };

    initializeNotifications();

    // Initialize analytics
    (async () => {
      await initAnalytics();
      await track(AnalyticsEvents.APP_OPEN);
    })();

    return () => {
      audioNotifSubscription?.remove?.();
    };
  }, []);

  // Track screen views when screen changes; keep ref in sync for menu navigation callbacks
  useEffect(() => {
    currentScreenRef.current = currentScreen;
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

  const [inAppNotification, setInAppNotification] = useState(null);
  const inAppNotificationAnim = useRef(new Animated.Value(0)).current;

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

  // Helper function to show custom modal
  const showCustomModal = useCallback((config) => {
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
  }, []);

  const hideCustomModal = useCallback(() => {
    setShowModal(false);
  }, []);

  // Opportunities (all state + logic extracted into dedicated hook)
  const opp = useOpportunities({
    user,
    currentScreen,
    screenParams,
    userLocation,
    showCustomModal,
    hideCustomModal,
    setCurrentScreen,
    setScreenParams,
  });

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
    if (__DEV__) console.log("🏗️ New Architecture Check:");
    if (__DEV__) console.log("RCT_NEW_ARCH_ENABLED:", global.RCT_NEW_ARCH_ENABLED);
    if (__DEV__) console.log("Fabric enabled:", global.nativeFabricUIManager !== undefined);
    if (__DEV__) console.log("TurboModules enabled:", global.RN$Bridgeless !== undefined);
    if (__DEV__) {
      console.log(
        "React Native version:",
        require("react-native").Platform.constants.reactNativeVersion
      );
    }
    if (__DEV__) console.log("Expo SDK version:", require("expo/package.json").version);
    if (__DEV__) {
      console.log(
        "New Architecture status:",
        global.RCT_NEW_ARCH_ENABLED === "1" ? "✅ ENABLED" : "❌ DISABLED"
      );
    }

    initializeAuth();

    // Handle deep links for password reset
    const handleDeepLink = async (url) => {
      if (!url) return;
      
      if (__DEV__) console.log("🔗 Deep link received:", url);
      
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
            
            if (__DEV__) {
              console.log("🔐 Password reset link detected:", { 
                hasAccessToken: !!accessToken, 
                hasRefreshToken: !!refreshToken,
                type 
              });
            }
            
            if (type === "recovery" && accessToken) {
              // Set the session using the tokens from the reset link
              const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || "",
              });
              
              if (error) {
                if (__DEV__) console.error("❌ Error setting reset session:", error);
                Alert.alert("Error", "This password reset link is invalid or has expired. Please request a new one.");
                return;
              }
              
              if (__DEV__) console.log("✅ Reset session established, showing reset password screen");
              setShowAuth(false);
              setCurrentScreen("reset-password");
            }
          } else {
            // No hash - might be opening the screen directly
            // Check if there's an active recovery session
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              if (__DEV__) console.log("✅ Active session found, showing reset password screen");
              setShowAuth(false);
              setCurrentScreen("reset-password");
            }
          }
        }
      } catch (error) {
        if (__DEV__) console.error("❌ Error handling deep link:", error);
        // If URL parsing fails, try checking for active session
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session && url.includes("reset-password")) {
            setShowAuth(false);
            setCurrentScreen("reset-password");
          }
        } catch (sessionError) {
          if (__DEV__) console.error("❌ Error checking session:", sessionError);
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
      if (__DEV__) {
        console.log(
          "Push notifications not available (running in Expo Go):",
          error.message
        );
      }
    }

    // Cleanup on unmount
    return () => {
      linkingSubscription?.remove();
    };
  }, []);

  // Load notification counts when user changes
  useEffect(() => {
    if (user) {
      loadNotificationCounts();
    }
  }, [user]);


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
        if (__DEV__) console.log("Skipping push setup - no authenticated user");
        return;
      }

      const userSettings = await db.getUserSettings(user.id);
      if (userSettings?.push_notifications === false) {
        if (__DEV__) {
          console.log(
            "Push notifications disabled in settings. Skipping registration."
          );
        }
        return;
      }

      const token = await registerForPushNotifications();
      if (!token) {
        if (__DEV__) console.log("Unable to obtain push notification token");
        return;
      }

      if (__DEV__) console.log("Push notification token obtained:", token);

      // Setup notification listeners
      const cleanup = setupNotificationListeners();

      // Store cleanup function for later use
      return cleanup;
    } catch (error) {
      if (__DEV__) console.error("Error setting up push notifications:", error);
    }
  };

  // Initialize authentication
  const initializeAuth = async () => {
    try {
      // Configure Google Sign-In
      try {
        const googleSignIn = require("./lib/googleSignIn");
        googleSignIn.configureGoogleSignIn();
        if (__DEV__) console.log("✅ Google Sign-In configured");
      } catch (error) {
        if (__DEV__) console.log("⚠️ Native Google Sign-In not available:", error.message);
      }

      // Get initial session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        if (__DEV__) console.log("Session error:", sessionError.message);

        // Handle specific refresh token errors
        if (
          sessionError.message?.includes("Refresh Token") ||
          sessionError.message?.includes("Invalid Refresh Token")
        ) {
          if (__DEV__) {
            console.log(
              "🔄 Invalid refresh token detected, clearing session and signing out"
            );
          }
          try {
            await supabase.auth.signOut();
          } catch (signOutError) {
            if (__DEV__) console.log("Sign out error:", signOutError);
          }
        }

        // Clear invalid session
        setUser(null);
        setAuthLoading(false);
        clearSessionExpoPushTokenCache();
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
          if (__DEV__) console.log("🔄 Token refresh failed, signing out");
          try {
            await supabase.auth.signOut();
          } catch (signOutError) {
            if (__DEV__) console.log("Sign out error during token refresh:", signOutError);
          }
          setUser(null);
          setAuthLoading(false);
          clearSessionExpoPushTokenCache();
          await checkFirstTime(null);
          return;
        }

        setUser(session?.user ?? null);
        setAuthLoading(false);

        if (event === "SIGNED_IN" && session?.user) {
          // User signed in - handleLoginSuccess will manage the profile check
          if (__DEV__) {
            console.log(
              "🔐 SIGNED_IN event detected, but handleLoginSuccess will manage profile check"
            );
          }
          setUser(session.user);
        } else if (event === "SIGNED_OUT") {
          clearSessionExpoPushTokenCache();
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
      if (__DEV__) console.error("Auth initialization error:", error);
      setAuthLoading(false);
    }
  };

  const handleSplashFinish = useCallback(() => {
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
  }, [fadeOverlayAnim]);

  // Authentication handlers
  const handleLoginSuccess = useCallback(async (user) => {
    if (__DEV__) console.log("🔐 handleLoginSuccess called for user:", user.id);
    setUser(user);
    setShowAuth(false);
    setAuthLoading(true); // Keep loading state while checking profile

    // Add a small delay to ensure OAuth profile creation is complete
    await new Promise((resolve) => setTimeout(resolve, 1000));

    try {
      if (__DEV__) console.log("🔍 Fetching user profile for user ID:", user.id);
      const profile = await db.getUserProfile(user.id);
      if (__DEV__) console.log("📋 Profile result:", profile ? "Found" : "Not found");

      if (profile) {
        if (__DEV__) console.log("✅ Profile found, setting up user session");
        if (__DEV__) {
          console.log("👤 Profile data:", {
            id: profile.id,
            djName: profile.dj_name || profile.djName,
            email: profile.email,
            hasRequiredFields: !!(profile.dj_name || profile.djName),
          });
        }
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
        if (__DEV__) console.log("🎯 Login successful - navigating to opportunities");
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
        fetchUserLocationRef.current?.(profile);
      } else {
        if (__DEV__) console.log("⚠️ No profile found after OAuth - user needs onboarding");
        if (__DEV__) console.log("🔍 Profile query returned:", profile);
        setIsFirstTime(true);
      }
    } catch (error) {
      if (__DEV__) console.error("❌ Error fetching profile:", error);
      if (__DEV__) {
        console.error("❌ Error details:", {
          message: error.message,
          code: error.code,
          details: error.details,
        });
      }

      // Only show onboarding if the profile truly doesn't exist
      // Error code PGRST116 means "no rows returned" (profile doesn't exist)
      // Other errors (like column doesn't exist) should not trigger onboarding
      if (error.code === "PGRST116" || error.message?.includes("No rows returned")) {
        if (__DEV__) console.log("⚠️ No profile found - user needs onboarding");
        setIsFirstTime(true);
      } else {
        // For other errors (like database schema issues), try to continue with existing user
        // Don't force onboarding - this might be a temporary database issue
        if (__DEV__) console.error("⚠️ Database error fetching profile - this may be a schema issue");
        if (__DEV__) console.error("⚠️ User is authenticated but profile fetch failed - showing error state");
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
  }, [hasShownCompleteProfileModal]);

  const handleSignupSuccess = useCallback(async (user) => {
    setUser(user);
    setShowAuth(false);
    // User will go through onboarding after signup
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await track(AnalyticsEvents.USER_LOGGED_OUT);
      await resetAnalyticsUser();
      await auth.signOut();
      clearScreenCachesForUser(user?.id);
      clearMessageThreadSnapshotsForUser(user?.id);
      clearSessionExpoPushTokenCache();
      setUser(null);
      setShowAuth(true);
      setAuthMode("login");
    } catch (error) {
      if (__DEV__) console.error("Logout error:", error);
      Alert.alert("Error", "Failed to sign out");
    }
  }, [user?.id]);

  const handleEditProfile = useCallback(() => {
    setShowEditProfile(true);
  }, []);

  const handleProfileSaved = useCallback(async (updatedProfile) => {
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
      if (__DEV__) console.error("Error refreshing profile:", error);
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
  }, [user?.id, user?.email]);

  const handleProfileCancel = useCallback(() => {
    setShowEditProfile(false);
  }, []);

  // Fetch user location and check for mismatch with profile city
  // Made non-blocking to prevent app freeze on first load in new countries
  const fetchUserLocation = useCallback(async (profile) => {
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
                  if (__DEV__) console.error("Error checking location match:", matchError);
                });
            }
          }
        })
        .catch((error) => {
          // Silently handle location errors - don't block app initialization
          if (__DEV__) console.warn("⚠️ Location fetch failed (non-blocking):", error.message);
          // Location is optional, app can continue without it
        });
    } catch (error) {
      // Silently handle location errors - don't block app initialization
      if (__DEV__) console.warn("⚠️ Location fetch error (non-blocking):", error.message);
    }
  }, [showCustomModal]);
  fetchUserLocationRef.current = fetchUserLocation;

  const showLogin = useCallback(() => {
    setAuthMode("login");
    setShowAuth(true);
  }, []);

  const showSignup = useCallback(() => {
    setAuthMode("signup");
    setShowAuth(true);
  }, []);

  // Audio functions are provided by useAudioPlayback hook (see `audio` variable above)
  // Forwarding references for backwards compatibility with existing code in this file:
  const {
    playGlobalAudio,
    pauseGlobalAudio,
    resumeGlobalAudio,
    stopGlobalAudio,
    addToQueue,
    addToQueueAndPlay,
    clearQueue,
    playNextTrack,
    shuffleAllMixes,
    shuffleByGenre,
    shuffleBasedOnLikes,
    moveQueueItemUp,
    moveQueueItemDown,
  } = audio;

  const checkFirstTime = async (currentUser = null) => {
    try {
      const userToCheck = currentUser || user;
      if (__DEV__) console.log("🔍 Checking first time for user:", userToCheck?.id);

      // If user is authenticated, they should go straight to home
      // Only show onboarding for unauthenticated users or if no profile exists
      if (userToCheck) {
        // User is signed in, check if they have a profile
        if (__DEV__) console.log("👤 User is authenticated, checking for profile...");
        try {
          const profile = await db.getUserProfile(userToCheck.id);
          if (__DEV__) {
            console.log(
              "📋 Profile lookup result:",
              profile ? "Profile found" : "No profile"
            );
          }

          if (profile) {
            if (__DEV__) console.log("✅ Profile exists, going to home screen");
            if (__DEV__) {
              console.log("👤 Profile data:", {
                djName: profile.dj_name || profile.djName,
                email: profile.email,
                hasRequiredFields: !!(profile.dj_name || profile.djName),
              });
            }
            setDjProfile(profile);
            setIsFirstTime(false); // User has profile, go to home
          } else {
            if (__DEV__) console.log("⚠️ No profile found, showing onboarding");
            setIsFirstTime(true); // User signed in but no profile, needs onboarding
          }
        } catch (error) {
          if (__DEV__) {
            console.log(
              "❌ Error getting profile for authenticated user:",
              error.message
            );
          }
          
          // Only show onboarding if the profile truly doesn't exist
          // Error code PGRST116 means "no rows returned" (profile doesn't exist)
          // Other errors (like column doesn't exist) should not trigger onboarding
          if (error.code === "PGRST116" || error.message?.includes("No rows returned")) {
            if (__DEV__) console.log("📝 No profile found - will show onboarding for profile creation");
            setIsFirstTime(true);
          } else {
            // For other errors (like database schema issues), we still need a profile
            // If we can't get the profile, we can't proceed - show onboarding as fallback
            if (__DEV__) console.error("⚠️ Database error fetching profile - this may be a schema issue");
            if (__DEV__) console.error("⚠️ User is authenticated but profile fetch failed");
            if (__DEV__) console.error("⚠️ Error code:", error.code, "Message:", error.message);
            // If it's a schema error (column doesn't exist), the fallback query should handle it
            // But if that also fails, we need to show onboarding so user can create/update their profile
            if (__DEV__) console.log("⚠️ Will show onboarding to allow profile creation/update");
            setIsFirstTime(true);
          }
        }
      } else {
        if (__DEV__) console.log("🔓 No authenticated user, checking local storage...");
        // No user, check local storage for offline access
        const hasOnboarded = await AsyncStorage.getItem("hasOnboarded");
        const profile = await AsyncStorage.getItem("djProfile");

        setIsFirstTime(!hasOnboarded);
        if (profile) {
          setDjProfile(JSON.parse(profile));
        }
      }
    } catch (error) {
      if (__DEV__) console.error("❌ Error checking onboarding status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMenuNavigation = useCallback(
    (screen, params = {}) => {
      if (__DEV__) console.log("🎯 Navigating to screen:", screen);
      const nextParams = { ...params };
      // Use `currentScreen` state (last committed route), not `currentScreenRef`.
      // The ref is updated in useEffect after paint; tab → Create quickly left ref stale
      // so returnScreen could be "opportunities" while the user was on Listen.
      if (screen === SCREENS.UPLOAD_MIX && nextParams.returnScreen === undefined) {
        if (nextParams.mixId != null) {
          nextParams.returnScreen = SCREENS.PROFILE;
        } else if (currentScreen === SCREENS.UPLOAD_MIX) {
          nextParams.returnScreen = SCREENS.LISTEN;
        } else {
          nextParams.returnScreen = currentScreen;
        }
      }
      setCurrentScreen(screen);
      setScreenParams(nextParams);
      trackScreenView(screen, nextParams);
      if (showMenu) {
        closeMenuRef.current?.();
      }
    },
    [currentScreen, showMenu]
  );

  useEffect(() => {
    setPushNotificationTapHandler(({ type, data }) => {
      const normalizedType = String(type || "").toLowerCase();
      if (
        normalizedType === "application_approved" ||
        normalizedType === "application_rejected" ||
        normalizedType === "application_status"
      ) {
        handleMenuNavigation(SCREENS.OPPORTUNITIES, {
          applicationId: data?.application_id ?? undefined,
        });
        return;
      }

      if (normalizedType.includes("message")) {
        const djId =
          data?.sender_id ??
          data?.senderId ??
          data?.from_user_id ??
          data?.fromUserId ??
          null;
        if (djId) {
          handleMenuNavigation(SCREENS.MESSAGES, {
            djId,
            chatType: "individual",
          });
        } else {
          handleMenuNavigation(SCREENS.MESSAGES_LIST);
        }
        return;
      }

      if (normalizedType.includes("connection")) {
        handleMenuNavigation(SCREENS.NOTIFICATIONS);
      }
    });
    return () => setPushNotificationTapHandler(null);
  }, [handleMenuNavigation]);

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
      if (__DEV__) console.error("Auth check error:", error);
      return null;
    }
  };


  // Menu animation functions
  const finishMenuSwipeDismiss = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const offScreen =
      (Dimensions.get("window")?.height || 600) * 0.45;
    Animated.parallel([
      Animated.timing(menuOpacityAnim, {
        toValue: 0,
        duration: MENU_TIMINGS.closeOverlayMs,
        easing: MENU_EASE.outSoft,
        useNativeDriver: true,
      }),
      Animated.timing(menuDragY, {
        toValue: offScreen,
        duration: MENU_TIMINGS.swipeDismissMs,
        easing: MENU_EASE.in,
        useNativeDriver: false,
      }),
    ]).start(() => {
      setShowMenu(false);
      menuSlideAnim.setValue(0);
      menuDragY.setValue(0);
      menuOpacityAnim.setValue(0);
    });
  }, [menuOpacityAnim, menuDragY, menuSlideAnim]);

  finishMenuSwipeDismissRef.current = finishMenuSwipeDismiss;

  const menuPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          g.dy > 10 && g.dy > Math.abs(g.dx) * 0.65,
        onPanResponderMove: (_, g) => {
          if (g.dy > 0) {
            menuDragY.setValue(g.dy);
          }
        },
        onPanResponderRelease: (_, g) => {
          const shouldClose = g.dy > 110 || g.vy > 1.15;
          if (shouldClose) {
            finishMenuSwipeDismissRef.current();
          } else {
            Animated.spring(menuDragY, {
              toValue: 0,
              useNativeDriver: false,
              friction: 8,
              tension: 72,
              overshootClamping: true,
            }).start();
          }
        },
      }),
    [menuDragY]
  );

  const openMenu = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    menuDragY.setValue(0);
    setShowMenu(true);
    Animated.parallel([
      Animated.timing(menuSlideAnim, {
        toValue: 1,
        duration: MENU_TIMINGS.openSlideMs,
        easing: MENU_EASE.out,
        useNativeDriver: false,
      }),
      Animated.timing(menuOpacityAnim, {
        toValue: 1,
        duration: MENU_TIMINGS.openOverlayMs,
        easing: MENU_EASE.outSoft,
        useNativeDriver: true,
      }),
    ]).start();
  }, [menuSlideAnim, menuOpacityAnim, menuDragY]);

  const closeMenu = useCallback(() => {
    menuDragY.setValue(0);
    if (!showMenu) return;

    menuSlideAnim.stopAnimation();
    menuOpacityAnim.stopAnimation();
    menuDragY.stopAnimation();
    menuDragY.setValue(0);

    Animated.parallel([
      Animated.timing(menuSlideAnim, {
        toValue: 0,
        duration: MENU_TIMINGS.closeSlideMs,
        easing: MENU_EASE.in,
        useNativeDriver: false,
      }),
      Animated.timing(menuOpacityAnim, {
        toValue: 0,
        duration: MENU_TIMINGS.closeOverlayMs,
        easing: MENU_EASE.outSoft,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) {
        setShowMenu(false);
        return;
      }
      setShowMenu(false);
    });
  }, [showMenu, menuSlideAnim, menuOpacityAnim, menuDragY]);
  closeMenuRef.current = closeMenu;

  // Load notification counts
  const loadNotificationCounts = useCallback(async () => {
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
      if (__DEV__) console.error("Error loading notification counts:", error);
    }
  }, []);

  // Set up real-time subscriptions for notifications and opportunities
  useEffect(() => {
    if (!user) return;

    if (__DEV__) {
      console.log(
        "🔔 Setting up real-time notification subscriptions for user:",
        user.id
      );
    }

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
          if (__DEV__) console.log("🔔 New notification received:", payload.new);
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
          if (__DEV__) console.log("🔔 Notification updated:", payload.new);
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
          if (__DEV__) console.log("💬 New message received:", payload.new);
          // Refresh message counts when new message arrives
          loadNotificationCounts();
        }
      )
      .subscribe();

    // Opportunities real-time subscription is now in useOpportunities hook

    return () => {
      if (__DEV__) console.log("Cleaning up real-time subscriptions");
      supabase.removeChannel(notificationChannel);
      supabase.removeChannel(messageChannel);
    };
  }, [user]);

  const completeOnboarding = useCallback(async () => {
    if (__DEV__) console.log("🎉 completeOnboarding called");
    if (__DEV__) console.log("👤 djProfile:", djProfile);

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
      if (__DEV__) {
        console.log("❌ Missing required fields:", {
          djName: !!djName,
          firstName: !!firstName,
          lastName: !!lastName,
          city: !!djProfile.city,
          genres: djProfile.genres?.length || 0,
        });
      }

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
      if (__DEV__) console.log("💾 Saving profile to database...");
      if (__DEV__) console.log("🔑 User ID:", user.id);
      if (__DEV__) console.log("📧 User email:", user.email);

      // Check if profile already exists
      let savedProfile;
      try {
        if (__DEV__) console.log("🔍 Checking if profile exists...");
        savedProfile = await db.getUserProfile(user.id);
        if (__DEV__) console.log("✅ Profile exists, updating...");
        if (__DEV__) console.log("📝 Existing profile:", savedProfile);

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
        if (__DEV__) console.log("📤 Updating with data:", updateData);

        savedProfile = await db.updateUserProfile(user.id, updateData);
        if (__DEV__) console.log("✅ Update complete:", savedProfile);

        // Ensure existing profile has invite code
        try {
          await db.getUserInviteCode(user.id);
        } catch (codeError) {
          if (__DEV__) console.warn("⚠️ Failed to ensure invite code:", codeError);
        }
      } catch (error) {
        if (__DEV__) {
          console.log(
            "🆕 Profile doesn't exist (or error checking):",
            error.message
          );
        }
        if (__DEV__) console.log("🆕 Creating new profile...");

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

        if (__DEV__) console.log("📤 Creating profile with data:", profileData);

        try {
          savedProfile = await db.createUserProfile(profileData);
          if (__DEV__) console.log("✅ Profile created successfully:", savedProfile);

          // Ensure invite code is generated
          try {
            await db.getUserInviteCode(user.id);
          } catch (codeError) {
            if (__DEV__) console.warn("⚠️ Failed to ensure invite code:", codeError);
          }
        } catch (createError) {
          if (__DEV__) console.error("❌ Error creating profile:", createError);
          if (__DEV__) {
            console.error(
              "❌ Error details:",
              JSON.stringify(createError, null, 2)
            );
          }
          throw createError; // Re-throw to be caught by outer try-catch
        }
      }

      if (__DEV__) console.log("✅ Profile saved successfully:", savedProfile);

      // Also save to AsyncStorage for offline access
      await AsyncStorage.setItem("hasOnboarded", "true");
      await AsyncStorage.setItem("djProfile", JSON.stringify(djProfile));
      await AsyncStorage.setItem("userId", user.id);

      if (__DEV__) console.log("🎉 Onboarding completed, setting isFirstTime=false");
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
      if (__DEV__) console.error("❌ Error saving profile:", error);
      showCustomModal({
        type: "error",
        title: "Error",
        message:
          "Failed to save profile. Please check your internet connection and try again.",
        primaryButtonText: "OK",
        onPrimaryPress: () => setShowModal(false),
      });
    }
  }, [djProfile, user?.id, user?.email, showCustomModal]);

  // Fonts will load asynchronously - app continues with system fonts until ready
  // No need to block or log repeatedly

  // Navigate to a user's profile from the audio player
  const handleNavigateToProfile = useCallback((userId) => {
    setCurrentScreen("user-profile");
    setScreenParams({ userId });
  }, []);

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
    return <SafeAreaProvider>{authGateRender}</SafeAreaProvider>;
  }

  const renderScreen = () => (
    <View
      style={[styles.screenContainer, { paddingBottom: anchoredTabBottomPad }]}
    >
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
        opportunities={opp.opportunities}
        currentOpportunityIndex={opp.currentOpportunityIndex}
        dailyApplicationStats={opp.dailyApplicationStats}
        handleOpportunityPress={opp.handleOpportunityPress}
        handleSwipeLeft={opp.handleSwipeLeft}
        handleSwipeRight={opp.handleSwipeRight}
        resetOpportunities={opp.resetOpportunities}
        isLoadingOpportunities={opp.isLoadingOpportunities}
        showSwipeTutorial={opp.showSwipeTutorial}
        handleDismissSwipeTutorial={opp.handleDismissSwipeTutorial}
        loadNotificationCounts={loadNotificationCounts}
        shuffleAllMixes={shuffleAllMixes}
        shuffleByGenre={shuffleByGenre}
        shuffleBasedOnLikes={shuffleBasedOnLikes}
      />
    </View>
  );


  const shouldRenderGlobalAudioUI =
    !!audio.audioState.currentTrack || !!audio.pendingPlayTrack;

  return (
    <SafeAreaProvider>
    <AppTutorialProvider>
    <View style={styles.appRoot}>
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
                      translateY: Animated.add(menuSlideTranslateY, menuDragY),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.menuContent} {...menuPanResponder.panHandlers}>
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
                    activeOpacity={0.85}
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
                    activeOpacity={0.85}
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
                    activeOpacity={0.85}
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
                    activeOpacity={0.85}
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
                    activeOpacity={0.85}
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
                    activeOpacity={0.85}
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
            pointerEvents="none"
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
          visible={audio.audioErrorModal.visible}
          onClose={() => audio.setAudioErrorModal({ visible: false, title: "", message: "" })}
          title={audio.audioErrorModal.title}
          message={audio.audioErrorModal.message}
          type="error"
          primaryButtonText="OK"
          onPrimaryPress={() => audio.setAudioErrorModal({ visible: false, title: "", message: "" })}
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

    </AppShell>

    {shouldRenderGlobalAudioUI ? (
      <GlobalAudioPlayerUI
        currentScreen={currentScreen}
        currentTrack={audio.audioState.currentTrack}
        pendingTrack={audio.pendingPlayTrack}
        onNavigateToProfile={handleNavigateToProfile}
        styles={styles}
        globalAudioRef={audio.globalAudioRef}
      />
    ) : null}
    </View>
    </AppTutorialProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#000000", // Pure black background to match tab bar
  },
  screenContainer: {
    flex: 1,
    position: "relative",
    backgroundColor: "#000000", // Pure black background; dynamic paddingBottom for anchored tab bar
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
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 8,
    paddingHorizontal: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 12,
    backgroundColor: "rgba(0, 0, 0, 0.98)",
  },
  tab: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 6,
    paddingHorizontal: 2,
    alignItems: "center",
    flexDirection: "column",
    gap: 4,
    marginHorizontal: 0,
    backgroundColor: "transparent", // Ensure 0 opacity for all tabs
  },
  activeTab: {
    backgroundColor: "transparent", // Remove background for active tab
  },
  tabText: {
    fontSize: 11,
    lineHeight: 13,
    fontFamily: "Helvetica Neue",
    fontWeight: "500", // Medium weight
    color: "hsl(0, 0%, 70%)", // Muted foreground
    textTransform: "capitalize", // Proper capitalization instead of uppercase
    letterSpacing: 0,
    textAlign: "center",
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
    paddingBottom: 16,
  },
  /** Kept for any legacy reference; hero copy uses RhoodScreenTitleBlock */
  opportunitiesSubtitle: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
    marginBottom: 8,
  },
  dailyApplicationChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 10,
    marginTop: 2,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "hsla(75, 100%, 60%, 0.18)",
    maxWidth: "100%",
  },
  dailyApplicationChipLimited: {
    borderColor: "hsla(0, 100%, 55%, 0.35)",
  },
  dailyApplicationChipText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    lineHeight: 20,
  },
  dailyApplicationNumber: {
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  dailyApplicationRest: {
    color: "hsl(0, 0%, 68%)",
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
    backgroundColor: "rgba(0, 0, 0, 0.72)",
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

  // Global Audio Player — mini bar UI is components/MiniPlayerBar.js (tokens kept here for reference / future use)
  globalAudioPlayer: {
    position: "absolute",
    // left / right / bottom come from GlobalAudioPlayerUI (safe area + tab offset)
    backgroundColor: "hsl(0, 0%, 8%)", // Dark background
    borderRadius: 16,
    paddingVertical: 12, // Compact vertical padding
    paddingHorizontal: 16,
    overflow: "hidden",
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
    backgroundColor: "hsl(0, 0%, 7%)", // Spotify-style canvas (#121212)
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
    pointerEvents: "none",
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
    backgroundColor: "rgba(0, 0, 0, 0.72)",
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
    // Sit just below header bottom border (line) — was 60 and overlapped the rule
    top: 78,
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
