import {
  debugAnalytics,
  normalizeGA4EventName,
  sanitizeAnalyticsParams,
  warnAnalytics,
} from "./analytics.shared";

let analyticsInstance = null;
let ga4Status = "idle"; // idle | initializing | ready | failed

function getFirebaseAnalyticsModule() {
  try {
    return require("@react-native-firebase/analytics");
  } catch (_error) {
    return null;
  }
}

function canUseNativeModules() {
  try {
    const { NativeModules } = require("react-native");
    return !!NativeModules?.RNFBAppModule;
  } catch (_error) {
    return false;
  }
}

export function isGA4Ready() {
  return ga4Status === "ready" && !!analyticsInstance;
}

export function getGA4Status() {
  return ga4Status;
}

export async function initGA4() {
  if (isGA4Ready()) return true;
  if (ga4Status === "initializing") return false;

  ga4Status = "initializing";
  if (!canUseNativeModules()) {
    ga4Status = "failed";
    warnAnalytics("GA4 native module unavailable in this environment.");
    return false;
  }

  try {
    const { getApp } = require("@react-native-firebase/app");
    const firebaseAnalyticsModule = getFirebaseAnalyticsModule();
    if (!firebaseAnalyticsModule) {
      throw new Error("Firebase analytics module unavailable");
    }

    const { getAnalytics, setAnalyticsCollectionEnabled } = firebaseAnalyticsModule;
    const app = getApp();
    analyticsInstance = getAnalytics(app);
    if (!analyticsInstance || typeof analyticsInstance.logEvent !== "function") {
      throw new Error("Invalid GA4 analytics instance");
    }

    if (__DEV__) {
      try {
        await setAnalyticsCollectionEnabled(analyticsInstance, true);
      } catch (_error) {
        // Non-fatal for initialization
      }
    }

    ga4Status = "ready";
    debugAnalytics("GA4 initialized.");
    return true;
  } catch (error) {
    analyticsInstance = null;
    ga4Status = "failed";
    warnAnalytics("GA4 initialization failed:", error?.message || error);
    return false;
  }
}

export async function identifyGA4User(userId, traits = {}) {
  if (!isGA4Ready()) return;
  try {
    const firebaseAnalyticsModule = getFirebaseAnalyticsModule();
    if (!firebaseAnalyticsModule) return;
    const { setUserId, setUserProperties } = firebaseAnalyticsModule;
    await setUserId(analyticsInstance, userId);
    if (traits.email) {
      await setUserProperties(analyticsInstance, { email: traits.email });
    }
  } catch (error) {
    warnAnalytics("GA4 identify failed:", error?.message || error);
  }
}

export async function resetGA4User() {
  if (!isGA4Ready()) return;
  try {
    const firebaseAnalyticsModule = getFirebaseAnalyticsModule();
    if (!firebaseAnalyticsModule) return;
    const { resetAnalyticsData } = firebaseAnalyticsModule;
    await resetAnalyticsData(analyticsInstance);
  } catch (error) {
    warnAnalytics("GA4 reset failed:", error?.message || error);
  }
}

export async function trackGA4(eventName, properties = {}) {
  if (!isGA4Ready()) return;
  try {
    const firebaseAnalyticsModule = getFirebaseAnalyticsModule();
    if (!firebaseAnalyticsModule) return;
    const { logEvent } = firebaseAnalyticsModule;
    await logEvent(
      analyticsInstance,
      normalizeGA4EventName(eventName),
      sanitizeAnalyticsParams(properties)
    );
  } catch (error) {
    warnAnalytics("GA4 track failed:", error?.message || error);
  }
}
