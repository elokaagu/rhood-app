import { Mixpanel } from "mixpanel-react-native";
import Constants from "expo-constants";
import { supabase } from "./supabase";

// Firebase Analytics - will be initialized after proper setup
let analytics = null;

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
export function initFirebaseAnalytics() {
  console.log("🔍 [GA4] Starting Firebase Analytics initialization...");
  
  // Skip Firebase if native modules aren't available (e.g., Expo Go)
  // Check for React Native's native module bridge
  if (typeof global.nativeCallSyncHook === 'undefined' && typeof require.ensure === 'undefined') {
    console.log("⚠️ [GA4] Firebase Analytics requires native modules - skipping in this environment");
    analytics = null;
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
      analytics = null;
      return false;
    }
    console.log("✅ [GA4] RNFBAppModule found");
  } catch (nativeCheckError) {
    // If we can't even check NativeModules, we're probably in Expo Go
    console.log("⚠️ [GA4] Cannot check native modules - Firebase Analytics unavailable:", nativeCheckError?.message);
    analytics = null;
    return false;
  }

  // Now try to require Firebase Analytics
  try {
    console.log("🔍 [GA4] Attempting to require @react-native-firebase/analytics...");
    const firebaseAnalytics = require("@react-native-firebase/analytics");
    
    if (!firebaseAnalytics || !firebaseAnalytics.default) {
      console.warn("⚠️ [GA4] Firebase Analytics module loaded but default export not available");
      analytics = null;
      return false;
    }

    analytics = firebaseAnalytics.default || firebaseAnalytics;
    console.log("✅ [GA4] Firebase Analytics module loaded");
    
    // Verify the analytics instance works
    const analyticsInstance = analytics();
    if (analyticsInstance && typeof analyticsInstance.logEvent === 'function') {
      console.log("✅ [GA4] Firebase Analytics initialized successfully");
      
      // Enable debug mode in development
      if (__DEV__) {
        try {
          analyticsInstance.setAnalyticsCollectionEnabled(true);
          console.log("✅ [GA4] Analytics collection enabled for debugging");
        } catch (e) {
          console.warn("⚠️ [GA4] Could not enable analytics collection:", e?.message);
        }
      }
      
      return true;
    } else {
      throw new Error("Firebase Analytics instance not properly initialized");
    }
  } catch (error) {
    // If require fails or module doesn't work, gracefully degrade
    console.warn("⚠️ [GA4] Firebase Analytics not available:", error?.message || error);
    console.warn("⚠️ [GA4] Full error:", error);
    analytics = null;
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
    if (MIXPANEL_TOKEN && !isMixpanelInit) {
      try {
        console.log("🔍 [Mixpanel] Starting initialization...");
        console.log("🔍 [Mixpanel] Token found:", MIXPANEL_TOKEN.substring(0, 12) + "...");
        
        // Initialize Mixpanel with token only
        // mixpanel-react-native v3.x constructor only takes the token
        mixpanel = new Mixpanel(MIXPANEL_TOKEN);
        
        // mixpanel-react-native v3.x auto-initializes on construction
        // No need to call init() separately
        console.log("🔍 [Mixpanel] Instance created, SDK should auto-initialize");
        
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
        
        isMixpanelInit = true;
        console.log("✅ [Mixpanel] Initialized successfully");
        console.log("📊 [Mixpanel] Token:", MIXPANEL_TOKEN.substring(0, 12) + "...");
        console.log("📊 [Mixpanel] Full token length:", MIXPANEL_TOKEN.length);
        
        // Send a test event immediately to verify connection
        try {
          console.log("🔍 [Mixpanel] Sending test event 'App Initialized'...");
          mixpanel.track("App Initialized", {
            platform: "react-native",
            timestamp: new Date().toISOString(),
          });
          console.log("✅ [Mixpanel] Test event sent successfully");
        } catch (testError) {
          console.error("❌ [Mixpanel] Failed to send test event:", testError?.message || testError);
        }
      } catch (error) {
        console.error("❌ [Mixpanel] Initialization failed:", error?.message || error);
        console.error("❌ [Mixpanel] Full error:", error);
        // Don't set isMixpanelInit to true if initialization failed
        mixpanel = null;
      }
    } else if (!MIXPANEL_TOKEN) {
      console.warn("⚠️ [Mixpanel] Token not configured!");
      console.warn("⚠️ [Mixpanel] Checked sources:");
      console.warn("   - process.env.EXPO_PUBLIC_MIXPANEL_TOKEN:", !!process.env.EXPO_PUBLIC_MIXPANEL_TOKEN);
      console.warn("   - Constants.expoConfig.extra.mixpanelToken:", !!Constants?.expoConfig?.extra?.mixpanelToken);
    } else {
      console.log("ℹ️ [Mixpanel] Already initialized, skipping");
    }

    // Try to initialize Firebase Analytics (will work after prebuild with config files)
    const firebaseInitResult = initFirebaseAnalytics();
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

    // GA4
    if (analytics) {
      await analytics().setUserId(userId);
      if (traits.email) {
        await analytics().setUserProperties({
          email: traits.email,
        });
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

    // GA4
    if (analytics) {
      await analytics().resetAnalyticsData();
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

    // GA4 (event name must be snake_case or lower case, max 40 chars)
    if (analytics) {
      const safeName = eventName
        .replace(/\s+/g, "_")
        .toLowerCase()
        .substring(0, 40);
      
      console.log(`📊 [GA4] Tracking event: ${safeName}`, properties);
      await analytics().logEvent(safeName, properties);
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

    // GA4
    if (analytics) {
      console.log(`📊 [GA4] Tracking screen view: ${screenName}`, properties);
      await analytics().logScreenView({
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
    firebaseInitialized: !!analytics,
    mixpanelInitialized: isMixpanelInit,
    currentUserId: currentUserId,
    canTrackEvents: !!analytics && typeof analytics === 'function',
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

