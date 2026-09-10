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
  InteractionManager,
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
import ErrorBoundary from "./components/ErrorBoundary";
import { reportCrash } from "./lib/crashReporter";
import styles from "./App.styles";
import EditProfileScreen from "./components/EditProfileScreen";
import AuthGate from "./components/AuthGate";
import { db, auth, supabase } from "./lib/supabase";
import {
  consumePendingInviteCode,
  profileWithInviteCodeUsed,
  readPendingInviteCode,
} from "./lib/pendingInvite";
import { normalizeMembershipStatus } from "./lib/membership";
import { parseBookingRequestDeepLink } from "./lib/appDeepLinks";
import { getUserFriendlyError } from "./lib/errorMessages";
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
import RootNativeStack from "./navigation/RootNativeStack";
import { navigateApp } from "./navigation/navigationRef";
import {
  SCREENS,
  TAB_BAR_HIDDEN_SCREEN_IDS,
  ANCHORED_TAB_BAR_CONTENT_HEIGHT,
  isTabScreen,
} from "./navigation/routes";
import {
  registerForPushNotifications,
  setupNotificationListeners,
  setPushNotificationTapHandler,
  clearSessionExpoPushTokenCache,
  unregisterPushNotifications,
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
  setAnalyticsScreen,
  startAnalyticsSession,
  endAnalyticsSession,
  AnalyticsEvents,
} from "./lib/analytics";
import { requestAppTrackingIfNeeded } from "./lib/trackingPermission";
import GlobalAudioPlayerUI from "./components/GlobalAudioPlayerUI";
import { AppTutorialProvider, tutorialContextRef } from "./context/AppTutorialContext";
import { APP_TUTORIAL_SCREEN_IDS } from "./lib/appTutorialContent";
import useAudioPlayback from "./hooks/useAudioPlayback";
import useOpportunities from "./hooks/useOpportunities";
import useMixUploadReminder from "./hooks/useMixUploadReminder";

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

/**
 * A `user_profiles` row existing is not the same as onboarding being done.
 * Google-OAuth signup and email/password auto-confirm signup both create a
 * near-empty row (id, email, dj_name from OAuth metadata if any) *before*
 * OnboardingForm ever runs — if the app is killed mid-onboarding, that row
 * is all a relaunch has to go on. Genres are a required, validated step
 * (completeOnboarding refuses to save without at least one), so a non-empty
 * genres array is a reliable signal the row was actually written by
 * completeOnboarding rather than just seeded at signup.
 */
function isOnboardingProfileComplete(profile) {
  return Array.isArray(profile?.genres) && profile.genres.length > 0;
}

function membershipStatusFromProfile(profile) {
  return normalizeMembershipStatus(profile?.membership_status);
}

function isMissingProfileError(error) {
  return (
    error?.code === "PGRST116" ||
    error?.message?.includes("No rows returned") ||
    error?.message?.includes("JSON object requested, multiple (or no) rows returned")
  );
}

function mergeOnboardingProfile(profile) {
  return {
    djName: "",
    firstName: "",
    lastName: "",
    instagram: "",
    soundcloud: "",
    tiktok: "",
    youtube: "",
    city: "",
    genres: [],
    ...profile,
    genres: Array.isArray(profile?.genres) ? profile.genres : [],
  };
}

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
  const appStateRef = useRef(AppState.currentState);
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
  const [membershipStatus, setMembershipStatus] = useState("approved");
  const [isLoading, setIsLoading] = useState(true);

  const [currentScreen, setCurrentScreen] = useState("opportunities");
  const [screenParams, setScreenParams] = useState({});
  const [lastTabScreen, setLastTabScreen] = useState(SCREENS.OPPORTUNITIES);

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
  // True while a password-reset deep link's recovery session is active.
  // AuthGate otherwise decides OnboardingForm vs. the main app purely from
  // `user` + `isFirstTime` — a recovery session sets `user`, so an account
  // that never finished onboarding (isFirstTime still true, e.g. a fresh
  // install/second device — exactly when someone is likely to be resetting
  // a password) got dropped into onboarding instead of ResetPasswordScreen,
  // with no way to actually reach it. See AuthGate.js's needsOnboarding.
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  // Audio playback (all audio logic extracted into dedicated hook)
  const audio = useAudioPlayback({ user });

  // Initialize notification setup for lock screen audio controls
  useEffect(() => {
    let audioNotifSubscription = null;

    const initializeNotifications = async () => {
      try {
        // Permissions and category registration are independent — run together
        await Promise.all([
          requestNotificationPermissions(),
          setupAudioNotificationCategories(),
        ]);
        audioNotifSubscription = setupAudioNotificationListeners();
        await lockScreenControls.initialize();

        if (__DEV__) console.log("✅ Lock screen audio controls initialized");
      } catch (error) {
        if (__DEV__) console.error("❌ Error initializing notifications:", error);
      }
    };

    initializeNotifications();

    // ATT first, then analytics (no IDFA / replay if the user declines).
    (async () => {
      const trackingAllowed = await requestAppTrackingIfNeeded();
      await initAnalytics({ trackingAllowed });
      await Promise.all([
        track(AnalyticsEvents.APP_OPEN),
        startAnalyticsSession({ source: "app_open" }),
      ]);
    })();

    return () => {
      audioNotifSubscription?.remove?.();
    };
  }, []);

  // Track screen views when screen changes; keep ref in sync for menu navigation callbacks
  useEffect(() => {
    currentScreenRef.current = currentScreen;
    if (currentScreen && user) {
      setAnalyticsScreen(currentScreen, screenParams);
    }
    // user?.id, not user — Supabase hands out a new `user` object reference
    // on every TOKEN_REFRESHED event (~hourly) even when the id hasn't
    // changed. Depending on the full object re-fired this effect on every
    // background refresh, double-logging a "Screen Viewed" event and
    // resetting the active-screen-time timer for whatever screen was
    // already open. Other effects in this file were already fixed for the
    // same reason — this one was missed.
  }, [currentScreen, user?.id]);

  useEffect(() => {
    if (isTabScreen(currentScreen)) {
      setLastTabScreen(currentScreen);
    }
    navigateApp(currentScreen, screenParams);
  }, [currentScreen, screenParams]);

  // Complete profile modal state
  const [showCompleteProfileModal, setShowCompleteProfileModal] =
    useState(false);
  const [hasShownCompleteProfileModal, setHasShownCompleteProfileModal] =
    useState(false);

  // Both sign-out paths (this file's handleLogout, ScreenRouter's
  // handleSignOut) null out `user` but never reset these — a modal
  // scheduled (up to ~7.5s of backoff) but not yet shown/dismissed before
  // sign-out left `true` sitting in state, so the very next person to reach
  // the authenticated screen (this user signing back in, or a different
  // user on a shared/handed-down device) would see "Complete Your Profile"
  // pop up immediately, bypassing the actual gate that's supposed to
  // control it (profile_image_url + hasShownCompleteProfileModal, only
  // checked inside handleLoginSuccess/completeOnboarding, not here).
  useEffect(() => {
    if (!user) {
      setShowCompleteProfileModal(false);
      setHasShownCompleteProfileModal(false);
    }
  }, [user]);

  // Location state
  const [userLocation, setUserLocation] = useState(null);
  const [locationMismatchWarning, setLocationMismatchWarning] = useState(false);

  const [inAppNotification, setInAppNotification] = useState(null);
  const inAppNotificationAnim = useRef(new Animated.Value(0)).current;
  // Guards the auto-dismiss timer: without these, a second toast arriving
  // while the first's 5s timer is still pending got force-dismissed early by
  // that stale timer, since neither an id check nor a cleared prior timeout
  // existed.
  const inAppNotificationTimeoutRef = useRef(null);
  const inAppNotificationIdRef = useRef(null);

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
    isFirstTime,
  });

  // Nudges users with zero uploaded mixes to upload one (own modal —
  // see hooks/useMixUploadReminder.js for why it's not on showCustomModal).
  // Passes showCompleteProfileModal so it can back off the same way it
  // already backs off the Opportunities tutorial tip — both are first-run
  // popups that can otherwise land in the same window after onboarding and
  // stack two native Modals at once.
  const mixReminder = useMixUploadReminder({
    user,
    isFirstTime,
    otherModalActive: showCompleteProfileModal,
  });

  const [djProfile, setDjProfile] = useState({
    djName: "",
    firstName: "",
    lastName: "",
    instagram: "",
    soundcloud: "",
    tiktok: "",
    youtube: "",
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

    // initializeAuth is async and resolves its onAuthStateChange unsubscribe
    // function — without capturing it here, that cleanup was discarded, so
    // any remount (Fast Refresh, an error-boundary reset) leaked a duplicate
    // auth-state listener stacking on top of the previous one.
    let authCleanup;
    initializeAuth().then((cleanup) => {
      authCleanup = cleanup;
    });

    // Handle deep links for password reset
    const handleDeepLink = async (url) => {
      if (!url) return;
      
      if (__DEV__) console.log("🔗 Deep link received:", url);
      
      try {
        const bookingRequestId = parseBookingRequestDeepLink(url);
        if (bookingRequestId) {
          setCurrentScreen(SCREENS.PROFILE);
          setScreenParams((prev) => ({
            ...prev,
            openBookingRequestId: bookingRequestId,
          }));
          return;
        }

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
              setIsPasswordRecovery(true);
              setCurrentScreen("reset-password");
            }
          } else {
            // No hash - might be opening the screen directly
            // Check if there's an active recovery session
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              if (__DEV__) console.log("✅ Active session found, showing reset password screen");
              setShowAuth(false);
              setIsPasswordRecovery(true);
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
            setIsPasswordRecovery(true);
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
      authCleanup?.();
    };
  }, []);

  // Load notification counts when user changes
  useEffect(() => {
    if (user) {
      loadNotificationCounts();
    }
    // user?.id, not user: Supabase reconstructs a new user object on every
    // TOKEN_REFRESHED event (roughly hourly), which was refetching counts
    // on every background token refresh, not just actual sign-in/out.
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return undefined;
    let channel;
    let cancelled = false;
    (async () => {
      channel = supabase
        .channel(`membership_${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "user_profiles",
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            if (cancelled) return;
            const next = membershipStatusFromProfile(payload.new);
            setMembershipStatus(next);
          }
        )
        .subscribe();
    })();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [user?.id]);


  // Refresh notification counts when app becomes active
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (
        previousState.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        void startAnalyticsSession({ source: "app_foreground" });
      } else if (
        previousState === "active" &&
        nextAppState.match(/inactive|background/)
      ) {
        void endAnalyticsSession("app_background");
      }

      if (nextAppState === "active" && user) {
        loadNotificationCounts();
        db.getUserProfile(user.id)
          .then((profile) => {
            if (profile) {
              setMembershipStatus(membershipStatusFromProfile(profile));
            }
          })
          .catch(() => {});
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => subscription?.remove();
    // user?.id: avoids tearing down and re-subscribing this listener on
    // every background token refresh (Supabase issues a new user object on
    // TOKEN_REFRESHED, not just sign-in/out).
  }, [user?.id]);

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
            tiktok: "",
            youtube: "",
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

  // Pre-populate djProfile from Supabase user_metadata (OAuth users only).
  // Called when login/signup finds no existing profile and routes to onboarding,
  // so fields are already filled when the user lands on the first onboarding step.
  const _seedDjProfileFromMeta = useCallback((user) => {
    const meta = user?.user_metadata || {};
    const firstName = meta.given_name || meta.first_name || "";
    const lastName = meta.family_name || meta.last_name || "";
    const djName = meta.full_name || meta.name || [firstName, lastName].filter(Boolean).join(" ");
    if (djName || firstName || lastName) {
      setDjProfile((prev) => ({
        ...prev,
        dj_name: djName,
        first_name: firstName,
        last_name: lastName,
      }));
    }
  }, []);

  // Authentication handlers
  const handleLoginSuccess = useCallback(async (user) => {
    if (__DEV__) console.log("🔐 handleLoginSuccess called for user:", user.id);
    setUser(user);
    setShowAuth(false);
    setAuthLoading(true); // Keep loading state while checking profile

    try {
      if (__DEV__) console.log("🔍 Fetching user profile for user ID:", user.id);
      // OAuth profile creation can lag slightly behind the session; retry on
      // "no rows" instead of always sleeping so normal logins stay fast.
      // getUserProfile throws PGRST116 when the row doesn't exist yet.
      let profile = null;
      for (let attempt = 0; attempt < 4; attempt++) {
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
        try {
          profile = await db.getUserProfile(user.id);
          break;
        } catch (err) {
          const profileMissing =
            err.code === "PGRST116" ||
            err.message?.includes("No rows returned");
          if (!profileMissing || attempt === 3) throw err;
        }
      }
      if (__DEV__) console.log("📋 Profile result:", profile ? "Found" : "Not found");

      if (profile && isOnboardingProfileComplete(profile)) {
        if (__DEV__) console.log("✅ Profile found, setting up user session");
        if (__DEV__) {
          console.log("👤 Profile data:", {
            id: profile.id,
            djName: profile.dj_name || profile.djName,
            email: profile.email,
            hasRequiredFields: !!(profile.dj_name || profile.djName),
          });
        }
        setDjProfile(mergeOnboardingProfile(profile));
        setIsFirstTime(false);
        setMembershipStatus(membershipStatusFromProfile(profile));
        await setAnalyticsUser(user.id, {
          dj_name: profile.dj_name || profile.djName,
          name: profile.dj_name || profile.djName,
          city: profile.city,
        });
        await track(AnalyticsEvents.USER_LOGGED_IN, {
          method: "oauth",
        });

        if (membershipStatusFromProfile(profile) !== "approved") {
          return;
        }

        // For login flow, always go to opportunities page
        if (__DEV__) console.log("🎯 Login successful - navigating to opportunities");
        setCurrentScreen("opportunities");
        await setAnalyticsScreen("opportunities");

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
        if (__DEV__) {
          console.log(
            profile
              ? "⚠️ Profile row exists but onboarding never finished (no genres) — resuming onboarding"
              : "⚠️ No profile found after OAuth - user needs onboarding"
          );
        }
        setIsFirstTime(true);
        // Prefer whatever the incomplete row already has (e.g. dj_name
        // saved partway through a prior attempt) over re-seeding from
        // OAuth metadata alone.
        if (profile) setDjProfile(mergeOnboardingProfile(profile));
        else _seedDjProfileFromMeta(user);
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
        _seedDjProfileFromMeta(user);
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

  const handleSignupSuccess = useCallback(async (user, profileData = null) => {
    setUser(user);
    setShowAuth(false);
    // Seed the onboarding profile with whatever was already captured at signup
    // (DJ name / first / last / city). Onboarding then only asks for what's
    // still missing — no duplicate questions for email signups.
    if (profileData) {
      // Auto-fill dj_name from real name when it wasn't explicitly set (email
      // signups). This prevents the onboarding "DJ Name" field from appearing
      // blank immediately after the user just typed their name at signup.
      const autoName = [profileData.first_name, profileData.last_name]
        .filter(Boolean)
        .join(" ");
      setDjProfile((prev) => ({
        ...prev,
        dj_name: profileData.dj_name || autoName,
        first_name: profileData.first_name || "",
        last_name: profileData.last_name || "",
        city: profileData.city || "",
      }));
    }
    // User will go through onboarding (genres/social/photo) after signup
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await endAnalyticsSession("logout");
      await track(AnalyticsEvents.USER_LOGGED_OUT);
      await resetAnalyticsUser();
      // Must run before signOut() — it needs the still-live session to know
      // whose token to remove. Without this, a shared/handed-down device
      // keeps this user's token registered and would keep receiving their
      // pushes after they've signed out.
      await unregisterPushNotifications();
      await auth.signOut();
      clearScreenCachesForUser(user?.id);
      clearMessageThreadSnapshotsForUser(user?.id);
      clearSessionExpoPushTokenCache();
      setUser(null);
      setShowAuth(true);
      setAuthMode("login");
      setIsFirstTime(true);
      setMembershipStatus("approved");
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
            dj_name: refreshedProfile.dj_name,
            name: refreshedProfile.dj_name,
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
        tiktok: updatedProfile.tiktok || "",
        youtube: updatedProfile.youtube || "",
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
        tiktok: updatedProfile.tiktok || "",
        youtube: updatedProfile.youtube || "",
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

          if (profile && isOnboardingProfileComplete(profile)) {
            if (__DEV__) console.log("✅ Profile exists, going to home screen");
            if (__DEV__) {
              console.log("👤 Profile data:", {
                djName: profile.dj_name || profile.djName,
                email: profile.email,
                hasRequiredFields: !!(profile.dj_name || profile.djName),
              });
            }
            setDjProfile(mergeOnboardingProfile(profile));
            setIsFirstTime(false); // User has profile, go to home
            setMembershipStatus(membershipStatusFromProfile(profile));
          } else {
            if (__DEV__) {
              console.log(
                profile
                  ? "⚠️ Profile row exists but onboarding never finished (no genres) — resuming onboarding"
                  : "⚠️ No profile found, showing onboarding"
              );
            }
            // Seed whatever the skeleton row already has (e.g. dj_name from
            // OAuth) so a resumed OnboardingForm isn't blank.
            if (profile) setDjProfile(mergeOnboardingProfile(profile));
            setIsFirstTime(true); // User signed in but onboarding incomplete
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
      // Tips/About are opened from the hamburger menu, reachable from every
      // screen — hardcoding their back target meant "back" always landed on
      // Profile/Opportunities regardless of where the menu was opened from.
      if (
        (screen === SCREENS.TIPS || screen === SCREENS.ABOUT) &&
        nextParams.returnScreen === undefined
      ) {
        nextParams.returnScreen = currentScreen;
      }
      setCurrentScreen(screen);
      setScreenParams(nextParams);
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

      const bookingRequestId =
        data?.booking_request_id ||
        data?.bookingRequestId ||
        (normalizedType.includes("booking")
          ? data?.application_id || data?.id
          : null);
      if (bookingRequestId) {
        handleMenuNavigation(SCREENS.PROFILE, {
          openBookingRequestId: String(bookingRequestId),
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
        return;
      }

      if (
        normalizedType === "opportunity_digest" ||
        normalizedType.includes("opportunity")
      ) {
        handleMenuNavigation(SCREENS.OPPORTUNITIES);
        return;
      }

      if (normalizedType === "mix_like" || normalizedType.includes("like")) {
        // Open the owner's profile where their mixes (and like counts) live.
        handleMenuNavigation(SCREENS.PROFILE);
        return;
      }

      if (normalizedType === "daily_nudge") {
        handleMenuNavigation(SCREENS.LISTEN);
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

          // Cancel any pending dismiss from a still-showing toast — without
          // this, a second notification arriving within 5s of the first got
          // force-dismissed early by the first toast's original timer.
          if (inAppNotificationTimeoutRef.current) {
            clearTimeout(inAppNotificationTimeoutRef.current);
          }
          inAppNotificationIdRef.current = newNotification.id;

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
          inAppNotificationTimeoutRef.current = setTimeout(() => {
            // Only dismiss if this is still the toast that's showing — a
            // newer notification's own timer owns the dismissal otherwise.
            if (inAppNotificationIdRef.current !== newNotification.id) return;
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
    // user?.id: both channels were being torn down and recreated on every
    // background token refresh (Supabase issues a new user object on
    // TOKEN_REFRESHED, not just sign-in/out) even though the subscription
    // itself never needed to change.
  }, [user?.id]);

  /**
   * Shows the Complete Profile modal, backing off while the Opportunities
   * tutorial tip is still on screen. Both are first-run UI that can otherwise
   * land in the same ~1.5s window after onboarding; a full-screen modal
   * popping up mid-tap on the tutorial's "Got it" button eats that tap,
   * which reads as the app freezing. Capped so a user who never dismisses
   * the tip still sees this eventually.
   */
  const scheduleCompleteProfileModal = useCallback((attempt = 0) => {
    const MAX_ATTEMPTS = 6; // ~6s of backoff before showing regardless
    const ctx = tutorialContextRef.current;
    const tipShowing =
      ctx?.enabled && !ctx?.dismissed?.[APP_TUTORIAL_SCREEN_IDS.OPPORTUNITIES];
    if (tipShowing && attempt < MAX_ATTEMPTS) {
      setTimeout(() => scheduleCompleteProfileModal(attempt + 1), 1000);
      return;
    }
    setShowCompleteProfileModal(true);
  }, []);

  const completeOnboarding = useCallback(async () => {
    if (__DEV__) console.log("🎉 completeOnboarding called");
    if (__DEV__) console.log("👤 djProfile:", djProfile);

    const firstName = djProfile.first_name || djProfile.firstName || "";
    const lastName = djProfile.last_name || djProfile.lastName || "";
    const djName =
      djProfile.dj_name?.trim() ||
      djProfile.djName?.trim() ||
      [firstName, lastName].filter(Boolean).join(" ") ||
      (user?.email?.split("@")[0] ?? "DJ");
    const genres = Array.isArray(djProfile.genres) ? djProfile.genres : [];

    if (genres.length === 0) {
      showCustomModal({
        type: "error",
        title: "Pick your genres",
        message: "Please select at least one genre before continuing.",
        primaryButtonText: "OK",
        onPrimaryPress: () => setShowModal(false),
      });
      return;
    }

    const profilePayload = {
      dj_name: djName,
      first_name: firstName,
      last_name: lastName,
      instagram: djProfile.instagram || null,
      soundcloud: djProfile.soundcloud || null,
      tiktok: djProfile.tiktok || null,
      youtube: djProfile.youtube || null,
      city: djProfile.city?.trim() || null,
      genres,
      bio: djProfile.city?.trim()
        ? `DJ from ${djProfile.city} specializing in ${genres.join(", ")}`
        : `DJ specializing in ${genres.join(", ")}`,
      profile_image_url: djProfile.profile_image_url || null,
    };

    try {
      if (!user?.id) {
        throw new Error("You need to be signed in to finish setup.");
      }

      let existingById = null;
      try {
        existingById = await db.getUserProfile(user.id);
      } catch (lookupError) {
        if (!isMissingProfileError(lookupError)) {
          throw lookupError;
        }
      }

      const pendingCode = await readPendingInviteCode();
      let savedProfile;
      if (existingById) {
        savedProfile = await db.updateUserProfile(user.id, profilePayload);
        if (!savedProfile) {
          throw new Error("Couldn't save your profile. Please try again.");
        }
      } else {
        try {
          savedProfile = await db.createUserProfile(
            profileWithInviteCodeUsed(
              {
                ...profilePayload,
                id: user.id,
                email: user.email,
              },
              pendingCode
            )
          );
        } catch (createError) {
          const claimed = await db.claimImportedProfile().catch(() => null);
          if (claimed?.id === user.id) {
            savedProfile = await db.updateUserProfile(user.id, profilePayload);
          } else {
            throw createError;
          }
        }
      }

      try {
        await db.getUserInviteCode(user.id);
      } catch (codeError) {
        if (__DEV__) console.warn("⚠️ Failed to ensure invite code:", codeError);
      }

      try {
        await consumePendingInviteCode((code) =>
          db.processReferral(code, user.id)
        );
      } catch (referralError) {
        if (__DEV__) {
          console.warn("Pending invite processing failed:", referralError);
        }
      }
      const nextMembership = await db.applyDjInviteAccess(
        pendingCode,
        user.id
      );
      setMembershipStatus(nextMembership);

      await AsyncStorage.setItem("hasOnboarded", "true");
      await AsyncStorage.setItem("djProfile", JSON.stringify(djProfile));
      await AsyncStorage.setItem("userId", user.id);

      setIsFirstTime(false);
      if (nextMembership !== "approved") {
        return;
      }

      setCurrentScreen("opportunities");

      InteractionManager.runAfterInteractions(() => {
        const ctx = tutorialContextRef.current;
        if (!ctx) return;
        ctx.enableFresh?.()?.catch?.(() => {});
      });

      if (!savedProfile?.profile_image_url) {
        setTimeout(() => scheduleCompleteProfileModal(), 1500);
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
        title: "Couldn't finish setup",
        message: getUserFriendlyError(
          error,
          "Failed to save profile. Please check your internet connection and try again."
        ),
        primaryButtonText: "OK",
        onPrimaryPress: () => setShowModal(false),
      });
    }
  }, [djProfile, user?.id, user?.email, showCustomModal, scheduleCompleteProfileModal]);

  // Fonts will load asynchronously - app continues with system fonts until ready
  // No need to block or log repeatedly

  // Navigate to a user's profile from the audio player. Sets returnScreen
  // explicitly — ScreenRouter's USER_PROFILE case falls back to Connections
  // when it's missing, which is wrong here: the mini player is reachable
  // from anywhere (Opportunities, Listen, Settings, ...), so "Back" should
  // return there, not always land on Connections.
  const handleNavigateToProfile = useCallback(
    (userId) => {
      setCurrentScreen("user-profile");
      setScreenParams({ userId, returnScreen: currentScreen });
    },
    [currentScreen]
  );

  // Auth gate: splash, auth loading, login/signup, onboarding, profile loading
  const authGateRender = AuthGate({
    showSplash,
    onSplashFinish: handleSplashFinish,
    authLoading,
    isLoading,
    user,
    isFirstTime,
    isPasswordRecovery,
    authMode,
    djProfile,
    setDjProfile,
    onLoginSuccess: handleLoginSuccess,
    onSignupSuccess: handleSignupSuccess,
    onSwitchToSignup: showSignup,
    onSwitchToLogin: showLogin,
    onOnboardingComplete: completeOnboarding,
    onSignOut: handleLogout,
    membershipStatus,
    styles,
  });
  if (authGateRender !== null) {
    return (
      <SafeAreaProvider>
        <ErrorBoundary onError={reportCrash}>
        {authGateRender}
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
        />
        </ErrorBoundary>
      </SafeAreaProvider>
    );
  }

  const renderScreen = () => (
    <View
      style={[styles.screenContainer, { paddingBottom: anchoredTabBottomPad }]}
    >
      <RootNativeStack
        screen={currentScreen}
        tabScreen={isTabScreen(currentScreen) ? currentScreen : lastTabScreen}
        onNativeRouteChange={(name) => {
          if (name && name !== currentScreenRef.current) {
            setCurrentScreen(name);
          }
        }}
        routerProps={{
        screenParams,
        styles,
        user,
        setCurrentScreen,
        setScreenParams,
        setUser,
        setIsFirstTime,
        setIsPasswordRecovery,
        setDjProfile,
        setShowAuth,
        setAuthMode,
        playGlobalAudio,
        pauseGlobalAudio,
        resumeGlobalAudio,
        stopGlobalAudio,
        addToQueue,
        playNextTrack,
        clearQueue,
        opportunities: opp.opportunities,
        currentOpportunityIndex: opp.currentOpportunityIndex,
        dailyApplicationStats: opp.dailyApplicationStats,
        handleOpportunityPress: opp.handleOpportunityPress,
        handleSwipeLeft: opp.handleSwipeLeft,
        handleSwipeRight: opp.handleSwipeRight,
        resetOpportunities: opp.resetOpportunities,
        isLoadingOpportunities: opp.isLoadingOpportunities,
        showSwipeTutorial: opp.showSwipeTutorial,
        handleDismissSwipeTutorial: opp.handleDismissSwipeTutorial,
        loadNotificationCounts,
        shuffleAllMixes,
        shuffleByGenre,
        shuffleBasedOnLikes,
        }}
      />
    </View>
  );


  const shouldRenderGlobalAudioUI =
    !!audio.audioState.currentTrack || !!audio.pendingPlayTrack;

  return (
    <SafeAreaProvider>
    <ErrorBoundary onError={reportCrash}>
    <AppTutorialProvider activeScreenId={currentScreen}>
    <View style={styles.appRoot}>
    <AppShell
      currentScreen={currentScreen}
      onOpenMenu={openMenu}
      onTabPress={handleMenuNavigation}
      unreadNotificationCount={unreadNotificationCount}
      styles={styles}
      chromeDisabled={!!opp.showSwipeTutorial}
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
                      currentScreen === "tips" && styles.menuItemActive,
                    ]}
                    onPress={() => handleMenuNavigation("tips")}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name="bulb-outline"
                      size={24}
                      color="hsl(75, 100%, 60%)"
                    />
                    <View style={styles.menuItemContent}>
                      <Text style={styles.menuItemText}>Tips</Text>
                      <Text style={styles.menuItemDescription}>
                        Guides to grow your DJ career
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

        {/* Upload Your First Mix Reminder */}
        <RhoodModal
          visible={mixReminder.visible}
          onClose={mixReminder.snoozeAndClose}
          title="Upload Your First Mix"
          message="DJs with a mix uploaded get noticed faster — add yours so brands and promoters can hear what you can do."
          type="info"
          primaryButtonText="Upload a Mix"
          secondaryButtonText="Maybe Later"
          onPrimaryPress={() => {
            mixReminder.dismissForever();
            setCurrentScreen(SCREENS.UPLOAD_MIX);
          }}
          onSecondaryPress={mixReminder.snoozeAndClose}
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
                if (inAppNotificationTimeoutRef.current) {
                  clearTimeout(inAppNotificationTimeoutRef.current);
                  inAppNotificationTimeoutRef.current = null;
                }
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
    </ErrorBoundary>
    </SafeAreaProvider>
  );
}
