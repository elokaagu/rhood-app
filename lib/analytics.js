import { Mixpanel } from "mixpanel-react-native";
import Constants from "expo-constants";
import { supabase } from "./supabase";

// Firebase Analytics - modular API instance (getAnalytics(getApp()))
let analyticsInstance = null;

// Get Mixpanel token from environment or app config
const getMixpanelToken = () => {
  return (
    process.env.EXPO_PUBLIC_MIXPANEL_TOKEN ||
    Constants?.expoConfig?.extra?.mixpanelToken ||
    null
  );
};

const MIXPANEL_TOKEN = getMixpanelToken();

let mixpanel = null;
let isMixpanelInit = false;
let currentUserId = null;

/**
 * Initialize Firebase Analytics (called after Firebase is properly set up)
 * This will only work in development/production builds with native code, not in Expo Go
 */
export async function initFirebaseAnalytics() {
  console.log("🔍 [GA4] Starting Firebase Analytics initialization...");
  
  // Skip Firebase if native modules aren't available (e.g., Expo Go)
  // Check for React Native's native module bridge
  if (typeof global.nativeCallSyncHook === 'undefined' && typeof require.ensure === 'undefined') {
    console.log("⚠️ [GA4] Firebase Analytics requires native modules - skipping in this environment");
    analyticsInstance = null;
    return false;
  }

  // Use a dynamic import approach that's safer
  // We'll check if the module exists by trying to access NativeModules
  try {
    const { NativeModules } = require('react-native');
    console.log("🔍 [GA4] NativeModules available:", !!NativeModules);
    
    // Check if Firebase native module is actually linked
    if (!NativeModules || !NativeModules.RNFBAppModule) {
      console.log("⚠️ [GA4] Firebase native module not linked - app may need to be rebuilt");
      console.log("🔍 [GA4] Available native modules:", NativeModules ? Object.keys(NativeModules).slice(0, 10) : "none");
      analyticsInstance = null;
      return false;
    }
    console.log("✅ [GA4] RNFBAppModule found");
  } catch (nativeCheckError) {
    // If we can't even check NativeModules, we're probably in Expo Go
    console.log("⚠️ [GA4] Cannot check native modules - Firebase Analytics unavailable:", nativeCheckError?.message);
    analyticsInstance = null;
    return false;
  }

  // Use modular API (getApp, getAnalytics) to avoid deprecation warnings
  try {
    console.log("🔍 [GA4] Attempting to require @react-native-firebase/analytics...");
    const { getApp } = require("@react-native-firebase/app");
    const { getAnalytics, setAnalyticsCollectionEnabled } = require("@react-native-firebase/analytics");

    const app = getApp();
    analyticsInstance = getAnalytics(app);
    if (!analyticsInstance || typeof analyticsInstance.logEvent !== "function") {
      throw new Error("Firebase Analytics instance not properly initialized");
    }
    console.log("✅ [GA4] Firebase Analytics initialized (modular API)");

    if (__DEV__) {
      try {
        await setAnalyticsCollectionEnabled(analyticsInstance, true);
        console.log("✅ [GA4] Analytics collection enabled for debugging");
      } catch (e) {
        console.warn("⚠️ [GA4] Could not enable analytics collection:", e?.message);
      }
    }
    return true;
  } catch (error) {
    console.warn("⚠️ [GA4] Firebase Analytics not available:", error?.message || error);
    analyticsInstance = null;
    return false;
  }
}

/**
 * Initialize analytics (Mixpanel and optionally Firebase GA4)
 * Should be called once when app starts
 */
export async function initAnalytics() {
  try {
    // Initialize Mixpanel if token is available
    // Defer initialization slightly to avoid startup errors
    if (MIXPANEL_TOKEN && !isMixpanelInit) {
      // Use setTimeout to defer initialization and prevent blocking app startup
      setTimeout(() => {
        try {
          console.log("🔍 [Mixpanel] Starting initialization...");
          console.log("🔍 [Mixpanel] Token found:", MIXPANEL_TOKEN.substring(0, 12) + "...");
          
          // Check if Mixpanel is available
          if (!Mixpanel) {
            throw new Error("Mixpanel class not available");
          }
          
          // Initialize Mixpanel: constructor requires (token, trackAutomaticEvents)
          // trackAutomaticEvents: true to match previous behavior
          try {
            mixpanel = new Mixpanel(MIXPANEL_TOKEN, true);
          } catch (constructorError) {
            // If constructor fails, it might be a version mismatch
            console.warn("⚠️ [Mixpanel] Constructor failed:", constructorError?.message || constructorError);
            throw constructorError;
          }
        
        // Verify the instance was created
        if (!mixpanel) {
          throw new Error("Mixpanel instance is null after construction");
        }
        
        // mixpanel-react-native v3.x auto-initializes on construction
        console.log("✅ [Mixpanel] Instance created successfully");
        
        // Configure EU endpoint for EU data residency
        // Call setServerURL after instance creation
        try {
          if (mixpanel && typeof mixpanel.setServerURL === 'function') {
            mixpanel.setServerURL('https://api-eu.mixpanel.com');
            console.log("✅ [Mixpanel] EU endpoint configured: https://api-eu.mixpanel.com");
          }
        } catch (e) {
          console.warn("⚠️ [Mixpanel] Could not set EU endpoint, using default:", e?.message);
        }
        
        // Test that basic methods exist
        if (typeof mixpanel.track !== 'function') {
          throw new Error("Mixpanel track method not available");
        }
        
        isMixpanelInit = true;
        console.log("✅ [Mixpanel] Initialized successfully");
        
        // Send a test event immediately to verify connection
        try {
          mixpanel.track("App Initialized", {
            platform: "react-native",
            timestamp: new Date().toISOString(),
          });
          console.log("✅ [Mixpanel] Test event sent successfully");
        } catch (testError) {
          console.warn("⚠️ [Mixpanel] Failed to send test event:", testError?.message || testError);
          // Don't fail initialization if test event fails
        }
      } catch (error) {
          // Handle Mixpanel initialization errors gracefully
          // Don't crash the app if Mixpanel fails to initialize
          const errorMessage = error?.message || String(error);
          console.warn("⚠️ [Mixpanel] Initialization failed, continuing without Mixpanel:", errorMessage);
          
          // Check if it's the specific trackAutomaticEvents error
          if (errorMessage.includes("trackAutomaticEvents")) {
            console.warn("⚠️ [Mixpanel] This appears to be a version compatibility issue");
            console.warn("⚠️ [Mixpanel] Mixpanel will be disabled for this session");
          }
          
          // Don't set isMixpanelInit to true if initialization failed
          mixpanel = null;
          isMixpanelInit = false;
        }
      }, 100); // Defer by 100ms to let app finish initializing
    } else if (!MIXPANEL_TOKEN) {
      console.warn("⚠️ [Mixpanel] Token not configured!");
      console.warn("⚠️ [Mixpanel] Checked sources:");
      console.warn("   - process.env.EXPO_PUBLIC_MIXPANEL_TOKEN:", !!process.env.EXPO_PUBLIC_MIXPANEL_TOKEN);
      console.warn("   - Constants.expoConfig.extra.mixpanelToken:", !!Constants?.expoConfig?.extra?.mixpanelToken);
    } else {
      console.log("ℹ️ [Mixpanel] Already initialized, skipping");
    }

    // Try to initialize Firebase Analytics (will work after prebuild with config files)
    const firebaseInitResult = await initFirebaseAnalytics();
    if (!firebaseInitResult) {
      console.warn("⚠️ [GA4] Firebase Analytics initialization failed - check logs above for details");
      console.warn("⚠️ [GA4] Common fixes:");
      console.warn("   1. Make sure you've run 'npx expo prebuild' after adding Firebase");
      console.warn("   2. Rebuild the app (not just reload)");
      console.warn("   3. Check that GoogleService-Info.plist exists in ios/ folder");
      console.warn("   4. Verify Firebase is enabled in your Firebase project");
    }

    // Try to hydrate user identity from Supabase
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.warn("⚠️ Supabase getUser error:", error.message);
        return;
      }

      if (user) {
        await setAnalyticsUser(user.id, {
          email: user.email,
        });
      }
    } catch (error) {
      console.warn("⚠️ Error getting user for analytics:", error?.message || error);
    }
  } catch (error) {
    console.warn("⚠️ initAnalytics error:", error?.message || error);
  }
}

/**
 * Set the user id and basic profile on both Mixpanel and GA4
 * @param {string} userId - User ID (typically Supabase auth user ID)
 * @param {object} traits - User properties (email, name, etc.)
 */
export async function setAnalyticsUser(
  userId,
  traits = {}
) {
  currentUserId = userId;

  try {
    // Mixpanel
    if (mixpanel && isMixpanelInit) {
      mixpanel.identify(userId);
      mixpanel.getPeople().set({
        $email: traits.email,
        ...traits,
      });
      console.log("✅ Mixpanel user identified:", userId);
    }

    // GA4 (modular API)
    if (analyticsInstance) {
      const { setUserId, setUserProperties } = require("@react-native-firebase/analytics");
      await setUserId(analyticsInstance, userId);
      if (traits.email) {
        await setUserProperties(analyticsInstance, { email: traits.email });
      }
      console.log("✅ GA4 user identified:", userId);
    }
  } catch (error) {
    console.warn("⚠️ setAnalyticsUser error:", error?.message || error);
  }
}

/**
 * Reset user identity (for logout)
 */
export async function resetAnalyticsUser() {
  try {
    currentUserId = null;

    // Mixpanel
    if (mixpanel && isMixpanelInit) {
      mixpanel.reset();
    }

    // GA4 (modular API)
    if (analyticsInstance) {
      const { resetAnalyticsData } = require("@react-native-firebase/analytics");
      await resetAnalyticsData(analyticsInstance);
      console.log("✅ Analytics user reset");
    }
  } catch (error) {
    console.warn("⚠️ resetAnalyticsUser error:", error?.message || error);
  }
}

/**
 * Generic track() that hits both tools
 * @param {string} eventName - Event name
 * @param {object} properties - Event properties
 */
export async function track(eventName, properties = {}) {
  try {
    // Mixpanel
    if (mixpanel && isMixpanelInit) {
      console.log(`📊 [Mixpanel] Tracking event: "${eventName}"`, properties);
      mixpanel.track(eventName, properties);
      console.log(`✅ [Mixpanel] Event "${eventName}" sent successfully`);
    } else {
      console.warn(`⚠️ [Mixpanel] Not initialized - event "${eventName}" not sent`);
      console.warn(`⚠️ [Mixpanel] mixpanel:`, !!mixpanel, "isMixpanelInit:", isMixpanelInit);
    }

    // GA4 (modular API; event name snake_case, max 40 chars)
    if (analyticsInstance) {
      const { logEvent } = require("@react-native-firebase/analytics");
      const safeName = eventName
        .replace(/\s+/g, "_")
        .toLowerCase()
        .substring(0, 40);
      console.log(`📊 [GA4] Tracking event: ${safeName}`, properties);
      await logEvent(analyticsInstance, safeName, properties);
      console.log(`✅ [GA4] Event tracked: ${safeName}`);
    } else {
      console.warn(`⚠️ [GA4] Analytics not initialized - event "${eventName}" not sent to GA4`);
    }
  } catch (error) {
    console.warn("⚠️ [GA4] track error:", error?.message || error);
  }
}

/**
 * Track screen view
 * @param {string} screenName - Screen name
 * @param {object} properties - Additional properties
 */
export async function trackScreenView(screenName, properties = {}) {
  try {
    // Mixpanel
    if (mixpanel && isMixpanelInit) {
      mixpanel.track("Screen Viewed", {
        screen_name: screenName,
        ...properties,
      });
    }

    // GA4 (modular API)
    if (analyticsInstance) {
      const { logScreenView } = require("@react-native-firebase/analytics");
      console.log(`📊 [GA4] Tracking screen view: ${screenName}`, properties);
      await logScreenView(analyticsInstance, {
        screen_name: screenName,
        screen_class: screenName,
        ...properties,
      });
      console.log(`✅ [GA4] Screen view tracked: ${screenName}`);
    } else {
      console.warn(`⚠️ [GA4] Analytics not initialized - screen view "${screenName}" not sent to GA4`);
    }
  } catch (error) {
    console.warn("⚠️ [GA4] trackScreenView error:", error?.message || error);
  }
}

/**
 * Debug function to check Firebase Analytics status
 * Call this from your app to see if Firebase is working
 */
export function getAnalyticsStatus() {
  return {
    firebaseInitialized: !!analyticsInstance,
    mixpanelInitialized: isMixpanelInit,
    currentUserId: currentUserId,
    canTrackEvents: !!analyticsInstance,
  };
}

/**
 * Convenience helpers for common R/HOOD events
 */
export const AnalyticsEvents = {
  APP_OPEN: "App Open",
  USER_SIGNED_UP: "User Signed Up",
  USER_LOGGED_IN: "User Logged In",
  USER_LOGGED_OUT: "User Logged Out",
  AUDIO_ID_UPLOADED: "AudioID Uploaded",
  PROFILE_COMPLETED: "Profile Completed",
  PROFILE_UPDATED: "Profile Updated",
  SWIPE_RIGHT: "Swipe Right",
  SWIPE_LEFT: "Swipe Left",
  OPPORTUNITY_VIEWED: "Opportunity Viewed",
  OPPORTUNITY_APPLIED: "Opportunity Applied",
  OPPORTUNITY_MATCHED: "Opportunity Matched",
  OPPORTUNITY_BOOKED: "Opportunity Booked",
  DM_SENT: "DM Sent",
  CONNECTION_REQUESTED: "Connection Requested",
  CONNECTION_ACCEPTED: "Connection Accepted",
  MIX_UPLOADED: "Mix Uploaded",
  MIX_PLAYED: "Mix Played",
  HELP_CHAT_MESSAGE: "Help Chat Message",
  LOCATION_FETCHED: "Location Fetched",
  LOCATION_MISMATCH: "Location Mismatch",
};

