import { Mixpanel } from "mixpanel-react-native";
import Constants from "expo-constants";
import { supabase } from "./supabase";

// Firebase Analytics - conditionally import to avoid errors before prebuild
let analytics = null;
try {
  const firebaseAnalytics = require("@react-native-firebase/analytics");
  analytics = firebaseAnalytics.default || firebaseAnalytics;
} catch (error) {
  // Firebase not available until after prebuild with config files
  analytics = null;
}

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
 * Initialize analytics (Firebase GA4 and Mixpanel)
 * Should be called once when app starts
 */
export async function initAnalytics() {
  try {
    // Initialize Mixpanel if token is available
    if (MIXPANEL_TOKEN && !isMixpanelInit) {
      try {
        mixpanel = new Mixpanel(MIXPANEL_TOKEN);
        await mixpanel.init();
        isMixpanelInit = true;
        console.log("✅ Mixpanel initialized");
      } catch (error) {
        console.warn("⚠️ Mixpanel initialization failed:", error?.message || error);
      }
    } else if (!MIXPANEL_TOKEN) {
      console.log("⚠️ Mixpanel token not configured, skipping Mixpanel");
    }

    // Firebase Analytics is automatically initialized (if available)
    if (analytics) {
      console.log("✅ Firebase Analytics ready");
    } else {
      console.log("⚠️ Firebase Analytics not available - add Firebase config files and run 'npx expo prebuild'");
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
      mixpanel.track(eventName, properties);
    }

    // GA4 (event name must be snake_case or lower case, max 40 chars)
    if (analytics) {
      const safeName = eventName
        .replace(/\s+/g, "_")
        .toLowerCase()
        .substring(0, 40);
      
      await analytics().logEvent(safeName, properties);
    }
  } catch (error) {
    console.warn("⚠️ track error:", error?.message || error);
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
      await analytics().logScreenView({
        screen_name: screenName,
        screen_class: screenName,
        ...properties,
      });
    }
  } catch (error) {
    console.warn("⚠️ trackScreenView error:", error?.message || error);
  }
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

