import { supabase } from "./supabase";
import {
  getGA4Status,
  identifyGA4User,
  initGA4,
  isGA4Ready,
  resetGA4User,
  trackGA4,
} from "./analytics.firebase";
import {
  getMixpanelStatus,
  identifyMixpanelUser,
  initMixpanel,
  isMixpanelReady,
  resetMixpanelUser,
  trackMixpanel,
} from "./analytics.mixpanel";
import { sanitizeAnalyticsParams, warnAnalytics } from "./analytics.shared";

let currentUserId = null;

/**
 * Initialize Firebase Analytics (called after Firebase is properly set up)
 * This will only work in development/production builds with native code, not in Expo Go
 */
export async function initFirebaseAnalytics() {
  return await initGA4();
}

/**
 * Initialize analytics (Mixpanel and optionally Firebase GA4)
 * Should be called once when app starts
 */
export async function initAnalytics() {
  try {
    await Promise.all([initMixpanel(), initGA4()]);

    // Try to hydrate user identity from Supabase
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        warnAnalytics("Supabase getUser error:", error.message);
        return;
      }

      if (user) {
        await setAnalyticsUser(user.id, {
          email: user.email,
        });
      }
    } catch (error) {
      warnAnalytics("Error hydrating analytics user:", error?.message || error);
    }
  } catch (error) {
    warnAnalytics("initAnalytics error:", error?.message || error);
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
    if (isMixpanelReady()) {
      identifyMixpanelUser(userId, traits);
    }

    // GA4 (modular API)
    if (isGA4Ready()) {
      await identifyGA4User(userId, traits);
    }
  } catch (error) {
    warnAnalytics("setAnalyticsUser error:", error?.message || error);
  }
}

/**
 * Reset user identity (for logout)
 */
export async function resetAnalyticsUser() {
  try {
    currentUserId = null;

    // Mixpanel
    if (isMixpanelReady()) {
      resetMixpanelUser();
    }

    // GA4 (modular API)
    if (isGA4Ready()) {
      await resetGA4User();
    }
  } catch (error) {
    warnAnalytics("resetAnalyticsUser error:", error?.message || error);
  }
}

/**
 * Generic track() that hits both tools
 * @param {string} eventName - Event name
 * @param {object} properties - Event properties
 */
export async function track(eventName, properties = {}) {
  try {
    const sanitized = sanitizeAnalyticsParams(properties);
    trackMixpanel(eventName, sanitized);
    await trackGA4(eventName, sanitized);
  } catch (error) {
    warnAnalytics("track error:", error?.message || error);
  }
}

/**
 * Track screen view
 * @param {string} screenName - Screen name
 * @param {object} properties - Additional properties
 */
export async function trackScreenView(screenName, properties = {}) {
  try {
    const sanitized = sanitizeAnalyticsParams(properties);
    trackMixpanel("Screen Viewed", {
      screen_name: String(screenName || "unknown").slice(0, 100),
      ...sanitized,
    });
    await trackGA4("screen_view", {
      firebase_screen: String(screenName || "unknown").slice(0, 100),
      firebase_screen_class: String(screenName || "unknown").slice(0, 100),
      ...sanitized,
    });
  } catch (error) {
    warnAnalytics("trackScreenView error:", error?.message || error);
  }
}

/**
 * Debug function to check Firebase Analytics status
 * Call this from your app to see if Firebase is working
 */
export function getAnalyticsStatus() {
  return {
    firebaseInitialized: isGA4Ready(),
    mixpanelInitialized: isMixpanelReady(),
    firebaseStatus: getGA4Status(),
    mixpanelStatus: getMixpanelStatus(),
    currentUserId,
    canTrackMixpanel: isMixpanelReady(),
    canTrackGA4: isGA4Ready(),
    canTrackEvents: isMixpanelReady() || isGA4Ready(),
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

