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
let currentSessionId = null;
let currentSessionStartedAtMs = 0;
let activeScreenName = null;
let activeScreenStartedAtMs = 0;

function buildSessionId() {
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

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
      screen_name: String(screenName || "unknown").slice(0, 100),
      ...sanitized,
    });
  } catch (error) {
    warnAnalytics("trackScreenView error:", error?.message || error);
  }
}

export async function startAnalyticsSession(properties = {}) {
  try {
    if (currentSessionId && currentSessionStartedAtMs > 0) return currentSessionId;
    currentSessionId = buildSessionId();
    currentSessionStartedAtMs = Date.now();
    await track(AnalyticsEvents.SESSION_START, {
      session_id: currentSessionId,
      ...sanitizeAnalyticsParams(properties),
    });
    return currentSessionId;
  } catch (error) {
    warnAnalytics("startAnalyticsSession error:", error?.message || error);
    return null;
  }
}

export async function flushActiveScreenTime(reason = "switch") {
  try {
    if (!activeScreenName || !activeScreenStartedAtMs) return;
    const durationSeconds = Math.max(
      0,
      Math.round((Date.now() - activeScreenStartedAtMs) / 1000)
    );
    await track(AnalyticsEvents.SCREEN_TIME_SPENT, {
      screen_name: activeScreenName,
      duration_seconds: durationSeconds,
      session_id: currentSessionId || undefined,
      reason,
    });
  } catch (error) {
    warnAnalytics("flushActiveScreenTime error:", error?.message || error);
  } finally {
    activeScreenName = null;
    activeScreenStartedAtMs = 0;
  }
}

export async function setAnalyticsScreen(screenName, properties = {}) {
  const nextName = String(screenName || "unknown").slice(0, 100);
  if (!nextName) return;
  try {
    if (!currentSessionId) {
      await startAnalyticsSession({ source: "screen_change" });
    }
    if (activeScreenName && activeScreenName !== nextName) {
      await flushActiveScreenTime("screen_change");
    }
    await trackScreenView(nextName, {
      session_id: currentSessionId || undefined,
      ...sanitizeAnalyticsParams(properties),
    });
    activeScreenName = nextName;
    activeScreenStartedAtMs = Date.now();
  } catch (error) {
    warnAnalytics("setAnalyticsScreen error:", error?.message || error);
  }
}

export async function endAnalyticsSession(reason = "background") {
  try {
    if (!currentSessionId || !currentSessionStartedAtMs) return;
    await flushActiveScreenTime(reason);
    const durationSeconds = Math.max(
      0,
      Math.round((Date.now() - currentSessionStartedAtMs) / 1000)
    );
    await track(AnalyticsEvents.SESSION_END, {
      session_id: currentSessionId,
      duration_seconds: durationSeconds,
      reason,
    });
  } catch (error) {
    warnAnalytics("endAnalyticsSession error:", error?.message || error);
  } finally {
    currentSessionId = null;
    currentSessionStartedAtMs = 0;
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
  SESSION_START: "Session Start",
  SESSION_END: "Session End",
  SCREEN_TIME_SPENT: "Screen Time Spent",
  USER_SIGNED_UP: "User Signed Up",
  REFERRAL_PROCESSING_FAILED: "Referral Processing Failed",
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
  OPPORTUNITY_SUBMITTED: "Opportunity Submitted",
  DM_SENT: "DM Sent",
  CONNECTION_REQUESTED: "Connection Requested",
  CONNECTION_ACCEPTED: "Connection Accepted",
  MIX_UPLOADED: "Mix Uploaded",
  MIX_PLAYED: "Mix Played",
  HELP_CHAT_MESSAGE: "Help Chat Message",
  PRODUCT_FEEDBACK_SUBMITTED: "Product Feedback Submitted",
  LOCATION_FETCHED: "Location Fetched",
  LOCATION_MISMATCH: "Location Mismatch",
};

